import bcrypt from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import type { StaffPermissionKey, StaffRole } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import { getEffectivePermissions } from "./staffPermissions";
import type { StaffJwtPayload } from "./staffAuthService";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MFA_TOKEN_EXPIRY = "10m";

type MfaTokenPurpose = "mfa_setup" | "mfa_challenge";

type MfaUser = {
  id: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  sessionVersion: number;
  mfaSecretEncrypted: string | null;
  mfaPendingSecretEncrypted: string | null;
  permissions: Array<{ key: StaffPermissionKey }>;
};

export function createMfaToken(user: Pick<MfaUser, "id" | "email" | "role">, purpose: MfaTokenPurpose) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, purpose }, env.JWT_SECRET, {
    expiresIn: MFA_TOKEN_EXPIRY as SignOptions["expiresIn"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
}

function verifyMfaToken(token: string, purpose: MfaTokenPurpose) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE }) as StaffJwtPayload;
    if (payload.purpose !== purpose) throw new Error("Incorrect MFA token purpose");
    return payload;
  } catch {
    throw new HttpError(401, "This verification request has expired. Please sign in again.");
  }
}

function encryptionKey() {
  return createHash("sha256").update(env.MFA_ENCRYPTION_KEY).digest();
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptSecret(encrypted: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = encrypted.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new HttpError(500, "Stored MFA secret is invalid");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new HttpError(500, "Stored MFA secret cannot be decrypted");
  }
}

function base32Encode(value: Buffer) {
  let bits = "";
  for (const byte of value) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string) {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  let bits = "";
  for (const character of normalized) {
    const position = BASE32_ALPHABET.indexOf(character);
    if (position < 0) throw new HttpError(400, "Authenticator secret is invalid");
    bits += position.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function verifyTotp(secret: string, code: string, time = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const currentStep = Math.floor(time / 30_000);
  for (let offset = -1; offset <= 1; offset += 1) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(currentStep + offset));
    const digest = createHmac("sha1", key).update(counter).digest();
    const byteOffset = digest[digest.length - 1] & 0x0f;
    const expected = ((digest.readUInt32BE(byteOffset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
  }
  return false;
}

function createRecoveryCodes() {
  return Array.from({ length: 10 }, () => randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-"));
}

async function getMfaUser(userId: string) {
  const user = await prisma.staffUser.findUnique({ where: { id: userId }, include: { permissions: { select: { key: true } } } });
  if (!user || !user.isActive) throw new HttpError(401, "Staff account is inactive");
  return user as MfaUser;
}

export async function beginMfaEnrollment(setupToken: string) {
  const payload = verifyMfaToken(setupToken, "mfa_setup");
  const user = await getMfaUser(payload.sub);
  if (user.mfaSecretEncrypted) throw new HttpError(409, "Authenticator MFA is already enabled for this account");
  const secret = base32Encode(randomBytes(20));
  await prisma.staffUser.update({ where: { id: user.id }, data: { mfaPendingSecretEncrypted: encryptSecret(secret) } });
  const issuer = "LiliVet";
  const otpauthUri = `otpauth://totp/${encodeURIComponent(`${issuer}:${user.email}`)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return { secret, otpauthUri, qrCodeDataUrl: await QRCode.toDataURL(otpauthUri, { width: 240, margin: 1, errorCorrectionLevel: "M" }) };
}

export async function confirmMfaEnrollment(setupToken: string, code: string) {
  const payload = verifyMfaToken(setupToken, "mfa_setup");
  const user = await getMfaUser(payload.sub);
  if (!user.mfaPendingSecretEncrypted) throw new HttpError(409, "Start MFA setup before confirming it");
  const secret = decryptSecret(user.mfaPendingSecretEncrypted);
  if (!verifyTotp(secret, code)) throw new HttpError(401, "Enter the current six-digit code from your authenticator app");
  const recoveryCodes = createRecoveryCodes();
  const hashes = await Promise.all(recoveryCodes.map((recoveryCode) => bcrypt.hash(recoveryCode, 12)));
  await prisma.$transaction([
    prisma.staffMfaRecoveryCode.deleteMany({ where: { staffUserId: user.id } }),
    prisma.staffUser.update({ where: { id: user.id }, data: { mfaSecretEncrypted: user.mfaPendingSecretEncrypted, mfaPendingSecretEncrypted: null, mfaEnabledAt: new Date() } }),
    prisma.staffMfaRecoveryCode.createMany({ data: hashes.map((codeHash) => ({ staffUserId: user.id, codeHash })) })
  ]);
  await prisma.staffAccessAuditLog.create({ data: { actorId: user.id, targetUserId: user.id, action: "STAFF_MFA_ENABLED" } });
  return { session: createStaffSession(user), recoveryCodes };
}

export async function completeMfaChallenge(challengeToken: string, code: string) {
  const payload = verifyMfaToken(challengeToken, "mfa_challenge");
  const user = await getMfaUser(payload.sub);
  if (!user.mfaSecretEncrypted) throw new HttpError(409, "Authenticator MFA is not enabled for this account");
  const isTotpValid = verifyTotp(decryptSecret(user.mfaSecretEncrypted), code);
  if (!isTotpValid) {
    const normalizedRecoveryCode = code.trim().toUpperCase();
    const recoveryCodes = await prisma.staffMfaRecoveryCode.findMany({ where: { staffUserId: user.id, usedAt: null } });
    const matchingCode = (await Promise.all(recoveryCodes.map(async (recoveryCode) => ({ recoveryCode, matches: await bcrypt.compare(normalizedRecoveryCode, recoveryCode.codeHash) })))).find((entry) => entry.matches)?.recoveryCode;
    if (!matchingCode) throw new HttpError(401, "Enter a valid authenticator or recovery code");
    await prisma.staffMfaRecoveryCode.update({ where: { id: matchingCode.id }, data: { usedAt: new Date() } });
    await prisma.staffAccessAuditLog.create({ data: { actorId: user.id, targetUserId: user.id, action: "STAFF_MFA_RECOVERY_CODE_USED" } });
  }
  return createStaffSession(user);
}

export function createStaffSession(user: MfaUser) {
  const permissions = getEffectivePermissions(user.role, user.permissions.map((permission) => permission.key));
  const payload: StaffJwtPayload = { sub: user.id, email: user.email, role: user.role, permissions, sessionVersion: user.sessionVersion, purpose: "staff_session" };
  return { token: jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE }), user: { id: user.id, email: user.email, role: user.role, permissions } };
}
