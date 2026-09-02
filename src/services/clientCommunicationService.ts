import { ClientDataSource, ClientStatus, MarketingChannel, MarketingConsentAction, MarketingConsentStatus, OwnerContactChannel, PetSex, PetSpecies, Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { prisma } from "../prisma/client";
import { normalizePhoneNumber } from "../utils/phone";

type ConsentInput = {
  emailOptIn: boolean;
  smsOptIn: boolean;
  source: string;
};

export async function recordMarketingConsent(
  tx: Prisma.TransactionClient,
  ownerId: string,
  input: ConsentInput
) {
  const profile = await tx.clientProfile.upsert({
    where: { ownerId },
    create: { ownerId },
    update: {}
  });

  const updates: Prisma.ClientProfileUpdateInput = {};
  const consentRows: Prisma.ClientCommunicationConsentCreateManyInput[] = [];
  const now = new Date();

  if (input.emailOptIn && profile.emailMarketingStatus !== MarketingConsentStatus.SUBSCRIBED) {
    updates.emailMarketingStatus = MarketingConsentStatus.SUBSCRIBED;
    updates.emailConsentAt = now;
    updates.emailConsentSource = input.source;
    consentRows.push({ clientProfileId: profile.id, channel: MarketingChannel.EMAIL, action: MarketingConsentAction.OPTED_IN, source: input.source, policyVersion: "marketing-v1" });
  }
  if (input.smsOptIn && profile.smsMarketingStatus !== MarketingConsentStatus.SUBSCRIBED) {
    updates.smsMarketingStatus = MarketingConsentStatus.SUBSCRIBED;
    updates.smsConsentAt = now;
    updates.smsConsentSource = input.source;
    consentRows.push({ clientProfileId: profile.id, channel: MarketingChannel.SMS, action: MarketingConsentAction.OPTED_IN, source: input.source, policyVersion: "marketing-v1" });
  }

  if (Object.keys(updates).length) await tx.clientProfile.update({ where: { id: profile.id }, data: updates });
  if (consentRows.length) await tx.clientCommunicationConsent.createMany({ data: consentRows });
}

export async function listClients(input: { search?: string; consent?: "EMAIL" | "SMS" | "NONE"; limit: number; cursor?: string }) {
  const filters: Prisma.OwnerWhereInput[] = [];

  if (input.search) {
    filters.push({ OR: [
      { firstName: { contains: input.search, mode: "insensitive" } },
      { lastName: { contains: input.search, mode: "insensitive" } },
      { email: { contains: input.search, mode: "insensitive" } },
      { phoneNumber: { contains: input.search, mode: "insensitive" } },
      { pets: { some: { name: { contains: input.search, mode: "insensitive" } } } }
    ] });
  }

  if (input.consent === "EMAIL") filters.push({ clientProfile: { is: { emailMarketingStatus: MarketingConsentStatus.SUBSCRIBED } } });
  if (input.consent === "SMS") filters.push({ clientProfile: { is: { smsMarketingStatus: MarketingConsentStatus.SUBSCRIBED } } });
  if (input.consent === "NONE") filters.push({ OR: [
    { clientProfile: { is: null } },
    { clientProfile: { is: { emailMarketingStatus: { not: MarketingConsentStatus.SUBSCRIBED }, smsMarketingStatus: { not: MarketingConsentStatus.SUBSCRIBED } } } }
  ] });

  const where: Prisma.OwnerWhereInput = filters.length ? { AND: filters } : {};

  const rows = await prisma.owner.findMany({
    where,
    take: input.limit + 1,
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { pets: { select: { id: true, name: true, species: true } }, clientProfile: true, clientLifecycleRecords: { orderBy: { updatedAt: "desc" } } }
  });
  const hasMore = rows.length > input.limit;
  const data = hasMore ? rows.slice(0, input.limit) : rows;
  return { data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null };
}

const clientDetailInclude = {
  pets: { select: { id: true, name: true, species: true, breed: true, sex: true, age: true, spayedNeutered: true } },
  clientProfile: true,
  contactMethods: { orderBy: [{ channel: "asc" as const }, { label: "asc" as const }] },
  externalClientRecords: { orderBy: { updatedAt: "desc" as const } },
  clientLifecycleRecords: {
    orderBy: { updatedAt: "desc" as const },
    include: { pet: { select: { id: true, name: true, species: true } } }
  }
};

export async function getClientDetail(ownerId: string) {
  return prisma.owner.findUnique({ where: { id: ownerId }, include: clientDetailInclude });
}

export async function listClientImportHistory() {
  return prisma.clientImportRun.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { initiatedBy: { select: { email: true } } }
  });
}

