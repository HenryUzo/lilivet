
const errorResponse = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["message"],
      properties: { message: { type: "string" }, code: { type: "string" }, details: {} }
    }
  }
} as const;

const uploadedFileDto = {
  type: "object",
  required: ["id", "originalName", "storedName", "mimeType", "sizeBytes", "storageProvider", "storageKey", "publicUrl", "attachmentStatus", "expiresAt", "appointmentDraftId", "appointmentRequestId", "newPatientRequestId", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" }, originalName: { type: "string" }, storedName: { type: "string" },
    mimeType: { type: "string", enum: ["application/pdf", "image/jpeg", "image/png"] },
    sizeBytes: { type: "integer" }, storageProvider: { type: "string", enum: ["local"] }, storageKey: { type: "string" },
    publicUrl: { type: "string", nullable: true }, attachmentStatus: { $ref: "#/components/schemas/FileAttachmentStatus" },
    expiresAt: { type: "string", format: "date-time", nullable: true }, appointmentDraftId: { type: "string", nullable: true },
    appointmentRequestId: { type: "string", nullable: true }, newPatientRequestId: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }
  }
} as const;

const preferredSelectionDto = {
  type: "object",
  required: ["date", "timeSlots"],
  properties: {
    date: { type: "string", format: "date-time", example: "2026-05-04T00:00:00.000Z" },
    timeSlots: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
      items: { type: "string", pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$" },
      example: ["20:30"]
    }
  }
} as const;

const preferredSelectionsDto = {
  type: "array",
  minItems: 1,
  maxItems: 3,
  uniqueItems: true,
  example: [
    { date: "2026-05-04T00:00:00.000Z", timeSlots: ["20:30"] },
    { date: "2026-05-05T00:00:00.000Z", timeSlots: ["16:15"] },
    { date: "2026-05-07T00:00:00.000Z", timeSlots: ["18:30"] }
  ],
  items: preferredSelectionDto
} as const;

const draftDetailResponse = {
  type: "object",
  required: ["id", "sessionToken", "visitType", "petName", "species", "breed", "approximateAgeYears", "sex", "weightLbs", "firstName", "lastName", "email", "phoneNumber", "preferredContactMethod", "preferredSelections", "timezone", "symptomsOrConcerns", "currentMedications", "previousVeterinarian", "symptomDuration", "lastCompletedStep", "expiresAt", "submittedAt", "appointmentRequestId", "files", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" }, sessionToken: { type: "string" }, visitType: { $ref: "#/components/schemas/VisitType", nullable: true },
    petName: { type: "string", nullable: true }, species: { $ref: "#/components/schemas/PetSpecies", nullable: true }, breed: { type: "string", nullable: true },
    approximateAgeYears: { type: "integer", nullable: true }, sex: { $ref: "#/components/schemas/PetSex", nullable: true }, weightLbs: { type: "string", nullable: true },
    firstName: { type: "string", nullable: true }, lastName: { type: "string", nullable: true }, email: { type: "string", nullable: true }, phoneNumber: { type: "string", nullable: true },
    preferredContactMethod: { $ref: "#/components/schemas/PreferredContactMethod", nullable: true }, preferredSelections: { ...preferredSelectionsDto, nullable: true },
    timezone: { type: "string", nullable: true },
    symptomsOrConcerns: { type: "string", nullable: true }, currentMedications: { type: "string", nullable: true }, previousVeterinarian: { type: "string", nullable: true }, symptomDuration: { type: "string", nullable: true },
    lastCompletedStep: { type: "integer", minimum: 0 }, expiresAt: { type: "string", format: "date-time" }, submittedAt: { type: "string", format: "date-time", nullable: true },
    appointmentRequestId: { type: "string", nullable: true }, files: { type: "array", items: { $ref: "#/components/schemas/UploadedFileDto" }, default: [] },
    createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }
  }
} as const;

