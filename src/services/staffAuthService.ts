import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { StaffRole } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type { StaffLoginInput } from "../validators/staffAuthSchemas";

export type StaffJwtPayload = {
  sub: string;
  email: string;
  role: StaffRole;
};

export async function loginStaff(input: StaffLoginInput) {
  const user = await prisma.staffUser.findUnique({
    where: { email: input.email }
  });

  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new HttpError(401, "Invalid email or password");
  }

  const payload: StaffJwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}
