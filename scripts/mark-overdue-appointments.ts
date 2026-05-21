import { prisma } from "../src/prisma/client";
import { markOverdueAppointments } from "../src/services/appointmentRequestService";

async function main() {
  await prisma.$connect();
  const count = await markOverdueAppointments();
  console.log(`Marked ${count} appointment(s) as overdue.`);
}

main()
  .catch((error) => {
    console.error("Failed to mark overdue appointments", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
