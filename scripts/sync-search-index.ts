import { Client } from "@elastic/elasticsearch";
import { prisma } from "../lib/prisma";

async function main() {
  const esUrl = process.env.ELASTICSEARCH_URL;
  if (!esUrl) {
    console.error(
      "ERROR: ELASTICSEARCH_URL is not configured in the environment.",
    );
    process.exit(1);
  }

  const username = process.env.ELASTICSEARCH_USERNAME;
  const password = process.env.ELASTICSEARCH_PASSWORD;

  const esClient = new Client({
    node: esUrl,
    auth: username && password ? { username, password } : undefined,
  });

  console.log(`[Sync] Connecting to Elasticsearch at: ${esUrl}`);

  // 1. Ensure index exists and analyzer mappings are defined
  const indexExists = await esClient.indices.exists({ index: "employees" });
  if (!indexExists) {
    console.log(
      "[Sync] Index 'employees' does not exist. Creating it with autocomplete configuration...",
    );
    await esClient.indices.create({
      index: "employees",
      settings: {
        analysis: {
          analyzer: {
            autocomplete_analyzer: {
              type: "custom",
              tokenizer: "autocomplete_tokenizer",
              filter: ["lowercase"],
            },
          },
          tokenizer: {
            autocomplete_tokenizer: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 10,
              token_chars: ["letter", "digit"],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: "keyword" },
          employeeCode: {
            type: "text",
            analyzer: "autocomplete_analyzer",
            fields: { raw: { type: "keyword" } },
          },
          name: {
            type: "text",
            analyzer: "autocomplete_analyzer",
            fields: { raw: { type: "keyword" } },
          },
          department: {
            type: "text",
            fields: { raw: { type: "keyword" } },
          },
          level: { type: "keyword" },
          country: { type: "keyword" },
          isActive: { type: "boolean" },
          startDate: { type: "date" },
        },
      },
    });
    console.log("[Sync] Index 'employees' successfully created.");
  }

  // 2. Fetch all employees in chunks
  let skip = 0;
  const take = 1000;
  let totalIndexed = 0;

  console.log("[Sync] Querying and indexing employees in batches...");

  while (true) {
    const employees = await prisma.employee.findMany({
      skip,
      take,
      select: {
        id: true,
        employeeCode: true,
        name: true,
        department: true,
        level: true,
        country: true,
        isActive: true,
        startDate: true,
      },
    });

    if (employees.length === 0) {
      break;
    }

    // Construct bulk indexing operations
    // Note: To make the sync idempotent, we set document _id explicitly to employee.id.
    // If the document is already present, this will update it in-place rather than duplicating it.
    const operations = employees.flatMap((emp) => [
      { index: { _index: "employees", _id: emp.id } },
      {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        department: emp.department,
        level: emp.level,
        country: emp.country,
        isActive: emp.isActive,
        startDate: emp.startDate.toISOString(), // Ensure standard ISO format for date matching
      },
    ]);

    const res = await esClient.bulk({ refresh: true, operations });

    if (res.errors) {
      console.error(
        `[Sync] Warning: some bulk errors occurred in batch offset ${skip}`,
      );
    }

    totalIndexed += employees.length;
    console.log(
      `[Sync] Indexed batch of ${employees.length} employees (Total: ${totalIndexed})...`,
    );

    skip += take;
  }

  console.log(
    `[Sync] Success! Completed bulk sync. Indexed exactly ${totalIndexed} employees.`,
  );
}

main()
  .catch((err) => {
    console.error("FATAL: Sync process failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
