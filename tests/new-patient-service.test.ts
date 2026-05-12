import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  findUniqueOrThrowMock,
  findDuplicateNewPatientCandidateMock,
  assertUnattachedFilesAvailableMock,
  attachFilesToNewPatientRequestMock,
  sendClinicNewPatientNotificationMock,
  txMock
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  findUniqueOrThrowMock: vi.fn(),
  findDuplicateNewPatientCandidateMock: vi.fn(),
  assertUnattachedFilesAvailableMock: vi.fn(),
  attachFilesToNewPatientRequestMock: vi.fn(),
  sendClinicNewPatientNotificationMock: vi.fn(),
  txMock: {
    newPatientRequest: {
      create: vi.fn()
    }
  }
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    $transaction: transactionMock,
    newPatientRequest: {
      findUniqueOrThrow: findUniqueOrThrowMock
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

import { createNewPatientRequest } from "../src/services/newPatientService";

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

describe("createNewPatientRequest", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    transactionMock.mockReset();
    findUniqueOrThrowMock.mockReset();
    findDuplicateNewPatientCandidateMock.mockReset();
    assertUnattachedFilesAvailableMock.mockReset();
    attachFilesToNewPatientRequestMock.mockReset();
    sendClinicNewPatientNotificationMock.mockReset();
    txMock.newPatientRequest.create.mockReset();
    consoleErrorSpy.mockClear();

    findDuplicateNewPatientCandidateMock.mockResolvedValue(null);
    txMock.newPatientRequest.create.mockResolvedValue({ id: "new-request-1" });
    findUniqueOrThrowMock.mockResolvedValue({
      id: "new-request-1",
      files: []
    });
    transactionMock.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it("returns the created request without waiting for the clinic email promise to settle", async () => {
    sendClinicNewPatientNotificationMock.mockReturnValue(new Promise<void>(() => undefined));

    const result = await createNewPatientRequest(baseInput);

    expect(result).toEqual({
      id: "new-request-1",
      files: []
    });
    expect(sendClinicNewPatientNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("logs clinic email failures but still returns the created request", async () => {
    sendClinicNewPatientNotificationMock.mockRejectedValue(new Error("smtp down"));

    const result = await createNewPatientRequest(baseInput);
    await Promise.resolve();
    await Promise.resolve();

    expect(result).toEqual({
      id: "new-request-1",
      files: []
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("\"event\":\"email_dispatch_failed\"")
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("\"requestType\":\"new_patient\"")
    );
  });
});
