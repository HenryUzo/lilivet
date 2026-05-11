import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    appointmentRequest: {
      findMany: findManyMock
    }
  }
}));

import { listAppointmentRequests } from "../src/services/appointmentRequestService";

describe("listAppointmentRequests", () => {
  beforeEach(() => {
    findManyMock.mockReset();
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
});