const appointmentSubmissionResponse = {
  type: "object",
  required: ["id", "status", "visitType", "preferredSelections", "timezone", "symptomsOrConcerns", "currentMedications", "previousVeterinarian", "symptomDuration", "possibleDuplicate", "duplicateOfId", "owner", "pet", "files", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" }, status: { type: "string", enum: ["PENDING_REVIEW"] }, visitType: { $ref: "#/components/schemas/VisitType" },
    preferredSelections: preferredSelectionsDto, timezone: { type: "string" },
    symptomsOrConcerns: { type: "string", nullable: true }, currentMedications: { type: "string", nullable: true }, previousVeterinarian: { type: "string", nullable: true }, symptomDuration: { type: "string", nullable: true },
    possibleDuplicate: { type: "boolean" }, duplicateOfId: { type: "string", nullable: true },
    owner: { type: "object", required: ["id", "firstName", "lastName", "email", "phoneNumber", "preferredContactMethod"], properties: { id: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string", nullable: true }, phoneNumber: { type: "string" }, preferredContactMethod: { $ref: "#/components/schemas/PreferredContactMethod", nullable: true } } },
    pet: { type: "object", required: ["id", "ownerId", "name", "species", "breed", "approximateAgeYears", "sex", "weightLbs"], properties: { id: { type: "string" }, ownerId: { type: "string" }, name: { type: "string" }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", nullable: true }, approximateAgeYears: { type: "integer", nullable: true }, sex: { $ref: "#/components/schemas/PetSex" }, weightLbs: { type: "string", nullable: true } } },
    files: { type: "array", items: { $ref: "#/components/schemas/UploadedFileDto" } }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }
  }
} as const;
const appointmentRequestDetailResponse = {
  type: "object",
  required: ["id", "status", "visitType", "preferredSelections", "timezone", "symptomsOrConcerns", "currentMedications", "previousVeterinarian", "symptomDuration", "possibleDuplicate", "duplicateOfId", "owner", "pet", "files", "draft", "createdAt", "updatedAt"],
  properties: {
    ...appointmentSubmissionResponse.properties,
    status: { $ref: "#/components/schemas/AppointmentRequestStatus" },
    rescheduleRequestedAt: { type: "string", format: "date-time", nullable: true },
    rescheduleResponseDeadline: { type: "string", format: "date-time", nullable: true },
    rescheduleEmailSentAt: { type: "string", format: "date-time", nullable: true },
    rescheduleTokenIssuedAt: { type: "string", format: "date-time", nullable: true },
    rescheduledFromAppointmentRequestId: { type: "string", nullable: true },
    replacementAppointmentRequestId: { type: "string", nullable: true },
    pet: { type: "object", required: ["id", "ownerId", "name", "species", "breed", "approximateAgeYears", "age", "sex", "weightLbs", "spayedNeutered", "currentMedications", "existingConditions"], properties: { id: { type: "string" }, ownerId: { type: "string" }, name: { type: "string" }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", nullable: true }, approximateAgeYears: { type: "integer", nullable: true }, age: { type: "string", nullable: true }, sex: { $ref: "#/components/schemas/PetSex" }, weightLbs: { type: "string", nullable: true }, spayedNeutered: { type: "boolean", nullable: true }, currentMedications: { type: "string", nullable: true }, existingConditions: { type: "string", nullable: true } } },
    draft: { type: "object", nullable: true, required: ["id", "sessionToken", "submittedAt"], properties: { id: { type: "string" }, sessionToken: { type: "string" }, submittedAt: { type: "string", format: "date-time", nullable: true } } },
    replacementAppointmentRequest: {
      type: "object",
      nullable: true,
      required: ["id", "status", "createdAt"],
      properties: {
        id: { type: "string" },
        status: { $ref: "#/components/schemas/AppointmentRequestStatus" },
        createdAt: { type: "string", format: "date-time" }
      }
    }
  }
} as const;

const appointmentRescheduleContextResponse = {
  type: "object",
  required: [
    "token",
    "responseDeadline",
    "appointmentRequestId",
    "petName",
    "ownerName",
    "visitType",
    "confirmedStartAt",
    "timezone",
    "preferredSelections"
  ],
  properties: {
    token: { type: "string" },
    responseDeadline: { type: "string", format: "date-time" },
    appointmentRequestId: { type: "string" },
    petName: { type: "string" },
    ownerName: { type: "string" },
    visitType: { $ref: "#/components/schemas/VisitType" },
    confirmedStartAt: { type: "string", format: "date-time", nullable: true },
    timezone: { type: "string", nullable: true },
    preferredSelections: preferredSelectionsDto
  }
} as const;

const newPatientCreateResponse = {
  type: "object",
  required: ["id", "ownerFullName", "ownerEmail", "ownerPhoneNumber", "petName", "species", "breed", "age", "sex", "weightLbs", "spayedNeutered", "currentMedications", "existingConditions", "reasonForVisit", "isUrgent", "preferredDateTime", "timezone", "previousVetClinic", "consentToElectronicComms", "ownerId", "petId", "possibleDuplicate", "duplicateOfId", "files", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" }, ownerFullName: { type: "string" }, ownerEmail: { type: "string", nullable: true }, ownerPhoneNumber: { type: "string" }, petName: { type: "string" }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", nullable: true }, age: { type: "string", nullable: true }, sex: { $ref: "#/components/schemas/PetSex" }, weightLbs: { type: "string", nullable: true }, spayedNeutered: { type: "boolean", nullable: true }, currentMedications: { type: "string", nullable: true }, existingConditions: { type: "string", nullable: true }, reasonForVisit: { type: "string" }, isUrgent: { type: "boolean" }, preferredDateTime: { type: "string", format: "date-time", nullable: true }, timezone: { type: "string", nullable: true }, previousVetClinic: { type: "string", nullable: true }, consentToElectronicComms: { type: "boolean" }, ownerId: { type: "string", nullable: true }, petId: { type: "string", nullable: true }, possibleDuplicate: { type: "boolean" }, duplicateOfId: { type: "string", nullable: true }, files: { type: "array", items: { $ref: "#/components/schemas/UploadedFileDto" } }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }
  }
} as const;

const wellnessPlanBenefitResponse = {
  type: "object",
  required: ["id", "wellnessPlanId", "sortOrder", "label", "benefitType", "serviceType", "includedQuantity", "coverageLabel", "discountPercent", "creditAmount", "notes", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" }, wellnessPlanId: { type: "string" }, sortOrder: { type: "integer", minimum: 1 }, label: { type: "string" },
    benefitType: { $ref: "#/components/schemas/WellnessPlanBenefitType" }, serviceType: { $ref: "#/components/schemas/WellnessPlanServiceType", nullable: true },
    includedQuantity: { type: "integer", nullable: true }, coverageLabel: { type: "string", nullable: true }, discountPercent: { type: "integer", nullable: true },
    creditAmount: { type: "string", nullable: true }, notes: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }
  }
} as const;

const wellnessPlanResponse = {
  type: "object",
  required: ["id", "planKey", "species", "lifeStage", "tier", "displayName", "enrollmentFee", "monthlyFee", "annualPrice", "isActive", "benefits", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" }, planKey: { $ref: "#/components/schemas/WellnessPlanKey" }, species: { $ref: "#/components/schemas/WellnessPlanSpecies" },
    lifeStage: { $ref: "#/components/schemas/WellnessPlanLifeStage" }, tier: { $ref: "#/components/schemas/WellnessPlanTier" }, displayName: { type: "string" },
    enrollmentFee: { type: "string" }, monthlyFee: { type: "string" }, annualPrice: { type: "string" }, isActive: { type: "boolean" },
    benefits: { type: "array", items: { $ref: "#/components/schemas/WellnessPlanBenefitResponse" } }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }
  }
} as const;

const simpleErrorResponse = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } });
const jsonResponse = (description: string, schema: unknown) => ({ description, content: { "application/json": { schema } } });

