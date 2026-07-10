import { Client } from "@elastic/elasticsearch";
import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("-----------------------------------------");
  console.log("HEALTH CHECK RUNNER:");
  console.log("-----------------------------------------");

  // 1. Check Database
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database:      CONNECTED");
  } catch (err: any) {
    console.error("Database:      DISCONNECTED");
    console.error(`Reason:        ${err.message || err}`);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Check Elasticsearch
  const esUrl = process.env.ELASTICSEARCH_URL;
  if (!esUrl) {
    console.log("Elasticsearch: NOT CONFIGURED (Optional)");
  } else {
    try {
      const username = process.env.ELASTICSEARCH_USERNAME;
      const password = process.env.ELASTICSEARCH_PASSWORD;
      const client = new Client({
        node: esUrl,
        auth: username && password ? { username, password } : undefined,
        maxRetries: 1,
        requestTimeout: 3000,
      });
      const ping = await client.ping();
      if (ping) {
        console.log("Elasticsearch: CONNECTED");
      } else {
        console.log("Elasticsearch: DISCONNECTED (Ping failed)");
      }
    } catch (err: any) {
      console.error("Elasticsearch: DISCONNECTED");
      console.error(`Reason:        ${err.message || err}`);
    }
  }
  console.log("-----------------------------------------");
}

main();
