import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { acceptStaffInvitation, getStaffInvitation, inviteStaffUser, listStaffUsers, resendStaffInvitation, updateStaffUser } from "../services/staffManagementService";
import { acceptStaffInvitationSchema, createStaffInvitationSchema, invitationTokenParamsSchema, staffUserIdParamsSchema, updateStaffAccountSchema } from "../validators/staffManagementSchemas";
import { writeStaffAuditLog } from "../services/staffAuditService";

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await listStaffUsers();
  await writeStaffAuditLog({ action: "STAFF_DIRECTORY_VIEWED", actorId: req.staffUser!.id, resourceType: "STAFF_DIRECTORY", metadata: { returnedCount: result.items.length } });
  res.json(result);
});
export const inviteStaff = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await inviteStaffUser(req.staffUser!.id, createStaffInvitationSchema.parse(req.body)));
});
export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = staffUserIdParamsSchema.parse(req.params);
  res.json(await updateStaffUser(req.staffUser!.id, id, updateStaffAccountSchema.parse(req.body)));
});
export const resendInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = staffUserIdParamsSchema.parse(req.params);
  res.json(await resendStaffInvitation(req.staffUser!.id, id));
});
export const getInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = invitationTokenParamsSchema.parse(req.params);
  res.json(await getStaffInvitation(token));
});
export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = invitationTokenParamsSchema.parse(req.params);
  res.json(await acceptStaffInvitation(token, acceptStaffInvitationSchema.parse(req.body).password));
});
