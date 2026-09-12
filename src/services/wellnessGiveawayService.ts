import crypto from "node:crypto";
import { MarketingChannel, MarketingConsentAction, MarketingConsentStatus, PetSex, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { hashEmail, sendBrevoTransactionalEmail, sendPetCareDoubleOptIn } from "../integrations/brevo/brevoClient";
import { HttpError } from "../utils/httpError";
import { normalizePhoneNumber } from "../utils/phone";
import type { GiveawayCampaignUpdateInput, GiveawayEntryInput } from "../validators/wellnessGiveawaySchemas";

const defaultCampaign = { slug: "wellness-giveaway" };
const campaignSelect = { id: true, slug: true, name: true, isPublished: true, raffleEnabled: true, prizeDescription: true, discountPercent: true, expiresAt: true, termsSummary: true, termsContent: true, termsVersion: true, winnerEntryId: true, publishedAt: true, createdAt: true, updatedAt: true } satisfies Prisma.WellnessGiveawayCampaignSelect;

export async function getGiveawayCampaign() { return prisma.wellnessGiveawayCampaign.upsert({ where: { slug: defaultCampaign.slug }, create: defaultCampaign, update: {}, select: campaignSelect }); }
export async function getPublicGiveawayCampaign() { const campaign = await getGiveawayCampaign(); if (!campaign.isPublished) throw new HttpError(404, "This giveaway is not currently available."); if (campaign.expiresAt && campaign.expiresAt < new Date()) throw new HttpError(410, "This giveaway has ended."); return { id: campaign.id, slug: campaign.slug, name: campaign.name, raffleEnabled: campaign.raffleEnabled, prizeDescription: campaign.prizeDescription, discountPercent: campaign.discountPercent, expiresAt: campaign.expiresAt, termsSummary: campaign.termsSummary, termsContent: campaign.termsContent, termsVersion: campaign.termsVersion }; }
export async function updateGiveawayCampaign(input: GiveawayCampaignUpdateInput) { const current = await getGiveawayCampaign(); return prisma.wellnessGiveawayCampaign.update({ where: { id: current.id }, data: { ...input, expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt ? new Date(input.expiresAt) : null, publishedAt: input.isPublished === true && !current.isPublished ? new Date() : input.isPublished === false ? null : undefined }, select: campaignSelect }); }

function rewardCode() { return `LILI-${crypto.randomBytes(4).toString("hex").toUpperCase()}`; }
async function sendReward(entry: { id: string; rewardCode: string; owner: { firstName: string; email: string | null } }, campaign: { discountPercent: number; expiresAt: Date | null }) {
  if (!entry.owner.email) return;
  const expiry = campaign.expiresAt ? ` Valid through ${campaign.expiresAt.toLocaleDateString("en-US")}.` : "";
  const result = await sendBrevoTransactionalEmail({ to: { email: entry.owner.email, name: entry.owner.firstName }, subject: `Your ${campaign.discountPercent}% off Lili Veterinary Hospital offer`, htmlContent: `<p>Thank you for visiting Lili Veterinary Hospital.</p><p>Use code <strong>${entry.rewardCode}</strong> for <strong>${campaign.discountPercent}% off</strong> your pet's next wellness exam or urgent-care visit.${expiry}</p>`, textContent: `Thank you for visiting Lili Veterinary Hospital. Use code ${entry.rewardCode} for ${campaign.discountPercent}% off your pet's next wellness exam or urgent-care visit.${expiry}` });
  await prisma.wellnessGiveawayEntry.update({ where: { id: entry.id }, data: result.ok ? { rewardEmailSentAt: new Date() } : { rewardEmailFailedAt: new Date() } });
}

export async function submitGiveawayEntry(input: GiveawayEntryInput) {
  const campaign = await getPublicGiveawayCampaign();
  const emailHash = hashEmail(input.email);
  const existing = await prisma.wellnessGiveawayEntry.findUnique({ where: { campaignId_emailHash: { campaignId: campaign.id, emailHash } }, include: { owner: true } });
  const [firstName, ...lastName] = input.fullName.split(/\s+/); const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
  const entry = await prisma.$transaction(async (tx) => {
    const owner = await tx.owner.findFirst({ where: { OR: [{ email: input.email }, ...(normalizedPhone ? [{ normalizedPhone }] : [])] } });
    const savedOwner = owner ? await tx.owner.update({ where: { id: owner.id }, data: { firstName, lastName: lastName.join(" ") || "Client", email: input.email, phoneNumber: input.phoneNumber, normalizedPhone: normalizedPhone || undefined } }) : await tx.owner.create({ data: { firstName, lastName: lastName.join(" ") || "Client", email: input.email, phoneNumber: input.phoneNumber, normalizedPhone: normalizedPhone || undefined } });
    const saved = existing ? await tx.wellnessGiveawayEntry.update({ where: { id: existing.id }, data: { ownerId: savedOwner.id, currentPatient: input.currentPatient, marketingOptIn: input.marketingOptIn || existing.marketingOptIn, termsVersion: campaign.termsVersion, termsAcceptedAt: new Date(), pets: { deleteMany: {} } }, include: { owner: true } }) : await tx.wellnessGiveawayEntry.create({ data: { campaignId: campaign.id, ownerId: savedOwner.id, emailHash, currentPatient: input.currentPatient, marketingOptIn: input.marketingOptIn, rewardCode: rewardCode(), termsVersion: campaign.termsVersion }, include: { owner: true } });
    for (const pet of input.pets) { const existingPet = await tx.pet.findFirst({ where: { ownerId: savedOwner.id, name: { equals: pet.name, mode: "insensitive" } } }); const savedPet = existingPet ? await tx.pet.update({ where: { id: existingPet.id }, data: { species: pet.species, breed: pet.breed || undefined, age: pet.age || undefined } }) : await tx.pet.create({ data: { ownerId: savedOwner.id, name: pet.name, species: pet.species, breed: pet.breed || undefined, age: pet.age || undefined, sex: PetSex.UNKNOWN } }); await tx.wellnessGiveawayPet.create({ data: { entryId: saved.id, petId: savedPet.id, name: pet.name, species: pet.species, age: pet.age || undefined, breed: pet.breed || undefined } }); }
    return saved;
  });
  void sendReward(entry, campaign);
  if (input.marketingOptIn) { void sendPetCareDoubleOptIn({ email: input.email, petPreference: input.pets.some((pet) => pet.species === "DOG") && input.pets.some((pet) => pet.species === "CAT") ? "BOTH" : input.pets[0].species }); await prisma.wellnessGiveawayEntry.update({ where: { id: entry.id }, data: { marketingConfirmationSentAt: new Date() } }); }
  return { rewardCode: entry.rewardCode, discountPercent: campaign.discountPercent, expiresAt: campaign.expiresAt, raffleEnabled: campaign.raffleEnabled, prizeDescription: campaign.prizeDescription, marketingConfirmationRequired: input.marketingOptIn };
}

export async function listGiveawayEntries(search?: string) { const campaign = await getGiveawayCampaign(); const where: Prisma.WellnessGiveawayEntryWhereInput = { campaignId: campaign.id, ...(search ? { owner: { is: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } } } : {}) }; const items = await prisma.wellnessGiveawayEntry.findMany({ where, orderBy: { createdAt: "desc" }, include: { owner: true, pets: true } }); return { items, metrics: { entries: items.length, redeemed: items.filter((item) => item.redeemedAt).length, optedIn: items.filter((item) => item.marketingOptIn).length, currentPatients: items.filter((item) => item.currentPatient).length } }; }
export async function redeemGiveawayCode(code: string) { const entry = await prisma.wellnessGiveawayEntry.findUnique({ where: { rewardCode: code } }); if (!entry) throw new HttpError(404, "Offer code not found."); if (entry.redeemedAt) throw new HttpError(409, "Offer code has already been redeemed."); return prisma.wellnessGiveawayEntry.update({ where: { id: entry.id }, data: { redeemedAt: new Date() } }); }
export async function drawGiveawayWinner() { const campaign = await getGiveawayCampaign(); if (!campaign.raffleEnabled) throw new HttpError(409, "Enable the raffle before drawing a winner."); if (campaign.winnerEntryId) throw new HttpError(409, "A winner has already been selected."); const entries = await prisma.wellnessGiveawayEntry.findMany({ where: { campaignId: campaign.id } }); if (!entries.length) throw new HttpError(409, "There are no eligible entries."); const winner = entries[crypto.randomInt(entries.length)]; return prisma.wellnessGiveawayCampaign.update({ where: { id: campaign.id }, data: { winnerEntryId: winner.id }, select: campaignSelect }); }