export async function updateClientLifecycleRecord(ownerId: string, lifecycleId: string, input: Prisma.ClientLifecycleRecordUpdateInput) {
  const lifecycle = await prisma.clientLifecycleRecord.findFirst({
    where: { id: lifecycleId, ownerId },
    select: { id: true }
  });
  if (!lifecycle) return null;

  return prisma.clientLifecycleRecord.update({
    where: { id: lifecycle.id },
    data: input,
    include: { pet: { select: { id: true, name: true, species: true } } }
  });
}

const importHeaders = ["Client Name", "Email", "Pet's Name", "Phone", "New Client Date", "Lead Source", "Referred By", "Regular Veterinarian", "First Visit Type", "Doctor Seen", "Recheck Recommended?", "Recheck Scheduled?", "Recheck Date", "Recheck Completed?", "Follow-Up Needed?", "First Visit Revenue", "Additional Services Revenue", "Total Spent", "Wellness Plan", "Client Status", "Last Visit", "Next Appointment", "Notes"] as const;

function parseCsv(content: string) {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < content.length; index += 1) { const char = content[index]; const next = content[index + 1]; if (char === '"' && quoted && next === '"') { value += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { row.push(value.trim()); value = ""; } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') index += 1; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ""; } else value += char; }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
const yes = (value: string | undefined) => /^(yes|true|1|y)$/i.test(value?.trim() ?? "");
const money = (value: string | undefined) => { const parsed = Number((value ?? "").replace(/[$,]/g, "")); return Number.isFinite(parsed) && parsed >= 0 ? parsed : null; };
const date = (value: string | undefined) => { if (!value?.trim()) return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; };
const text = (value: string | undefined) => value?.trim() || null;
const suppliedBoolean = (value: string | undefined) => /^(yes|true|1|y)$/i.test(value?.trim() ?? "") ? true : /^(no|false|0|n)$/i.test(value?.trim() ?? "") ? false : undefined;
const species = (value: string | undefined) => /cat|feline/i.test(value ?? "") ? PetSpecies.CAT : /dog|canine/i.test(value ?? "") ? PetSpecies.DOG : PetSpecies.UNKNOWN;
const sex = (value: string | undefined) => /female/i.test(value ?? "") ? PetSex.FEMALE : /male/i.test(value ?? "") ? PetSex.MALE : PetSex.UNKNOWN;

async function readTrackerRows(file: Express.Multer.File) {
  if (file.originalname.toLowerCase().endsWith(".csv")) return parseCsv(file.buffer.toString("utf8").replace(/^\uFEFF/, ""));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.getWorksheet("New Client Tracker") ?? workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // Cell text preserves hyperlink labels (for example, email addresses) and formula results.
    const cells = Array.from({ length: row.cellCount }, (_, index) => row.getCell(index + 1).text.trim());
    if (cells.some(Boolean)) rows.push(cells);
  });
  return rows;
}

