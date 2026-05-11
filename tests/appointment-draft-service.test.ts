import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentDraftFindUniqueMock,
  appointmentRequestFindUniqueOrThrowMock,
  transactionMock,
  findDuplicateAppointmentCandidateMock,
  attachFilesToAppointmentRequestMock,
  sendClinicAppointmentNotificationMock,
  sendClientAppointmentConfirmationMock,
  txMock
} = vi.hoisted(() => ({
  appointmentDraftFindUniqueMock: vi.fn(),
  appointmentRequestFindUniqueOrThrowMock: vi.fn(),
  transactionMock: vi.fn(),
  findDuplicateAppointmentCandidateMock: vi.fn(),
  attachFilesToAppointmentRequestMock: vi.fn(),
  sendClinicAppointmentNotificationMock: vi.fn(),
  sendClientAppointmentConfirmationMock: vi.fn(),
  txMock: {
    owner: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    pet: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    appointmentRequest: {
      create: vi.fn()
    },
    appointmentDraft: {
      update: vi.fn()
    }
  }
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    appointmentDraft: {
      findUnique: appointmentDraftFindUniqueMock
    },
    appointmentRequest: {
      findUniqueOrThrow: appointmentRequestFindUniqueOrThrowMock
    },
    $transaction: transactionMock
  }
}));

vi.mock("../src/services/duplicateService", () => ({
  findDuplicateAppointmentCandidate: findDuplicateAppointmentCandidateMock
}));

vi.mock("../src/services/fileService", () => ({
  attachFilesToAppointmentRequest: attachFilesToAppointmentRequestMock
}));

vi.mock("../src/services/mailService", () => ({
  sendClinicAppointmentNotification: sendClinicAppointmentNotificationMock,
  sendClientAppointmentConfirmation: sendClientAppointmentConfirmationMock
}));

import { submitAppointmentDraft } from "../src/services/appointmentDraftService";

const activeDraft = {
  id: "draft-1",
  sessionToken: "a".repeat(64),
  visitType: "WELLNESS_EXAM",
  petName: "Milo",
  species: "DOG",
  breed: "Mixed",
  approximateAgeYears: 4,
  sex: "MALE",
  weightLbs: { toString: () => "38.5", valueOf: () => 38.5 },
  firstName: "Amara",
  lastName: "Okafor",
  email: "amara@example.com",
  phoneNumber: "(210) 257-8496",
  preferredContactMethod: "CALL",
  preferredSelections: [
    { date: "2026-05-12T00:00:00.000-05:00", timeSlots: ["09:00"] },
    { date: "2026-05-13T00:00:00.000-05:00", timeSlots: ["11:00"] }
  ],
  timezone: "America/Chicago",
  symptomsOrConcerns: "Annual wellness exam",
  currentMedications: "None",
  previousVeterinarian: "Previous clinic",
  symptomDuration: "N/A",
  expiresAt: new Date(Date.now() + 60_000),
  submittedAt: null,
  appointmentRequest: null,
  files: [{ id: "file-1" }, { id: "file-2" }]
};

