import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateAppointmentStatusSchema } from "../src/validators/appointmentRequestSchemas";

const {
  findManyMock,
  findUniqueMock,
  updateMock,
  updateManyMock,
  createOrUpdateCalendarEventMock,
  deleteCalendarEventMock
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  updateManyMock: vi.fn(),
  createOrUpdateCalendarEventMock: vi.fn(),
  deleteCalendarEventMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    appointmentRequest: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      update: updateMock,
      updateMany: updateManyMock
    }
  }
}));

vi.mock("../src/services/googleCalendarService", () => ({
  createOrUpdateCalendarEvent: createOrUpdateCalendarEventMock,
  deleteCalendarEvent: deleteCalendarEventMock,
  getCalendarSyncErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
  getCalendarSyncUpdate: ({ status, calendarEventId, calendarEventUrl, error }: any) => {
    if (error) {
      return {
        calendarSyncStatus: "FAILED",
        calendarSyncError: error,
        calendarSyncedAt: null
      };
    }

    if (status === "CANCELLED") {
      return {
        calendarEventId: null,
        calendarEventUrl: null,
        calendarSyncStatus: "NOT_SYNCED",
        calendarSyncError: null,
        calendarSyncedAt: expect.any(Date)
      };
    }

    return {
      calendarEventId: calendarEventId ?? null,
      calendarEventUrl: calendarEventUrl ?? null,
      calendarSyncStatus: "SYNCED",
      calendarSyncError: null,
      calendarSyncedAt: expect.any(Date)
    };
  }
}));

import {
  listAppointmentRequests,
  markOverdueAppointments,
  retryAppointmentCalendarSync,
  updateAppointmentRequestStatus
} from "../src/services/appointmentRequestService";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    status: "PENDING_REVIEW",
    visitType: "WELLNESS_EXAM",
    timezone: "America/Chicago",
    preferredSelections: [],
    possibleDuplicate: false,
    duplicateOfId: null,
    symptomsOrConcerns: null,
    currentMedications: null,
    previousVeterinarian: null,
    symptomDuration: null,
    confirmedStartAt: null,
    confirmedEndAt: null,
    confirmedTimezone: null,
    confirmedByStaffUserId: null,
    calendarEventId: null,
    calendarEventUrl: null,
    calendarSyncStatus: "NOT_SYNCED",
    calendarSyncedAt: null,
    calendarSyncError: null,
    owner: {
      id: "owner-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phoneNumber: "2105550100",
      preferredContactMethod: "EMAIL"
    },
    pet: {
      id: "pet-1",
      name: "Milo",
      species: "DOG",
      breed: "Retriever",
      age: "3 years",
      approximateAgeYears: 3,
      sex: "MALE",
      weightLbs: "40.00",
      currentMedications: null,
      existingConditions: null
    },
    files: [],
    draft: null,
    replacementAppointmentRequest: null,
    createdAt: new Date("2026-05-13T08:00:00.000Z"),
    updatedAt: new Date("2026-05-13T08:00:00.000Z"),
    ...overrides
  };
}

describe("appointment request status validation", () => {
  it("rejects confirmed status updates without a confirmed slot", () => {
    const result = updateAppointmentStatusSchema.safeParse({
      status: "CONFIRMED"
    });

    expect(result.success).toBe(false);
  });
});

