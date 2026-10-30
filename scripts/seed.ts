import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const existing = await db.organization.findUnique({
    where: { id: "rise-demo" },
  });
  if (existing) {
    console.log("Demo workspace already exists; no data changed.");
    return;
  }
  await db.organization.create({
    data: {
      id: "rise-demo",
      name: "Rise Digital · Demo",
      isDemo: true,
      clients: {
        create: [
          {
            companyName: "Fjord & Form Studio",
            contactPerson: "Emma Solberg",
            email: "emma@example.com",
            phone: "+47 900 00 001",
            status: "ACTIVE",
            tags: "Design, Website",
            summary:
              "Demo client: independent interior design studio in Oslo. Preparing a refreshed website and a clearer service offering.",
          },
          {
            companyName: "Nordlys Kaffebar",
            contactPerson: "Jonas Berg",
            email: "jonas@example.com",
            phone: "+47 900 00 002",
            status: "ACTIVE",
            tags: "Hospitality, Local SEO",
            summary:
              "Demo client: neighborhood coffee shop exploring local search visibility and a website refresh.",
          },
          {
            companyName: "Bergen Byggpartner",
            contactPerson: "Ingrid Hansen",
            email: "ingrid@example.com",
            status: "LEAD",
            tags: "Construction, Discovery",
            summary:
              "Demo lead: arrange a discovery session to understand the company’s digital goals.",
          },
          {
            companyName: "Vest Studio",
            contactPerson: "Oliver Dahl",
            email: "oliver@example.com",
            status: "ON_HOLD",
            tags: "Creative, Branding",
            summary:
              "Demo client: awaiting updated brand material before planning the next project.",
          },
        ],
      },
      activities: {
        create: {
          message: "Created isolated demo workspace with four sample clients",
        },
      },
    },
  });
  console.log(
    "Demo workspace created. Sign in and open Settings to switch. Your real workspace was not modified.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
