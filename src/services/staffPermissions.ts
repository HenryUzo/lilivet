import { StaffPermissionKey, StaffRole } from "@prisma/client";

export const MANAGED_PERMISSION_KEYS = [
  StaffPermissionKey.APPOINTMENTS_VIEW,
  StaffPermissionKey.APPOINTMENTS_MANAGE,
  StaffPermissionKey.NEW_PATIENTS_VIEW,
  StaffPermissionKey.PET_CARE_VIEW,
  StaffPermissionKey.PET_CARE_EDIT,
  StaffPermissionKey.PET_CARE_PUBLISH,
  StaffPermissionKey.PET_CARE_REVIEWERS
] as const;

const impliedPermissions: Partial<Record<StaffPermissionKey, StaffPermissionKey[]>> = {
  [StaffPermissionKey.APPOINTMENTS_MANAGE]: [StaffPermissionKey.APPOINTMENTS_VIEW],
  [StaffPermissionKey.PET_CARE_EDIT]: [StaffPermissionKey.PET_CARE_VIEW],
  [StaffPermissionKey.PET_CARE_PUBLISH]: [StaffPermissionKey.PET_CARE_VIEW, StaffPermissionKey.PET_CARE_EDIT],
  [StaffPermissionKey.PET_CARE_REVIEWERS]: [StaffPermissionKey.PET_CARE_VIEW]
};

export function getEffectivePermissions(role: StaffRole, permissions: StaffPermissionKey[]) {
  if (role === StaffRole.SUPER_ADMIN) {
    return [...MANAGED_PERMISSION_KEYS];
  }

  const effective = new Set(permissions);
  for (const permission of permissions) {
    for (const implied of impliedPermissions[permission] ?? []) {
      effective.add(implied);
    }
  }
  return [...effective];
}

export function hasPermission(
  role: StaffRole,
  permissions: StaffPermissionKey[],
  required: StaffPermissionKey
) {
  return getEffectivePermissions(role, permissions).includes(required);
}
