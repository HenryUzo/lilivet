import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  findUniqueOrThrowMock,
  findUniqueMock,
  findManyMock,
  updateMock,
  findDuplicateNewPatientCandidateMock,
  assertUnattachedFilesAvailableMock,
  attachFilesToNewPatientRequestMock,
  sendClinicNewPatientNotificationMock,
  txMock
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  findUniqueOrThrowMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
  findDuplicateNewPatientCandidateMock: vi.fn(),
  assertUnattachedFilesAvailableMock: vi.fn(),
  attachFilesToNewPatientRequestMock: vi.fn(),
  sendClinicNewPatientNotificationMock: vi.fn(),
  txMock: {
    owner: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    pet: { findFirst: vi.fn(), create: vi.fn() },
    clientLifecycleRecord: { upsert: vi.fn() },
    newPatientRequest: {
      create: vi.fn()
    }
  }
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    $transaction: transactionMock,
    newPatientRequest: {
      findUniqueOrThrow: findUniqueOrThrowMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
      update: updateMock
    }
  }
}));

vi.mock("../src/services/duplicateService", () => ({
  findDuplicateNewPatientCandidate: findDuplicateNewPatientCandidateMock
}));

vi.mock("../src/services/fileService", () => ({
  assertUnattachedFilesAvailable: assertUnattachedFilesAvailableMock,
  attachFilesToNewPatientRequest: attachFilesToNewPatientRequestMock
}));

vi.mock("../src/services/mailService", () => ({
  sendClinicNewPatientNotification: sendClinicNewPatientNotificationMock
}));

import {
  captureNewPatientReferralSource,
  createNewPatientRequest,
  listNewPatientRequests
} from "../src/services/newPatientService";

const baseInput = {
  owner: {
    fullName: "Amara Okafor",
    email: "amara@example.com",
    phoneNumber: "(210) 257-8496"
  },
  visit: {
    reasonForVisit: "New patient visit",
    isUrgent: false,
    preferredDateTime: "2026-05-13T15:00:00.000-05:00",
    timezone: "America/Chicago",
    previousVetClinic: "Previous clinic",
    consentToElectronicComms: true
  },
  pet: {
    petName: "Milo",
    species: "DOG" as const,
    breed: "Mixed",
    age: "4 years",
    sex: "MALE" as const,
    weightLbs: 38.5,
    spayedNeutered: true,
    currentMedications: "None",
    existingConditions: "None"
  },
  uploadedFileIds: ["file-1"]
};

describe("newPatientService", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    transactionMock.mockReset();
    findUniqueOrThrowMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
    updateMock.mockReset();
    findDuplicateNewPatientCandidateMock.mockReset();
    assertUnattachedFilesAvailableMock.mockReset();
    attachFilesToNewPatientRequestMock.mockReset();
    sendClinicNewPatientNotificationMock.mockReset();
    txMock.newPatientRequest.create.mockReset();
    txMock.owner.findFirst.mockReset();
    txMock.owner.create.mockReset();
    txMock.owner.update.mockReset();
    txMock.pet.findFirst.mockReset();
    txMock.pet.create.mockReset();
    txMock.clientLifecycleRecord.upsert.mockReset();
    consoleErrorSpy.mockClear();

    findDuplicateNewPatientCandidateMock.mockResolvedValue(null);
    txMock.newPatientRequest.create.mockResolvedValue({ id: "new-request-1" });
    txMock.owner.findFirst.mockResolvedValue(null);
    txMock.owner.create.mockResolvedValue({ id: "owner-1" });
    txMock.pet.findFirst.mockResolvedValue(null);
    txMock.pet.create.mockResolvedValue({ id: "pet-1" });
    txMock.clientLifecycleRecord.upsert.mockResolvedValue({ id: "lifecycle-1" });
    findUniqueOrThrowMock.mockResolvedValue({
      id: "new-request-1",
      files: []
    });
    findUniqueMock.mockResolvedValue({
      id: "new-request-1",
      files: []
    });
    transactionMock.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it("returns the created request with a referral capture token without waiting for clinic email", async () => {
    sendClinicNewPatientNotificationMock.mockReturnValue(new Promise<void>(() => undefined));

    const result = await createNewPatientRequest(baseInput);

    expect(result).toEqual({
      id: "new-request-1",
      files: [],
      referralSourceCaptureToken: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    expect(txMock.newPatientRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referralSourceCaptureTokenHash: expect.any(String),
          referralSourceCaptureTokenExpiresAt: expect.any(Date)
        })
      })
    );
    expect(sendClinicNewPatientNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("logs clinic email failures but still returns the created request", async () => {
    sendClinicNewPatientNotificationMock.mockRejectedValue(new Error("smtp down"));

    const result = await createNewPatientRequest(baseInput);
    await Promise.resolve();
    await Promise.resolve();

    expect(result.id).toBe("new-request-1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("\"event\":\"email_dispatch_failed\"")
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("\"requestType\":\"new_patient\"")
    );
  });

  it("captures referral source and clears the token fields", async () => {
    const token = "a".repeat(64);
    findUniqueMock.mockResolvedValue({
      id: "new-request-1",
      files: [],
      referralSourceCaptureTokenHash: "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb",
      referralSourceCaptureTokenExpiresAt: new Date(Date.now() + 60_000)
    });
    updateMock.mockResolvedValue({
      id: "new-request-1",
      referralSource: "OTHER",
      referralSourceOther: "Neighbour flyer",
      files: []
    });

    const result = await captureNewPatientReferralSource("new-request-1", {
      token,
      source: "OTHER",
      otherText: "Neighbour flyer"
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "new-request-1" },
      data: expect.objectContaining({
        referralSource: "OTHER",
        referralSourceOther: "Neighbour flyer",
        referralSourceCapturedAt: expect.any(Date),
        referralSourceCaptureTokenHash: null,
        referralSourceCaptureTokenExpiresAt: null
      }),
      include: { files: true }
    });
    expect(result).toEqual({
      id: "new-request-1",
      referralSource: "OTHER",
      referralSourceOther: "Neighbour flyer",
      files: []
    });
  });

  it("rejects invalid referral source tokens", async () => {
    findUniqueMock.mockResolvedValue({
      id: "new-request-1",
      files: [],
      referralSourceCaptureTokenHash: "different-hash",
      referralSourceCaptureTokenExpiresAt: new Date(Date.now() + 60_000)
    });

    await expect(
      captureNewPatientReferralSource("new-request-1", {
        token: "b".repeat(64),
        source: "GOOGLE"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Referral source token is invalid"
    });
  });

  it("applies referral source filters to the staff queue query", async () => {
    findManyMock.mockResolvedValue([]);

    await listNewPatientRequests({
      limit: 25,
      referralSource: "NOT_CAPTURED"
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          referralSource: null
        })
      })
    );

    await listNewPatientRequests({
      limit: 25,
      referralSource: "GOOGLE"
    });

    expect(findManyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          referralSource: "GOOGLE"
        })
      })
    );
  });
});