describe("submitAppointmentDraft", () => {
  beforeEach(() => {
    appointmentDraftFindUniqueMock.mockReset();
    appointmentRequestFindUniqueOrThrowMock.mockReset();
    transactionMock.mockReset();
    findDuplicateAppointmentCandidateMock.mockReset();
    attachFilesToAppointmentRequestMock.mockReset();
    sendClinicAppointmentNotificationMock.mockReset();
    sendClientAppointmentConfirmationMock.mockReset();

    txMock.owner.findUnique.mockReset();
    txMock.owner.create.mockReset();
    txMock.owner.update.mockReset();
    txMock.pet.findFirst.mockReset();
    txMock.pet.create.mockReset();
    txMock.pet.update.mockReset();
    txMock.appointmentRequest.create.mockReset();
    txMock.appointmentDraft.update.mockReset();

    appointmentDraftFindUniqueMock.mockResolvedValue(activeDraft);
    findDuplicateAppointmentCandidateMock.mockResolvedValue(null);
    sendClinicAppointmentNotificationMock.mockResolvedValue(undefined);
    sendClientAppointmentConfirmationMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it("reuses the existing owner and pet, creates preferred date keys, and attaches files before marking the draft submitted", async () => {
    const existingOwner = {
      id: "owner-1",
      firstName: "Amara",
      lastName: "Okafor",
      email: null,
      phoneNumber: "(210) 257-8496",
      normalizedPhone: "12102578496",
      preferredContactMethod: null
    };
    const updatedOwner = {
      ...existingOwner,
      email: "amara@example.com",
      preferredContactMethod: "CALL"
    };
    const existingPet = {
      id: "pet-1",
      ownerId: "owner-1",
      name: "Milo",
      species: "DOG",
      breed: "Mixed",
      approximateAgeYears: 4,
      sex: "MALE",
      weightLbs: { toString: () => "38.5" },
      currentMedications: "None"
    };
    const createdRequest = {
      id: "request-1",
      owner: updatedOwner,
      pet: existingPet,
      files: []
    };
    const finalRequest = {
      ...createdRequest,
      draft: { id: "draft-1" }
    };

    txMock.owner.findUnique.mockResolvedValue(existingOwner);
    txMock.owner.update.mockResolvedValue(updatedOwner);
    txMock.pet.findFirst.mockResolvedValue(existingPet);
    txMock.appointmentRequest.create.mockResolvedValue(createdRequest);
    appointmentRequestFindUniqueOrThrowMock.mockResolvedValue(finalRequest);

    const result = await submitAppointmentDraft("a".repeat(64));

    expect(txMock.owner.create).not.toHaveBeenCalled();
    expect(txMock.pet.create).not.toHaveBeenCalled();
    expect(txMock.owner.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "owner-1" },
      data: expect.objectContaining({
        email: "amara@example.com",
        preferredContactMethod: "CALL"
      })
    }));
    expect(txMock.appointmentRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ownerId: "owner-1",
        petId: "pet-1",
        preferredDateSelections: {
          create: [{ dateKey: "2026-05-12" }, { dateKey: "2026-05-13" }]
        }
      })
    }));
    expect(attachFilesToAppointmentRequestMock).toHaveBeenCalledWith(txMock, "draft-1", "request-1", 2);
    expect(txMock.appointmentDraft.update).toHaveBeenCalledTimes(1);
    expect(result).toBe(finalRequest);
  });

  it("does not mark the draft submitted when file attachment fails inside the transaction", async () => {
    txMock.owner.findUnique.mockResolvedValue(null);
    txMock.owner.create.mockResolvedValue({
      id: "owner-1",
      firstName: "Amara",
      lastName: "Okafor",
      email: "amara@example.com",
      phoneNumber: "(210) 257-8496",
      normalizedPhone: "12102578496",
      preferredContactMethod: "CALL"
    });
    txMock.pet.findFirst.mockResolvedValue(null);
    txMock.pet.create.mockResolvedValue({
      id: "pet-1",
      ownerId: "owner-1",
      name: "Milo",
      species: "DOG",
      breed: "Mixed",
      approximateAgeYears: 4,
      sex: "MALE",
      weightLbs: null,
      currentMedications: null
    });
    txMock.appointmentRequest.create.mockResolvedValue({
      id: "request-1",
      owner: { firstName: "Amara", lastName: "Okafor", phoneNumber: "(210) 257-8496", email: "amara@example.com" },
      pet: { name: "Milo" },
      files: []
    });
    attachFilesToAppointmentRequestMock.mockRejectedValue(new Error("attach failed"));

    await expect(submitAppointmentDraft("a".repeat(64))).rejects.toThrow("attach failed");
    expect(txMock.appointmentDraft.update).not.toHaveBeenCalled();
  });

  it("rejects expired drafts before creating any owner, pet, or request rows", async () => {
    appointmentDraftFindUniqueMock.mockResolvedValue({
      ...activeDraft,
      expiresAt: new Date(Date.now() - 60_000)
    });

    await expect(submitAppointmentDraft("a".repeat(64))).rejects.toMatchObject({
      statusCode: 410
    });

    expect(transactionMock).not.toHaveBeenCalled();
  });
});
