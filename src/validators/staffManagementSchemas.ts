import { StaffPermissionKey } from "@prisma/client";
import { z } from "zod";

const assignablePermissionSchema = z.nativeEnum(StaffPermissionKey).refine(
  (key) => key !== StaffPermissionKey.CAMPAIGNS_VIEW && key !== StaffPermissionKey.CAMPAIGNS_MANAGE,
  "Campaign permissions are reserved for Super Admins"
);

export const staffUserIdParamsSchema = z.object({ id: z.string().cuid() });

export const createStaffInvitationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  permissions: z.array(assignablePermissionSchema).max(20).default([])
});

export const updateStaffPermissionsSchema = z.object({
  permissions: z.array(assignablePermissionSchema).max(20)
});

export const updateStaffAccountSchema = z.object({
  isActive: z.boolean().optional(),
  permissions: z.array(assignablePermissionSchema).max(20).optional()
}).refine((input) => input.isActive !== undefined || input.permissions !== undefined, {
  message: "Provide an account status or permissions to update"
});

export const invitationTokenParamsSchema = z.object({ token: z.string().length(64) });

export const acceptStaffInvitationSchema = z.object({
  password: z.string().min(12).max(128)
});

export type CreateStaffInvitationInput = z.infer<typeof createStaffInvitationSchema>;