describe("listAppointmentRequests", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findUniqueMock.mockReset();
    updateMock.mockReset();
    updateManyMock.mockReset();
    createOrUpdateCalendarEventMock.mockReset();
    deleteCalendarEventMock.mockReset();
  });

  it("uses DB date-key filtering and keeps standard keyset pagination when date filters are present", async () => {
    findManyMock.mockResolvedValue([
      { id: "req-3", owner: {}, pet: {}, files: [] },
      { id: "req-2", owner: {}, pet: {}, files: [] },
      { id: "req-1", owner: {}, pet: {}, files: [] }
    ]);

    const result = await listAppointmentRequests({
      limit: 2,
      cursor: "cursor-1",
      dateFrom: "2026-05-10T23:30:00-05:00",
      dateTo: "2026-05-12T01:00:00+02:00",
      search: "milo"
    });

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
      take: 3,
      skip: 1,
      cursor: { id: "cursor-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      where: expect.objectContaining({
        preferredDateSelections: {
          some: {
            dateKey: {
              gte: "2026-05-10",
              lte: "2026-05-12"
            }
          }
        }
      })
    }));

    expect(result).toEqual({
      data: [
        { id: "req-3", owner: {}, pet: {}, files: [] },
        { id: "req-2", owner: {}, pet: {}, files: [] }
      ],
      nextCursor: "req-2"
    });
  });

  it("marks confirmed appointments overdue after their end time passes", async () => {
    updateManyMock.mockResolvedValue({ count: 3 });

    const count = await markOverdueAppointments(new Date("2026-05-20T12:00:00.000Z"));

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        status: "CONFIRMED",
        confirmedEndAt: { lt: new Date("2026-05-20T12:00:00.000Z") }
      },
      data: {
        status: "OVERDUE"
      }
    });
    expect(count).toBe(3);
  });

  it("confirms an appointment, stores the slot, and syncs a calendar event", async () => {
    const initial = makeRequest();
    const afterStatusUpdate = makeRequest({
      status: "CONFIRMED",
      confirmedStartAt: new Date("2026-05-14T15:00:00.000Z"),
      confirmedEndAt: new Date("2026-05-14T15:30:00.000Z"),
      confirmedTimezone: "America/Chicago",
      confirmedByStaffUserId: "staff-1"
    });
    const finalRecord = makeRequest({
      ...afterStatusUpdate,
      calendarEventId: "event-123",
      calendarEventUrl: "https://calendar.google.com/event?eid=123",
      calendarSyncStatus: "SYNCED",
      calendarSyncedAt: new Date("2026-05-13T08:05:00.000Z")
    });

    findUniqueMock.mockResolvedValueOnce(initial);
    updateMock
      .mockResolvedValueOnce(afterStatusUpdate)
      .mockResolvedValueOnce(finalRecord);
    createOrUpdateCalendarEventMock.mockResolvedValue({
      calendarEventId: "event-123",
      calendarEventUrl: "https://calendar.google.com/event?eid=123"
    });

    const result = await updateAppointmentRequestStatus({
      id: "req-1",
      status: "CONFIRMED",
      confirmedStartAt: "2026-05-14T15:00:00.000Z",
      confirmedEndAt: "2026-05-14T15:30:00.000Z",
      confirmedTimezone: "America/Chicago",
      staffUserId: "staff-1"
    });

    expect(updateMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: "req-1" },
      data: expect.objectContaining({
        status: "CONFIRMED",
        confirmedTimezone: "America/Chicago",
        confirmedByStaffUser: { connect: { id: "staff-1" } }
      })
    }));
    expect(createOrUpdateCalendarEventMock).toHaveBeenCalledWith(afterStatusUpdate);
    expect(updateMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        calendarEventId: "event-123",
        calendarEventUrl: "https://calendar.google.com/event?eid=123",
        calendarSyncStatus: "SYNCED"
      })
    }));
    expect(result).toBe(finalRecord);
  });

  it("marks sync failed but keeps the appointment confirmed when calendar sync errors", async () => {
    const initial = makeRequest();
    const afterStatusUpdate = makeRequest({
      status: "CONFIRMED",
      confirmedStartAt: new Date("2026-05-14T15:00:00.000Z"),
      confirmedEndAt: new Date("2026-05-14T15:30:00.000Z"),
      confirmedTimezone: "America/Chicago",
      confirmedByStaffUserId: "staff-1"
    });
    const failedRecord = makeRequest({
      ...afterStatusUpdate,
      calendarSyncStatus: "FAILED",
      calendarSyncError: "Google down"
    });

    findUniqueMock.mockResolvedValueOnce(initial);
    updateMock
      .mockResolvedValueOnce(afterStatusUpdate)
      .mockResolvedValueOnce(failedRecord);
    createOrUpdateCalendarEventMock.mockRejectedValue(new Error("Google down"));

    const result = await updateAppointmentRequestStatus({
      id: "req-1",
      status: "CONFIRMED",
      confirmedStartAt: "2026-05-14T15:00:00.000Z",
      confirmedEndAt: "2026-05-14T15:30:00.000Z",
      confirmedTimezone: "America/Chicago",
      staffUserId: "staff-1"
    });

    expect(updateMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        calendarSyncStatus: "FAILED",
        calendarSyncError: "Google down"
      })
    }));
    expect(result).toBe(failedRecord);
  });

  it("retries a failed confirmed appointment sync and stores the calendar event", async () => {
    const failedRequest = makeRequest({
      status: "CONFIRMED",
      confirmedStartAt: new Date("2026-05-14T15:00:00.000Z"),
      confirmedEndAt: new Date("2026-05-14T15:30:00.000Z"),
      confirmedTimezone: "America/Chicago",
      calendarSyncStatus: "FAILED",
      calendarSyncError: "Google down"
    });
    const syncedRequest = makeRequest({
      ...failedRequest,
      calendarEventId: "event-456",
      calendarEventUrl: "https://calendar.google.com/event?eid=456",
      calendarSyncStatus: "SYNCED",
      calendarSyncError: null
    });

    findUniqueMock.mockResolvedValueOnce(failedRequest);
    createOrUpdateCalendarEventMock.mockResolvedValue({
      calendarEventId: "event-456",
      calendarEventUrl: "https://calendar.google.com/event?eid=456"
    });
    updateMock.mockResolvedValueOnce(syncedRequest);

    const result = await retryAppointmentCalendarSync("req-1");

    expect(createOrUpdateCalendarEventMock).toHaveBeenCalledWith(failedRequest);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "req-1" },
      data: expect.objectContaining({
        calendarEventId: "event-456",
        calendarSyncStatus: "SYNCED"
      })
    }));
    expect(result).toBe(syncedRequest);
  });
});
