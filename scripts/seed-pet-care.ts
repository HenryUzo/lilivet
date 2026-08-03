import {
  PetCarePublishingStatus,
  PetCareReviewStatus,
  Prisma,
  PrismaClient
} from "@prisma/client";
import seedData from "../prisma/pet-care-seed-data.json";

const prisma = new PrismaClient();

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function main() {
  const reviewerIds = new Map<string, string>();

  for (const reviewer of seedData.reviewers) {
    const record = await prisma.petCareReviewer.upsert({
      where: { slug: reviewer.id },
      update: {
        name: reviewer.name,
        credentials: reviewer.credentials,
        role: reviewer.role,
        photoUrl: reviewer.photoFile,
        shortBio: reviewer.shortBio,
        isActive: reviewer.active
      },
      create: {
        slug: reviewer.id,
        name: reviewer.name,
        credentials: reviewer.credentials,
        role: reviewer.role,
        photoUrl: reviewer.photoFile,
        shortBio: reviewer.shortBio,
        isActive: reviewer.active
      }
    });
    reviewerIds.set(reviewer.id, record.id);
  }

  const categoryLabels = new Map(seedData.categories.map((category) => [category.slug, category.label]));

  for (const article of seedData.articles) {
    const reviewedAt = new Date(article.reviewedAt);
    const reviewDueAt = new Date(reviewedAt);
    reviewDueAt.setFullYear(reviewDueAt.getFullYear() + 1);
    const data = {
      title: article.title,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      excerpt: article.excerpt,
      summary: article.summary,
      categorySlug: article.categorySlug,
      categoryLabel: categoryLabels.get(article.categorySlug) ?? article.categorySlug,
      tags: article.tags,
      heroImageUrl: null,
      heroImageKey: article.heroImageKey,
      heroImageFile: article.heroImageFile,
      heroImageAlt: article.heroImageAlt,
      authorName: seedData.author.name,
      authorRole: seedData.author.role,
      reviewerId: reviewerIds.get(article.reviewerId) ?? null,
      status: PetCarePublishingStatus.PUBLISHED,
      reviewStatus: PetCareReviewStatus.MEDICALLY_REVIEWED,
      reviewedAt,
      reviewDueAt,
      publishedAt: new Date(article.publishedAt),
      readingTimeMinutes: article.readingTimeMinutes,
      relatedService: asJson(article.relatedService),
      relatedArticleSlugs: article.relatedArticleSlugs,
      featured: article.featured,
      seasonal: article.seasonal,
      popular: article.popular,
      keyTakeaways: asJson(article.keyTakeaways),
      monitorAtHome: asJson(article.monitorAtHome),
      warningCallout: article.warningCallout,
      vetQuote: article.vetQuote,
      faqs: asJson(article.faqs),
      references: asJson(article.references),
      sections: asJson(article.sections),
      approvedAt: reviewedAt,
      archivedAt: null
    } satisfies Prisma.PetCareArticleUncheckedUpdateInput;

    await prisma.petCareArticle.upsert({
      where: { slug: article.slug },
      update: data,
      create: { slug: article.slug, ...data } as Prisma.PetCareArticleUncheckedCreateInput
    });
  }

  console.log(`Seeded ${seedData.articles.length} Pet Care articles and ${seedData.reviewers.length} reviewers.`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
