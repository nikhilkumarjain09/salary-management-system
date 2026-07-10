import { NextRequest, NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  let dbStatus = "unknown";
  let esStatus = "unknown";
  let errorDetail: any = null;

  // 1. Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err: any) {
    dbStatus = "disconnected";
    errorDetail = { ...errorDetail, db: err.message || err };
  }

  // 2. Check Elasticsearch connectivity
  const esUrl = process.env.ELASTICSEARCH_URL;
  if (!esUrl) {
    esStatus = "not_configured";
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
      esStatus = ping ? "connected" : "disconnected";
    } catch (err: any) {
      esStatus = "disconnected";
      errorDetail = { ...errorDetail, es: err.message || err };
    }
  }

  const status =
    dbStatus === "connected" &&
    (esStatus === "connected" || esStatus === "not_configured")
      ? 200
      : 500;

  return NextResponse.json(
    {
      status: status === 200 ? "healthy" : "unhealthy",
      database: dbStatus,
      elasticsearch: esStatus,
      errors: errorDetail,
    },
    { status },
  );
}
