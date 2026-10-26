import { MarketingChannel, MarketingConsentAction, MarketingConsentStatus, OwnerDirectoryType, PotentialClientSource, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { normalizePhoneNumber } from "../utils/phone";
import { hashEmail } from "../integrations/brevo/brevoClient";

type PotentialClientInput = {
  source: PotentialClientSource;
  sourceRecordId: string;
  sourceLabel: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  ownerId?: string | null;
  emailMarketingOptIn?: boolean;
  emailMarketingConfirmed?: boolean;
};

export async function upsertPotentialClient(tx: Prisma.TransactionClient, input: PotentialClientInput) {
  const email = input.email?.trim().toLowerCase() || null;
  const emailMarketingOptIn = Boolean(input.emailMarketingOptIn);
  const emailMarketingConfirmed = emailMarketingOptIn && Boolean(input.emailMarketingConfirmed);
  const existing = await tx.potentialClient.findUnique({
    where: { source_sourceRecordId: { source: input.source, sourceRecordId: input.sourceRecordId } }
  });
  const data = {
    sourceLabel: input.sourceLabel,
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName?.trim() || null,
    email,
    normalizedEmail: email,
    phoneNumber: input.phoneNumber?.trim() || null,
    normalizedPhone: input.phoneNumber ? normalizePhoneNumber(input.phoneNumber) : null,
    ownerId: input.ownerId || null,
    emailMarketingOptIn,
    emailMarketingConfirmed,
    emailConsentAt: emailMarketingOptIn ? existing?.emailConsentAt ?? new Date() : null
  };
  return tx.potentialClient.upsert({
    where: { source_sourceRecordId: { source: input.source, sourceRecordId: input.sourceRecordId } },
    create: { ...data, source: input.source, sourceRecordId: input.sourceRecordId },
    update: data
  });
}

export async function convertPotentialClients(tx: Prisma.TransactionClient, input: { ownerId: string; email?: string | null; phoneNumber?: string | null }) {
  const email = input.email?.trim().toLowerCase();
  const normalizedPhone = input.phoneNumber ? normalizePhoneNumber(input.phoneNumber) : undefined;
  const matchWhere: Prisma.PotentialClientWhereInput = {
    convertedAt: null,
    OR: [
      { ownerId: input.ownerId },
      ...(email ? [{ normalizedEmail: email }] : []),
      ...(normalizedPhone ? [{ normalizedPhone }] : [])
    ]
  };
  const matchingLeads = await tx.potentialClient.findMany({ where: matchWhere });
  await tx.owner.update({ where: { id: input.ownerId }, data: { directoryType: OwnerDirectoryType.CLIENT } });
  for (const lead of matchingLeads.filter((item) => item.emailMarketingOptIn && item.emailMarketingConfirmed)) {
    const profile = await tx.clientProfile.upsert({ where: { ownerId: input.ownerId }, create: { ownerId: input.ownerId }, update: {} });
    if (profile.emailMarketingStatus === MarketingConsentStatus.NOT_SUBSCRIBED) {
      const consentAt = lead.emailConsentAt ?? new Date();
      await tx.clientProfile.update({ where: { id: profile.id }, data: { emailMarketingStatus: MarketingConsentStatus.SUBSCRIBED, emailConsentAt: consentAt, emailConsentSource: `potential-client:${lead.source}` } });
      await tx.clientCommunicationConsent.create({ data: { clientProfileId: profile.id, channel: MarketingChannel.EMAIL, action: MarketingConsentAction.OPTED_IN, source: `potential-client:${lead.source}`, recordedAt: consentAt } });
    }
  }
  await tx.potentialClient.updateMany({ where: matchWhere, data: { ownerId: input.ownerId, convertedAt: new Date() } });
}

export async function listPotentialClients(input: { search?: string; limit: number; cursor?: string }) {
  const search = input.search?.trim();
  const rows = await prisma.potentialClient.findMany({
    where: {
      convertedAt: null,
      ...(search ? { OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search } },
        { sourceLabel: { contains: search, mode: "insensitive" } }
      ] } : {})
    },
    take: input.limit + 1,
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
  const hasMore = rows.length > input.limit;
  const data = hasMore ? rows.slice(0, input.limit) : rows;
  const emails = [...new Set(data.flatMap((row) => row.normalizedEmail ? [row.normalizedEmail] : []))];
  const emailHashes = emails.map(hashEmail);
  const suppressions = await prisma.marketingEmailSuppression.findMany({ where: { emailHash: { in: emailHashes } }, select: { emailHash: true } });
  const suppressed = new Set(suppressions.map((entry) => entry.emailHash));
  const profiles = await prisma.clientProfile.findMany({
    where: { owner: { email: { in: emails, mode: "insensitive" } } },
    select: { emailMarketingStatus: true, owner: { select: { email: true } } }
  });
  const profileStatusByEmail = new Map(profiles.flatMap((profile) => profile.owner.email ? [[profile.owner.email.toLowerCase(), profile.emailMarketingStatus] as const] : []));
  return {
    data: data.map(({ id, source, sourceLabel, firstName, lastName, email, phoneNumber, emailMarketingOptIn, emailMarketingConfirmed, emailConsentAt, createdAt }) => ({
      id, source, sourceLabel, firstName, lastName, email, phoneNumber,
      emailMarketingStatus: email && (suppressed.has(hashEmail(email)) || profileStatusByEmail.get(email.toLowerCase()) === MarketingConsentStatus.SUPPRESSED)
        ? MarketingConsentStatus.SUPPRESSED
        : email && profileStatusByEmail.get(email.toLowerCase()) === MarketingConsentStatus.UNSUBSCRIBED
          ? MarketingConsentStatus.UNSUBSCRIBED
          : emailMarketingOptIn
            ? emailMarketingConfirmed ? MarketingConsentStatus.SUBSCRIBED : "PENDING_CONFIRMATION"
            : MarketingConsentStatus.NOT_SUBSCRIBED,
      emailConsentAt, createdAt
    })),
    nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
  };
}

export async function confirmPotentialClientEmail(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email) return 0;
  const result = await prisma.potentialClient.updateMany({
    where: { normalizedEmail: email, emailMarketingOptIn: true, convertedAt: null },
    data: { emailMarketingConfirmed: true, emailConsentAt: new Date() }
  });
  return result.count;
}

export async function confirmPotentialClientById(id: string) {
  const record = await prisma.potentialClient.findUnique({ where: { id } });
  if (!record || !record.emailMarketingOptIn || !record.email) return null;
  return prisma.potentialClient.update({
    where: { id },
    data: { emailMarketingConfirmed: true, emailConsentAt: record.emailConsentAt ?? new Date() }
  });
}
