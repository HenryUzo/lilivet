import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";

const wellnessPlanInclude = {
  benefits: {
    orderBy: {
      sortOrder: "asc"
    }
  }
} as const;

export async function listWellnessPlans() {
  return prisma.wellnessPlan.findMany({
    include: wellnessPlanInclude,
    orderBy: {
      planKey: "asc"
    }
  });
}

export async function getWellnessPlan(id: string) {
  const wellnessPlan = await prisma.wellnessPlan.findUnique({
    where: { id },
    include: wellnessPlanInclude
  });

  if (!wellnessPlan) {
    throw new HttpError(404, "Wellness plan not found");
  }

  return wellnessPlan;
}

export async function getWellnessPlanByKey(planKey: string) {
  const wellnessPlan = await prisma.wellnessPlan.findUnique({
    where: { planKey },
    include: wellnessPlanInclude
  });

  if (!wellnessPlan) {
    throw new HttpError(404, "Wellness plan not found");
  }

  return wellnessPlan;
}
