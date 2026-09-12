import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { giveawayCampaignUpdateSchema, giveawayEntrySchema } from "../validators/wellnessGiveawaySchemas";
import { drawGiveawayWinner, getGiveawayCampaign, getPublicGiveawayCampaign, listGiveawayEntries, redeemGiveawayCode, submitGiveawayEntry, updateGiveawayCampaign } from "../services/wellnessGiveawayService";
import { writeStaffAuditLog } from "../services/staffAuditService";

export const getPublicGiveaway = asyncHandler(async (_req: Request, res: Response) => { res.json(await getPublicGiveawayCampaign()); });
export const submitPublicGiveaway = asyncHandler(async (req: Request, res: Response) => { const result = await submitGiveawayEntry(giveawayEntrySchema.parse(req.body)); res.status(201).json(result); });
export const getAdminGiveaway = asyncHandler(async (_req: Request, res: Response) => { res.json(await getGiveawayCampaign()); });
export const updateAdminGiveaway = asyncHandler(async (req: Request, res: Response) => { const result = await updateGiveawayCampaign(giveawayCampaignUpdateSchema.parse(req.body)); await writeStaffAuditLog({ action: "WELLNESS_GIVEAWAY_UPDATED", actorId: req.staffUser!.id, resourceType: "WELLNESS_GIVEAWAY", resourceId: result.id, metadata: { published: result.isPublished, raffleEnabled: result.raffleEnabled } }); res.json(result); });
export const listAdminGiveawayEntries = asyncHandler(async (req: Request, res: Response) => { const result = await listGiveawayEntries(typeof req.query.search === "string" ? req.query.search : undefined); await writeStaffAuditLog({ action: "WELLNESS_GIVEAWAY_ENTRIES_VIEWED", actorId: req.staffUser!.id, resourceType: "WELLNESS_GIVEAWAY" }); res.json(result); });
export const redeemAdminGiveawayCode = asyncHandler(async (req: Request, res: Response) => { const result = await redeemGiveawayCode(String(req.body.code ?? "").trim()); await writeStaffAuditLog({ action: "WELLNESS_GIVEAWAY_CODE_REDEEMED", actorId: req.staffUser!.id, resourceType: "WELLNESS_GIVEAWAY_ENTRY", resourceId: result.id }); res.json(result); });
export const drawAdminGiveawayWinner = asyncHandler(async (req: Request, res: Response) => { const result = await drawGiveawayWinner(); await writeStaffAuditLog({ action: "WELLNESS_GIVEAWAY_WINNER_DRAWN", actorId: req.staffUser!.id, resourceType: "WELLNESS_GIVEAWAY", resourceId: result.id }); res.json(result); });
