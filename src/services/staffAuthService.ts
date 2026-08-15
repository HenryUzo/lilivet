import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { StaffPermissionKey, StaffRole } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type { StaffLoginInput } from "../validators/staffAuthSchemas";
import { getEffectivePermissions } from "./staffPermissions";

export type StaffJwtPayload = {
  sub: string;
  email: string;
  role: StaffRole;
  permissions: StaffPermissionKey[];
};

export async function loginStaff(input: StaffLoginInput) {
  const user = await prisma.staffUser.findUnique({
    where: { email: input.email.trim().toLowerCase() },
    include: { permissions: { select: { key: true } } }
  });

  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new HttpError(401, "Invalid email or password");
  }

  const permissions = getEffectivePermissions(user.role, user.permissions.map((permission) => permission.key));
  const payload: StaffJwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions
    }
  };
}
