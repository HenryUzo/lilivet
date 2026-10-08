import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import { normalizePhoneNumber } from "../utils/phone";
import type { SimplifiedAppointmentInput } from "../validators/appointmentBookingSchemas";
import { findDuplicateAppointmentCandidate } from "./duplicateService";
import { queueAppointmentSms } from "./appointmentSmsService";
import { attributionData } from "../validators/attributionSchemas";

export const APPOINTMENT_TIMEZONE = "America/Chicago";
export const APPOINTMENT_MAX_DAYS_AHEAD = 60;

export async function getAppointmentBookingSetting() {
  return prisma.appointmentBookingSetting.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {}
  });
}

export async function updateAppointmentBookingSetting(mode: "STANDARD" | "SIMPLIFIED", staffUserId: string) {
  return prisma.appointmentBookingSetting.upsert({
    where: { id: "global" },
    create: { id: "global", mode, updatedByStaffUserId: staffUserId },
    update: { mode, updatedByStaffUserId: staffUserId }
  });
}

function zonedDateTimeToUtc(dateKey: string, time: string) {
  const guess = new Date(`${dateKey}T${time}:00.000Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APPOINTMENT_TIMEZONE,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(guess).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return new Date(guess.getTime() - (represented - guess.getTime()));
}

export function validateRequestedSlot(dateKey: string, time: string, now = new Date()) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    throw new HttpError(400, "Choose a valid appointment date.");
  }
  const weekday = calendarDate.getUTCDay();
  if (weekday === 0) throw new HttpError(400, "The clinic is closed on Sundays.");
  const [hour, minute] = time.split(":").map(Number);
  if (![0, 30].includes(minute)) throw new HttpError(400, "Appointment times must use 30-minute increments.");
  const totalMinutes = hour * 60 + minute;
  const closingMinutes = weekday === 6 ? 17 * 60 : 19 * 60;
  if (totalMinutes < 8 * 60 || totalMinutes + 30 > closingMinutes) {
    throw new HttpError(400, "Choose a time during clinic hours.");
  }
  const startsAt = zonedDateTimeToUtc(dateKey, time);
  const latest = new Date(now.getTime() + APPOINTMENT_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  if (startsAt <= now) throw new HttpError(400, "Choose a future appointment time.");
  if (startsAt > latest) throw new HttpError(400, "Appointments may only be requested up to 60 days ahead.");
  return startsAt;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts.shift()!, lastName: parts.join(" ") || "Not provided" };
}

export async function submitSimplifiedAppointment(input: SimplifiedAppointmentInput) {
  const setting = await getAppointmentBookingSetting();
  if (setting.mode !== "SIMPLIFIED") throw new HttpError(409, "Simplified booking is not currently active.");
  const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
  if (!/^1\d{10}$/.test(normalizedPhone)) throw new HttpError(400, "Enter a valid U.S. phone number.");
  const selections = input.preferredSelections?.length
    ? input.preferredSelections
    : [{ date: input.preferredDate, time: input.preferredTime }];
  const validatedSelections = selections.map((selection) => ({
    ...selection,
    startsAt: validateRequestedSlot(selection.date, selection.time)
  }));
  const firstSelection = validatedSelections[0];
  const selectionsByDate = Array.from(
    selections.reduce((grouped, selection) => {
      grouped.set(selection.date, [...(grouped.get(selection.date) ?? []), selection.time]);
      return grouped;
    }, new Map<string, string[]>())
  ).map(([date, timeSlots]) => ({ date, timeSlots }));
  const duplicate = await findDuplicateAppointmentCandidate({ phoneNumber: normalizedPhone, email: input.email || undefined, petName: input.petName });
  const name = splitFullName(input.clientFullName);

  const request = await prisma.$transaction(async (tx) => {
    let owner = await tx.owner.findFirst({ where: { normalizedPhone }, orderBy: { createdAt: "asc" } });
    if (!owner) {
      owner = await tx.owner.create({ data: { ...name, email: input.email || undefined, phoneNumber: input.phoneNumber, normalizedPhone, preferredContactMethod: "TEXT" } });
    } else if (!owner.email && input.email) {
      owner = await tx.owner.update({ where: { id: owner.id }, data: { email: input.email } });
    }
    let pet = await tx.pet.findFirst({ where: { ownerId: owner.id, species: input.petType, name: { equals: input.petName, mode: "insensitive" } } });
    if (!pet) {
      pet = await tx.pet.create({ data: { ownerId: owner.id, name: input.petName, species: input.petType, sex: "UNKNOWN" } });
    }
    return tx.appointmentRequest.create({
      data: {
        ownerId: owner.id,
        petId: pet.id,
        visitType: "OTHER",
        bookingSource: "SIMPLIFIED",
        preferredSelections: selectionsByDate as Prisma.InputJsonValue,
        timezone: APPOINTMENT_TIMEZONE,
        symptomsOrConcerns: input.reasonForVisit,
        possibleDuplicate: Boolean(duplicate),
        duplicateOfId: duplicate?.id,
        ...attributionData(input.attribution),
        preferredDateSelections: { create: selectionsByDate.map((selection) => ({ dateKey: selection.date })) }
      },
      include: { owner: true, pet: true, smsDeliveries: true }
    });
  });

  void queueAppointmentSms({
    appointmentRequestId: request.id,
    phoneNumber: request.owner.phoneNumber,
    petName: request.pet.name,
    startsAt: firstSelection.startsAt,
    timezone: APPOINTMENT_TIMEZONE,
    kind: "REQUEST_RECEIVED"
  }).catch((error) => console.error("Appointment request SMS failed", { requestId: request.id, error }));

  return {
    id: request.id,
    status: request.status,
    requestedDate: firstSelection.date,
    requestedTime: firstSelection.time,
    requestedSelections: selections,
    timezone: APPOINTMENT_TIMEZONE
  };
}
