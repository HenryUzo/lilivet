import { describe, expect, it } from "vitest";
import { StaffPermissionKey, StaffRole } from "@prisma/client";
import { getEffectivePermissions, hasPermission } from "../src/services/staffPermissions";

describe("staff permissions", () => {
  it("gives Super Admins every managed permission", () => {
    expect(getEffectivePermissions(StaffRole.SUPER_ADMIN, [])).toEqual(
      expect.arrayContaining(Object.values(StaffPermissionKey))
    );
  });

  it("adds the required view permissions for higher-level actions", () => {
    const permissions = getEffectivePermissions(StaffRole.ADMIN, [
      StaffPermissionKey.APPOINTMENTS_MANAGE,
      StaffPermissionKey.PET_CARE_PUBLISH
    ]);
    expect(permissions).toEqual(expect.arrayContaining([
      StaffPermissionKey.APPOINTMENTS_VIEW,
      StaffPermissionKey.APPOINTMENTS_MANAGE,
      StaffPermissionKey.PET_CARE_VIEW,
      StaffPermissionKey.PET_CARE_EDIT,
      StaffPermissionKey.PET_CARE_PUBLISH
    ]));
  });

  it("does not give unrelated access to a restricted staff account", () => {
    expect(hasPermission(StaffRole.STAFF, [StaffPermissionKey.NEW_PATIENTS_VIEW], StaffPermissionKey.PET_CARE_VIEW)).toBe(false);
  });
});