const appointmentStep1Response = { type: "object", required: ["id", "sessionToken", "visitType", "lastCompletedStep", "expiresAt", "updatedAt"], properties: { id: { type: "string" }, sessionToken: { type: "string" }, visitType: { $ref: "#/components/schemas/VisitType" }, lastCompletedStep: { type: "integer", minimum: 0 }, expiresAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } as const;
const appointmentStep2Response = { type: "object", required: ["id", "sessionToken", "petName", "species", "breed", "approximateAgeYears", "sex", "weightLbs", "lastCompletedStep", "expiresAt", "updatedAt"], properties: { id: { type: "string" }, sessionToken: { type: "string" }, petName: { type: "string" }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", nullable: true }, approximateAgeYears: { type: "integer", nullable: true }, sex: { $ref: "#/components/schemas/PetSex" }, weightLbs: { type: "string", nullable: true }, lastCompletedStep: { type: "integer", minimum: 0 }, expiresAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } as const;
const appointmentStep3Response = { type: "object", required: ["id", "sessionToken", "firstName", "lastName", "email", "phoneNumber", "preferredContactMethod", "lastCompletedStep", "expiresAt", "updatedAt"], properties: { id: { type: "string" }, sessionToken: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string", nullable: true }, phoneNumber: { type: "string" }, preferredContactMethod: { $ref: "#/components/schemas/PreferredContactMethod" }, lastCompletedStep: { type: "integer", minimum: 0 }, expiresAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } as const;
const appointmentStep4Response = { type: "object", required: ["id", "sessionToken", "preferredSelections", "timezone", "lastCompletedStep", "expiresAt", "updatedAt"], properties: { id: { type: "string" }, sessionToken: { type: "string" }, preferredSelections: preferredSelectionsDto, timezone: { type: "string" }, lastCompletedStep: { type: "integer", minimum: 0 }, expiresAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } as const;
const appointmentStep5Response = { type: "object", required: ["id", "sessionToken", "symptomsOrConcerns", "currentMedications", "previousVeterinarian", "symptomDuration", "lastCompletedStep", "expiresAt", "updatedAt"], properties: { id: { type: "string" }, sessionToken: { type: "string" }, symptomsOrConcerns: { type: "string", nullable: true }, currentMedications: { type: "string", nullable: true }, previousVeterinarian: { type: "string", nullable: true }, symptomDuration: { type: "string", nullable: true }, lastCompletedStep: { type: "integer", minimum: 0 }, expiresAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } as const;
export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "Lili Vet Hospital Backend API", version: "1.0.0" },
  servers: [{ url: "http://localhost:4000", description: "Local development" }],
  tags: [{ name: "Health" }, { name: "Staff Auth" }, { name: "Admin Wellness Plans" }, { name: "Appointment Drafts" }, { name: "Appointment Requests" }, { name: "New Patient Requests" }, { name: "Files" }],
  paths: {
    "/health": { get: { tags: ["Health"], responses: { "200": jsonResponse("Service is healthy", { $ref: "#/components/schemas/HealthResponse" }), "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts": { post: { tags: ["Appointment Drafts"], summary: "Create an autosave draft session", responses: { "201": jsonResponse("Draft created", { $ref: "#/components/schemas/AppointmentDraftCreatedResponse" }), "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}": { get: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], responses: { "200": jsonResponse("Draft detail", { $ref: "#/components/schemas/AppointmentDraftDetailResponse" }), "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/step-1": { patch: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentStep1Request" }, responses: { "200": jsonResponse("Step 1 saved", { $ref: "#/components/schemas/AppointmentStep1Response" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/step-2": { patch: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentStep2Request" }, responses: { "200": jsonResponse("Step 2 saved", { $ref: "#/components/schemas/AppointmentStep2Response" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/step-3": { patch: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentStep3Request" }, responses: { "200": jsonResponse("Step 3 saved", { $ref: "#/components/schemas/AppointmentStep3Response" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/step-4": { patch: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentStep4Request" }, responses: { "200": jsonResponse("Step 4 saved", { $ref: "#/components/schemas/AppointmentStep4Response" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/step-5": { patch: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentStep5Request" }, responses: { "200": jsonResponse("Step 5 saved", { $ref: "#/components/schemas/AppointmentStep5Response" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/files": { post: { tags: ["Appointment Drafts", "Files"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/MultipartFilesRequest" }, responses: { "201": jsonResponse("Files uploaded", { $ref: "#/components/schemas/FilesUploadedResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "413": { $ref: "#/components/responses/PayloadTooLarge" }, "415": { $ref: "#/components/responses/UnsupportedMediaType" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-drafts/{sessionToken}/submit": { post: { tags: ["Appointment Drafts"], parameters: [{ $ref: "#/components/parameters/SessionTokenPathParam" }], responses: { "201": jsonResponse("Pending appointment request created", { $ref: "#/components/schemas/AppointmentSubmissionResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-requests/reschedule/{token}": { get: { tags: ["Appointment Requests"], parameters: [{ $ref: "#/components/parameters/RescheduleTokenPathParam" }], responses: { "200": jsonResponse("Reschedule context", { $ref: "#/components/schemas/AppointmentRescheduleContextResponse" }), "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-requests/reschedule/{token}/submit": { post: { tags: ["Appointment Requests"], parameters: [{ $ref: "#/components/parameters/RescheduleTokenPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentRescheduleSubmitRequest" }, responses: { "201": jsonResponse("Replacement appointment request created", { $ref: "#/components/schemas/AppointmentRequestDetailResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" }, "410": { $ref: "#/components/responses/Gone" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/staff/auth/login": { post: { tags: ["Staff Auth"], requestBody: { $ref: "#/components/requestBodies/StaffLoginRequest" }, responses: { "200": jsonResponse("Staff login succeeded", { $ref: "#/components/schemas/StaffLoginResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/admin/wellness-plans": { get: { tags: ["Admin Wellness Plans"], security: [{ bearerAuth: [] }], responses: { "200": jsonResponse("Wellness plan list", { type: "array", items: { $ref: "#/components/schemas/WellnessPlanResponse" } }), "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/admin/wellness-plans/{id}": { get: { tags: ["Admin Wellness Plans"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/IdPathParam" }], responses: { "200": jsonResponse("Wellness plan detail", { $ref: "#/components/schemas/WellnessPlanResponse" }), "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/admin/wellness-plans/key/{planKey}": { get: { tags: ["Admin Wellness Plans"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/WellnessPlanKeyPathParam" }], responses: { "200": jsonResponse("Wellness plan detail by key", { $ref: "#/components/schemas/WellnessPlanResponse" }), "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-requests": { get: { tags: ["Appointment Requests"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/StatusQueryParam" }, { $ref: "#/components/parameters/SearchQueryParam" }, { $ref: "#/components/parameters/DateFromQueryParam" }, { $ref: "#/components/parameters/DateToQueryParam" }, { $ref: "#/components/parameters/LimitQueryParam" }, { $ref: "#/components/parameters/CursorQueryParam" }], responses: { "200": jsonResponse("Appointment request list", { $ref: "#/components/schemas/AppointmentRequestListResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-requests/{id}": { get: { tags: ["Appointment Requests"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/IdPathParam" }], responses: { "200": jsonResponse("Appointment request detail", { $ref: "#/components/schemas/AppointmentRequestDetailResponse" }), "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-requests/{id}/status": { patch: { tags: ["Appointment Requests"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/IdPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentStatusUpdateRequest" }, responses: { "200": jsonResponse("Status updated", { $ref: "#/components/schemas/AppointmentStatusUpdateResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/appointment-requests/{id}/reschedule-link": { post: { tags: ["Appointment Requests"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/IdPathParam" }], requestBody: { $ref: "#/components/requestBodies/AppointmentRescheduleSendRequest" }, responses: { "200": jsonResponse("Reschedule email sent", { $ref: "#/components/schemas/AppointmentRequestDetailResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/new-patient-requests": { post: { tags: ["New Patient Requests"], requestBody: { $ref: "#/components/requestBodies/NewPatientCreateRequest" }, responses: { "201": jsonResponse("New-patient request created", { $ref: "#/components/schemas/NewPatientCreateResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" }, "500": { $ref: "#/components/responses/InternalServerError" } } }, get: { tags: ["New Patient Requests"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/SearchQueryParam" }, { $ref: "#/components/parameters/DateFromQueryParam" }, { $ref: "#/components/parameters/DateToQueryParam" }, { $ref: "#/components/parameters/LimitQueryParam" }, { $ref: "#/components/parameters/CursorQueryParam" }], responses: { "200": jsonResponse("New-patient request list", { $ref: "#/components/schemas/NewPatientListResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/new-patient-requests/{id}": { get: { tags: ["New Patient Requests"], security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/IdPathParam" }], responses: { "200": jsonResponse("New-patient request detail", { $ref: "#/components/schemas/NewPatientDetailResponse" }), "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "500": { $ref: "#/components/responses/InternalServerError" } } } },
    "/api/files": { post: { tags: ["Files"], requestBody: { $ref: "#/components/requestBodies/MultipartFilesRequest" }, responses: { "201": jsonResponse("Files uploaded", { $ref: "#/components/schemas/FilesUploadedResponse" }), "400": { $ref: "#/components/responses/BadRequest" }, "413": { $ref: "#/components/responses/PayloadTooLarge" }, "415": { $ref: "#/components/responses/UnsupportedMediaType" }, "500": { $ref: "#/components/responses/InternalServerError" } } } }
  },
  components: {
    responses: {
      BadRequest: simpleErrorResponse("Bad request"), Unauthorized: simpleErrorResponse("Unauthorized"), Forbidden: simpleErrorResponse("Forbidden"), NotFound: simpleErrorResponse("Not found"), Conflict: simpleErrorResponse("Conflict"), Gone: simpleErrorResponse("Expired resource"), PayloadTooLarge: simpleErrorResponse("Payload too large"), UnsupportedMediaType: simpleErrorResponse("Unsupported media type"), InternalServerError: simpleErrorResponse("Internal server error")
    },
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    parameters: {
      SessionTokenPathParam: { name: "sessionToken", in: "path", required: true, schema: { type: "string", minLength: 64, maxLength: 64 }, description: "Generated with crypto.randomBytes(32).toString('hex')." },
      RescheduleTokenPathParam: { name: "token", in: "path", required: true, schema: { type: "string", minLength: 64, maxLength: 64 } },
      IdPathParam: { name: "id", in: "path", required: true, schema: { type: "string", minLength: 1 } },
      WellnessPlanKeyPathParam: { name: "planKey", in: "path", required: true, schema: { $ref: "#/components/schemas/WellnessPlanKey" } },
      StatusQueryParam: { name: "status", in: "query", required: false, schema: { $ref: "#/components/schemas/AppointmentRequestStatus" } },
      SearchQueryParam: { name: "search", in: "query", required: false, schema: { type: "string", minLength: 1, maxLength: 200 } },
      DateFromQueryParam: { name: "dateFrom", in: "query", required: false, schema: { type: "string", format: "date-time" } },
      DateToQueryParam: { name: "dateTo", in: "query", required: false, schema: { type: "string", format: "date-time" } },
      LimitQueryParam: { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
      CursorQueryParam: { name: "cursor", in: "query", required: false, schema: { type: "string" } }
    },
    requestBodies: {
      StaffLoginRequest: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StaffLoginRequest" } } } }, AppointmentStep1Request: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStep1Request" } } } }, AppointmentStep2Request: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStep2Request" } } } }, AppointmentStep3Request: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStep3Request" } } } }, AppointmentStep4Request: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStep4Request" } } } }, AppointmentStep5Request: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStep5Request" } } } }, AppointmentStatusUpdateRequest: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStatusUpdateRequest" } } } }, AppointmentRescheduleSendRequest: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentRescheduleSendRequest" } } } }, AppointmentRescheduleSubmitRequest: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AppointmentStep4Request" } } } }, NewPatientCreateRequest: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NewPatientCreateRequest" } } } }, MultipartFilesRequest: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["files"], properties: { files: { type: "array", items: { type: "string", format: "binary" } } } } } } }
    },
    schemas: {
      ErrorResponse: errorResponse, HealthResponse: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["ok"] } } },
      VisitType: { type: "string", enum: ["URGENT_CARE", "WELLNESS_EXAM", "VACCINATIONS", "DENTAL_CARE", "SURGERY", "DIAGNOSTICS", "NEW_PATIENT_VISIT", "OTHER"] }, PetSpecies: { type: "string", enum: ["DOG", "CAT"] }, PetSex: { type: "string", enum: ["MALE", "FEMALE"] }, PreferredContactMethod: { type: "string", enum: ["CALL", "TEXT", "EMAIL"] }, AppointmentRequestStatus: { type: "string", enum: ["PENDING_REVIEW", "CONFIRMED", "OVERDUE", "CANCELLED", "COMPLETED", "NO_SHOW"] }, FileAttachmentStatus: { type: "string", enum: ["UNATTACHED", "ATTACHED_TO_DRAFT", "ATTACHED"] }, StaffRole: { type: "string", enum: ["ADMIN", "STAFF"] }, WellnessPlanSpecies: { type: "string", enum: ["DOG", "CAT"] }, WellnessPlanLifeStage: { type: "string", enum: ["PUPPY", "KITTEN", "ADULT"] }, WellnessPlanTier: { type: "string", enum: ["ESSENTIAL", "COMPLETE"] }, WellnessPlanBenefitType: { type: "string", enum: ["SERVICE", "DISCOUNT", "CREDIT", "OPTIONAL_DISCOUNTED_ITEM"] }, WellnessPlanServiceType: { type: "string", enum: ["COMPREHENSIVE_WELLNESS_EXAM", "WELLNESS_PUPPY_EXAM", "WELLNESS_KITTEN_EXAM", "DOG_CORE_VACCINE_SERIES", "CAT_CORE_VACCINE_SERIES", "FECAL_PARASITE_EXAM_AND_DEWORMING", "FECAL_PARASITE_EXAM", "HEARTWORM_TEST", "FELV_FIV_TEST", "EARLY_DIAGNOSTIC_BLOODWORK", "ANNUAL_WELLNESS_BLOODWORK", "URINALYSIS", "BLOOD_PRESSURE_SCREENING", "TECH_VISIT"] }, WellnessPlanKey: { type: "string", enum: ["PUPPY_ESSENTIAL", "PUPPY_COMPLETE", "ADULT_DOG_ESSENTIAL", "ADULT_DOG_COMPLETE", "KITTEN_ESSENTIAL", "KITTEN_COMPLETE", "ADULT_CAT_ESSENTIAL", "ADULT_CAT_COMPLETE"] },
      StaffLoginRequest: { type: "object", required: ["email", "password"], additionalProperties: false, properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 1 } } },
      StaffLoginResponse: { type: "object", required: ["token", "user"], properties: { token: { type: "string" }, user: { type: "object", required: ["id", "email", "role"], properties: { id: { type: "string" }, email: { type: "string", format: "email" }, role: { $ref: "#/components/schemas/StaffRole" } } } } },
      UploadedFileDto: uploadedFileDto,
      AppointmentStep1Request: { type: "object", required: ["visitType"], additionalProperties: false, properties: { visitType: { $ref: "#/components/schemas/VisitType" } } },
      AppointmentStep2Request: { type: "object", required: ["petName", "species", "sex"], additionalProperties: false, properties: { petName: { type: "string", minLength: 1, maxLength: 100 }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", maxLength: 100 }, approximateAgeYears: { type: "integer", minimum: 0, maximum: 80 }, sex: { $ref: "#/components/schemas/PetSex" }, weightLbs: { type: "number", minimum: 0, maximum: 300 } } },
      AppointmentStep3Request: { type: "object", required: ["firstName", "lastName", "phoneNumber", "preferredContactMethod"], additionalProperties: false, properties: { firstName: { type: "string", minLength: 1, maxLength: 100 }, lastName: { type: "string", minLength: 1, maxLength: 100 }, email: { type: "string", format: "email" }, phoneNumber: { type: "string", minLength: 7, maxLength: 30 }, preferredContactMethod: { $ref: "#/components/schemas/PreferredContactMethod" } } },
            AppointmentStep4Request: { type: "object", required: ["preferredSelections", "timezone"], additionalProperties: false, properties: { preferredSelections: { ...preferredSelectionsDto, description: "Up to three preferred dates, each with up to three local HH:mm time slots." }, timezone: { type: "string", minLength: 1, maxLength: 100, example: "Africa/Lagos" } } },
      AppointmentStep5Request: { type: "object", additionalProperties: false, properties: { symptomsOrConcerns: { type: "string", maxLength: 5000 }, currentMedications: { type: "string", maxLength: 2000 }, previousVeterinarian: { type: "string", maxLength: 200 }, symptomDuration: { type: "string", maxLength: 200 } } },
      AppointmentStatusUpdateRequest: { type: "object", required: ["status"], additionalProperties: false, properties: { status: { $ref: "#/components/schemas/AppointmentRequestStatus" } } },
      AppointmentRescheduleSendRequest: { type: "object", required: ["responseDeadline"], additionalProperties: false, properties: { responseDeadline: { type: "string", format: "date-time" } } },
      NewPatientCreateRequest: { type: "object", required: ["owner", "visit", "pet"], additionalProperties: false, properties: { owner: { type: "object", required: ["fullName", "phoneNumber"], additionalProperties: false, properties: { fullName: { type: "string", minLength: 1, maxLength: 200 }, email: { type: "string", format: "email" }, phoneNumber: { type: "string", minLength: 7, maxLength: 30 } } }, visit: { type: "object", required: ["reasonForVisit", "isUrgent", "consentToElectronicComms"], additionalProperties: false, properties: { reasonForVisit: { type: "string", minLength: 1, maxLength: 5000 }, isUrgent: { type: "boolean" }, preferredDateTime: { type: "string", format: "date-time" }, timezone: { type: "string", minLength: 1, maxLength: 100, example: "Africa/Lagos" }, previousVetClinic: { type: "string", maxLength: 200 }, consentToElectronicComms: { type: "boolean" } } }, pet: { type: "object", required: ["petName", "species", "sex"], additionalProperties: false, properties: { petName: { type: "string", minLength: 1, maxLength: 100 }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", maxLength: 100 }, age: { type: "string", maxLength: 80 }, sex: { $ref: "#/components/schemas/PetSex" }, weightLbs: { type: "number", minimum: 0, maximum: 300 }, spayedNeutered: { type: "boolean" }, currentMedications: { type: "string", maxLength: 2000 }, existingConditions: { type: "string", maxLength: 2000 } } }, uploadedFileIds: { type: "array", items: { type: "string" }, default: [] } } },
      AppointmentDraftCreatedResponse: draftDetailResponse, AppointmentDraftDetailResponse: draftDetailResponse,
      AppointmentStep1Response: appointmentStep1Response, AppointmentStep2Response: appointmentStep2Response, AppointmentStep3Response: appointmentStep3Response, AppointmentStep4Response: appointmentStep4Response, AppointmentStep5Response: appointmentStep5Response,
      AppointmentSubmissionResponse: appointmentSubmissionResponse,
      AppointmentRescheduleContextResponse: appointmentRescheduleContextResponse,
            AppointmentRequestListResponse: { type: "object", required: ["data", "nextCursor"], properties: { data: { type: "array", items: { type: "object", required: ["id", "status", "visitType", "preferredSelections", "timezone", "possibleDuplicate", "duplicateOfId", "owner", "pet", "createdAt", "updatedAt"], properties: { id: { type: "string" }, status: { $ref: "#/components/schemas/AppointmentRequestStatus" }, visitType: { $ref: "#/components/schemas/VisitType" }, preferredSelections: preferredSelectionsDto, timezone: { type: "string" }, possibleDuplicate: { type: "boolean" }, duplicateOfId: { type: "string", nullable: true }, owner: { type: "object", required: ["id", "firstName", "lastName", "email", "phoneNumber"], properties: { id: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string", nullable: true }, phoneNumber: { type: "string" } } }, pet: { type: "object", required: ["id", "name", "species", "breed"], properties: { id: { type: "string" }, name: { type: "string" }, species: { $ref: "#/components/schemas/PetSpecies" }, breed: { type: "string", nullable: true } } }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } }, nextCursor: { type: "string", nullable: true } } },
      AppointmentRequestDetailResponse: appointmentRequestDetailResponse, AppointmentStatusUpdateResponse: { type: "object", required: ["id", "status", "updatedAt"], properties: { id: { type: "string" }, status: { $ref: "#/components/schemas/AppointmentRequestStatus" }, updatedAt: { type: "string", format: "date-time" } } },
      WellnessPlanBenefitResponse: wellnessPlanBenefitResponse, WellnessPlanResponse: wellnessPlanResponse,
      NewPatientCreateResponse: newPatientCreateResponse,
      NewPatientListResponse: { type: "object", required: ["data", "nextCursor"], properties: { data: { type: "array", items: { type: "object", required: ["id", "ownerFullName", "ownerEmail", "ownerPhoneNumber", "petName", "species", "reasonForVisit", "isUrgent", "preferredDateTime", "timezone", "possibleDuplicate", "duplicateOfId", "ownerId", "petId", "createdAt", "updatedAt"], properties: { id: { type: "string" }, ownerFullName: { type: "string" }, ownerEmail: { type: "string", nullable: true }, ownerPhoneNumber: { type: "string" }, petName: { type: "string" }, species: { $ref: "#/components/schemas/PetSpecies" }, reasonForVisit: { type: "string" }, isUrgent: { type: "boolean" }, preferredDateTime: { type: "string", format: "date-time", nullable: true }, timezone: { type: "string", nullable: true }, possibleDuplicate: { type: "boolean" }, duplicateOfId: { type: "string", nullable: true }, ownerId: { type: "string", nullable: true }, petId: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } } }, nextCursor: { type: "string", nullable: true } } },
      NewPatientDetailResponse: newPatientCreateResponse, FilesUploadedResponse: { type: "object", required: ["files"], properties: { files: { type: "array", items: { $ref: "#/components/schemas/UploadedFileDto" } } } }
    }
  }
} as const;