export async function importClientTrackerCsv(file: Express.Multer.File, initiatedByStaffUserId: string) {
  const rows = await readTrackerRows(file);
  if (!rows.length) throw new Error("The CSV file is empty");
  const headers = rows[0]; const missing = importHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing tracker columns: ${missing.join(", ")}`);
  const result = { imported: 0, updated: 0, skipped: [] as Array<{ row: number; reason: string }> };
  for (const [offset, values] of rows.slice(1).entries()) {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])); const rowNumber = offset + 2;
    const fullName = row["Client Name"]?.trim(); const petName = row["Pet's Name"]?.trim(); const phone = row["Mobile Number"]?.trim() || row.Phone?.trim() || row["Home Number"]?.trim();
    if (!fullName || !petName || !phone) { result.skipped.push({ row: rowNumber, reason: "Client Name, Pet's Name, and Phone are required" }); continue; }
    const [firstName, ...lastName] = fullName.split(/\s+/); const normalizedPhone = normalizePhoneNumber(phone);
    try {
      const existed = await prisma.$transaction(async (tx) => {
        const email = text(row.Email); const isWeave = /^weave$/i.test(row["Lead Source"] || "") || Boolean(text(row["Weave Contact ID"]) || text(row["Weave Pet ID"])); const ownerMatches: Prisma.OwnerWhereInput[] = [];
        if (normalizedPhone) ownerMatches.push({ normalizedPhone }); if (email) ownerMatches.push({ email });
        const owner = ownerMatches.length ? await tx.owner.findFirst({ where: { OR: ownerMatches } }) : null;
        const address = text(row.Address) || text(row["Address Line 1"]);
        const savedOwner = owner ? await tx.owner.update({ where: { id: owner.id }, data: { email: owner.email || email || undefined, addressLine1: owner.addressLine1 || address || undefined, addressLine2: owner.addressLine2 || text(row["Address Line 2"]) || undefined, city: owner.city || text(row.City) || undefined, state: owner.state || text(row.State) || undefined, postalCode: owner.postalCode || text(row["Postal Code"]) || undefined } }) : await tx.owner.create({ data: { firstName, lastName: lastName.join(" ") || "Client", email: email || undefined, phoneNumber: phone, normalizedPhone: normalizedPhone || undefined, addressLine1: address || undefined, addressLine2: text(row["Address Line 2"]) || undefined, city: text(row.City) || undefined, state: text(row.State) || undefined, postalCode: text(row["Postal Code"]) || undefined } });
        const existingPet = await tx.pet.findFirst({ where: { ownerId: savedOwner.id, name: { equals: petName, mode: "insensitive" } } });
        const pet = existingPet ? await tx.pet.update({ where: { id: existingPet.id }, data: { species: existingPet.species === PetSpecies.UNKNOWN && species(row.Species) !== PetSpecies.UNKNOWN ? species(row.Species) : undefined, breed: existingPet.breed || text(row.Breed) || undefined, sex: existingPet.sex === PetSex.UNKNOWN && sex(row.Sex) !== PetSex.UNKNOWN ? sex(row.Sex) : undefined, age: existingPet.age || text(row.Age) || undefined, spayedNeutered: existingPet.spayedNeutered ?? (row["Spayed/Neutered"] ? /spayed|neutered/i.test(row["Spayed/Neutered"]) : undefined) } }) : await tx.pet.create({ data: { ownerId: savedOwner.id, name: petName, species: species(row.Species), breed: text(row.Breed) || undefined, sex: sex(row.Sex), age: text(row.Age) || undefined, spayedNeutered: row["Spayed/Neutered"] ? /spayed|neutered/i.test(row["Spayed/Neutered"]) : undefined } });
        if (isWeave) {
          for (const [value, label, channel] of [[row["Home Number"], "Home", OwnerContactChannel.PHONE], [row["Mobile Number"] || row.Phone, "Mobile", OwnerContactChannel.PHONE], [row.Email, "Email", OwnerContactChannel.EMAIL]] as const) if (text(value)) await tx.ownerContactMethod.upsert({ where: { ownerId_channel_value: { ownerId: savedOwner.id, channel, value: text(value)! } }, create: { ownerId: savedOwner.id, channel, value: text(value)!, label, isPrimary: label === "Mobile", source: ClientDataSource.WEAVE }, update: { label, source: ClientDataSource.WEAVE } });
          const contactId = text(row["Weave Contact ID"]); const externalPetId = text(row["Weave Pet ID"]); const contactKey = contactId || `missing-contact:${email || normalizedPhone || fullName}`; const petKey = externalPetId || `missing-pet:${petName.toLowerCase()}`;
          if (contactId || externalPetId) await tx.externalClientRecord.upsert({ where: { source_externalContactId_externalPetId: { source: ClientDataSource.WEAVE, externalContactId: contactKey, externalPetId: petKey } }, create: { ownerId: savedOwner.id, petId: pet.id, source: ClientDataSource.WEAVE, externalContactId: contactKey, externalPetId: petKey, contactStatus: text(row["Weave Contact Status"]) || text(row["Client Status"]) }, update: { ownerId: savedOwner.id, petId: pet.id, contactStatus: text(row["Weave Contact Status"]) || text(row["Client Status"]), lastSyncedAt: new Date() } });
        }
        const status = (row["Client Status"] || "ACTIVE").trim().toUpperCase();
        const lifecycleUpdate = { leadSource: text(row["Lead Source"]) || undefined, referredBy: text(row["Referred By"]) || undefined, regularVeterinarian: text(row["Regular Veterinarian"]) || undefined, firstVisitType: text(row["First Visit Type"]) || undefined, doctorSeen: text(row["Doctor Seen"]) || undefined, recheckRecommended: suppliedBoolean(row["Recheck Recommended?"]), recheckScheduled: suppliedBoolean(row["Recheck Scheduled?"]), recheckDate: date(row["Recheck Date"]) || undefined, recheckCompleted: suppliedBoolean(row["Recheck Completed?"]), followUpNeeded: suppliedBoolean(row["Follow-Up Needed?"]), firstVisitRevenue: money(row["First Visit Revenue"]) ?? undefined, additionalServicesRevenue: money(row["Additional Services Revenue"]) ?? undefined, wellnessPlan: text(row["Wellness Plan"]) || undefined, clientStatus: isWeave ? undefined : Object.values(ClientStatus).includes(status as ClientStatus) ? status as ClientStatus : undefined, lastVisitAt: date(row["Last Visit"]) || undefined, nextAppointmentAt: date(row["Next Appointment"]) || undefined, notes: text(row.Notes) || undefined };
        await tx.clientLifecycleRecord.upsert({ where: { ownerId_petId: { ownerId: savedOwner.id, petId: pet.id } }, create: { ownerId: savedOwner.id, petId: pet.id, newClientDate: date(row["New Client Date"]) || new Date(), leadSource: text(row["Lead Source"]), referredBy: text(row["Referred By"]), regularVeterinarian: text(row["Regular Veterinarian"]), firstVisitType: text(row["First Visit Type"]), doctorSeen: text(row["Doctor Seen"]), recheckRecommended: yes(row["Recheck Recommended?"]), recheckScheduled: yes(row["Recheck Scheduled?"]), recheckDate: date(row["Recheck Date"]), recheckCompleted: yes(row["Recheck Completed?"]), followUpNeeded: yes(row["Follow-Up Needed?"]), firstVisitRevenue: money(row["First Visit Revenue"]), additionalServicesRevenue: money(row["Additional Services Revenue"]), wellnessPlan: text(row["Wellness Plan"]), clientStatus: isWeave ? ClientStatus.ACTIVE : Object.values(ClientStatus).includes(status as ClientStatus) ? status as ClientStatus : ClientStatus.ACTIVE, lastVisitAt: date(row["Last Visit"]), nextAppointmentAt: date(row["Next Appointment"]), notes: text(row.Notes) }, update: lifecycleUpdate });
        return Boolean(owner);
      });
      existed ? result.updated += 1 : result.imported += 1;
    } catch { result.skipped.push({ row: rowNumber, reason: "Could not import this row" }); }
  }
  const importRun = await prisma.clientImportRun.create({
    data: {
      initiatedByStaffUserId,
      originalFileName: file.originalname,
      totalRows: rows.length - 1,
      importedCount: result.imported,
      updatedCount: result.updated,
      skippedCount: result.skipped.length,
      skippedRows: result.skipped.length ? result.skipped.slice(0, 200) : undefined
    }
  });
  return { ...result, id: importRun.id };
}
