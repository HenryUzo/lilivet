import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma/client";

let server: ReturnType<typeof app.listen>;

async function start() {
  const startedAt = Date.now();
  await prisma.$connect();
  console.log(`Prisma connected in ${Date.now() - startedAt}ms`);

  server = app.listen(env.PORT, () => {
    console.log(`Lili Vet backend listening on port ${env.PORT}`);
  });
}

const shutdown = async () => {
  if (!server) {
    await prisma.$disconnect();
    process.exit(0);
    return;
  }

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch(async (error) => {
  console.error("Failed to start backend", error);
  await prisma.$disconnect();
  process.exit(1);
});
