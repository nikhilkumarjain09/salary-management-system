import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { convertToUSD } from "@/lib/currency";

// Shape 1: Average Pay by Dimension
async function queryAvgPay(
  dimension: "department" | "country" | "level",
  filterValue?: string,
) {
  if (filterValue) {
    const raw = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT e."${dimension}" as name, AVG(s."baseAmountUSD") as avgPay
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      WHERE e."isActive" = true AND LOWER(e."${dimension}") = LOWER($1)
      GROUP BY e."${dimension}"
    `,
      filterValue,
    );
    return raw.map((r) => ({
      name: r.name,
      averagePayUSD: Number(r.avgPay.toFixed(0)),
    }));
  } else {
    const raw = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT e."${dimension}" as name, AVG(s."baseAmountUSD") as avgPay
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      WHERE e."isActive" = true
      GROUP BY e."${dimension}"
      ORDER BY avgPay DESC
    `,
    );
    return raw.map((r) => ({
      name: r.name,
      averagePayUSD: Number(r.avgPay.toFixed(0)),
    }));
  }
}

// Shape 2: Headcount and Cost Trend
async function queryHeadcountTrend(limitMonths: number = 12) {
  const monthsLimit = Math.max(1, Math.min(24, limitMonths));
  const isPostgres = process.env.DATABASE_URL?.startsWith("postgres") || false;
  let raw: any[] = [];

  if (isPostgres) {
    raw = await prisma.$queryRawUnsafe<any[]>(
      `
      WITH months AS (
        SELECT (generate_series(
          date_trunc('month', current_date) - ($1 - 1) * INTERVAL '1 month',
          date_trunc('month', current_date),
          INTERVAL '1 month'
        ))::date as date
      )
      SELECT 
        to_char(m.date, 'YYYY-MM-DD') as month,
        (
          SELECT SUM(s."baseAmountUSD") 
          FROM "SalaryRecord" s
          INNER JOIN "Employee" e ON s."employeeId" = e.id
          WHERE s."effectiveDate" <= (m.date + INTERVAL '1 month' - INTERVAL '1 day')::date
            AND e."isActive" = true
            AND NOT EXISTS (
              SELECT 1 FROM "SalaryRecord" s2
              WHERE s2."employeeId" = s."employeeId"
                AND s2."effectiveDate" <= (m.date + INTERVAL '1 month' - INTERVAL '1 day')::date
                AND s2."effectiveDate" > s."effectiveDate"
            )
        ) as "totalCost",
        (
          SELECT COUNT(e.id)
          FROM "Employee" e
          WHERE e."startDate" <= (m.date + INTERVAL '1 month' - INTERVAL '1 day')::date
            AND e."isActive" = true
        ) as headcount
      FROM months m
    `,
      monthsLimit,
    );
  } else {
    raw = await prisma.$queryRawUnsafe<any[]>(
      `
      WITH RECURSIVE months(date) AS (
        SELECT date('now', 'start of month', '-' || ($1 - 1) || ' months')
        UNION ALL
        SELECT date(date, '+1 month')
        FROM months
        WHERE date < date('now', 'start of month')
      )
      SELECT 
        m.date as month,
        (
          SELECT SUM(s."baseAmountUSD") 
          FROM "SalaryRecord" s
          INNER JOIN "Employee" e ON s."employeeId" = e.id
          WHERE s."effectiveDate" <= date(m.date, '+1 month', '-1 day')
            AND e."isActive" = 1
            AND NOT EXISTS (
              SELECT 1 FROM "SalaryRecord" s2
              WHERE s2."employeeId" = s."employeeId"
                AND s2."effectiveDate" <= date(m.date, '+1 month', '-1 day')
                AND s2."effectiveDate" > s."effectiveDate"
            )
        ) as totalCost,
        (
          SELECT COUNT(e.id)
          FROM "Employee" e
          WHERE e."startDate" <= date(m.date, '+1 month', '-1 day')
            AND e."isActive" = 1
        ) as headcount
      FROM months m
    `,
      monthsLimit,
    );
  }

  return raw.map((r) => ({
    month: new Date(r.month).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    headcount: Number(r.headcount),
    costUSD: Number((r.totalCost || 0).toFixed(0)),
  }));
}

// Shape 3: Pay Gap / Equity Spread
async function queryPayGap(department?: string, level?: string) {
  let query = `
    WITH CountryAverages AS (
      SELECT 
        e."department",
        e."level",
        e."country",
        AVG(s."baseAmountUSD") as avgPay
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      WHERE e."isActive" = true
  `;
  const params: any[] = [];
  let paramIdx = 1;
  if (department) {
    query += ` AND LOWER(e."department") = LOWER($${paramIdx++}) `;
    params.push(department);
  }
  if (level) {
    query += ` AND LOWER(e."level") = LOWER($${paramIdx++}) `;
    params.push(level);
  }

  query += `
      GROUP BY e."department", e."level", e."country"
    )
    SELECT 
      department,
      level,
      MIN(avgPay) as minCountryPay,
      MAX(avgPay) as maxCountryPay,
      (MAX(avgPay) - MIN(avgPay)) as absoluteSpread,
      (MAX(avgPay) / MIN(avgPay)) as ratioSpread
    FROM CountryAverages
    GROUP BY department, level
    ORDER BY ratioSpread DESC
  `;

  const raw = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  return raw.map((r) => ({
    department: r.department,
    level: r.level,
    minPayUSD: Number(r.minCountryPay.toFixed(0)),
    maxPayUSD: Number(r.maxCountryPay.toFixed(0)),
    spreadUSD: Number(r.absoluteSpread.toFixed(0)),
    ratio: Number(r.ratioSpread.toFixed(2)),
    flagged: r.ratioSpread > 1.25,
  }));
}

// Shape 4: Compa-Ratio Outliers
async function queryCompaOutliers(
  type: "underpaid" | "premium" | "all" = "all",
) {
  let condition = "1=1";
  if (type === "underpaid") {
    condition = '(s."baseAmount" / b."midAmount") < 0.8';
  } else if (type === "premium") {
    condition = '(s."baseAmount" / b."midAmount") > 1.2';
  } else {
    condition =
      '((s."baseAmount" / b."midAmount") < 0.8 OR (s."baseAmount" / b."midAmount") > 1.2)';
  }

  const raw = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      e."id",
      e."name",
      e."employeeCode",
      e."department",
      e."level",
      e."country",
      s."baseAmount",
      s."currency",
      (s."baseAmount" / b."midAmount") as compaRatio
    FROM "SalaryRecord" s
    INNER JOIN (
      SELECT "employeeId", MAX("effectiveDate") as maxDate
      FROM "SalaryRecord"
      GROUP BY "employeeId"
    ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
    INNER JOIN "Employee" e ON s."employeeId" = e.id
    INNER JOIN "CompensationBand" b ON e."department" = b."department" AND e."level" = b."level" AND e."country" = b."country"
    WHERE e."isActive" = true AND b."midAmount" > 0 AND ${condition}
    ORDER BY compaRatio ASC
    LIMIT 10
  `);

  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    employeeCode: r.employeeCode,
    department: r.department,
    level: r.level,
    country: r.country,
    baseAmount: r.baseAmount,
    currency: r.currency,
    compaRatio: Number((r.compaRatio * 100).toFixed(1)),
  }));
}

// POST /api/pay-query - Handles natural language analysis via classification shapes
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY environment variable is not configured. Please add GROQ_API_KEY to your .env file to activate the natural language pay query assistant.",
      },
      { status: 500 },
    );
  }

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "A valid question string is required." },
        { status: 400 },
      );
    }

    // 1. Classification Call to Groq
    const classificationResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a natural language query classifier for a pay database. Classify the user's question into one of the four defined shapes, and output its arguments in JSON format. If it does not map to any, return shape null.

Shapes definitions:
1. shape: 'avg_pay_by_dimension'
   - Questions asking about average/median pay by department, country, or level.
   - Parameters:
     - 'dimension': 'department' | 'country' | 'level'
     - 'filterValue': string (optional, e.g. 'Engineering' or 'IN')
2. shape: 'headcount_cost_trend'
   - Questions about monthly headcount cost trend, budget history, or cost trajectory.
   - Parameters:
     - 'limitMonths': number (optional, default 12)
3. shape: 'pay_gap_by_dimension'
   - Questions about pay spreads, global wage gaps, or pay variance across countries.
   - Parameters:
     - 'department': string (optional)
     - 'level': string (optional)
4. shape: 'compa_ratio_outliers'
   - Questions about compa-ratio details, overpaid/underpaid/premium outliers.
   - Parameters:
     - 'type': 'underpaid' | 'premium' | 'all'

Output Scheme:
Return ONLY a valid JSON object matching:
{
  "shape": "avg_pay_by_dimension" | "headcount_cost_trend" | "pay_gap_by_dimension" | "compa_ratio_outliers" | null,
  "parameters": {}
}`,
            },
            { role: "user", content: question },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!classificationResponse.ok) {
      const errTxt = await classificationResponse.text();
      throw new Error(`Groq classification request failed: ${errTxt}`);
    }

    const classData = await classificationResponse.json();
    const parsed = JSON.parse(classData.choices[0]?.message?.content || "{}");

    const shape = parsed.shape;
    const params = parsed.parameters || {};

    if (!shape) {
      return NextResponse.json({
        error:
          "I couldn't map your question to a supported pay analytics metric. Try asking queries like:\n- 'Show me the average pay by department'\n- 'Are there any compa-ratio outliers?'\n- 'What is the headcount cost trend over the last 12 months?'\n- 'Analyze pay gaps in engineering'",
      });
    }

    // 2. Execute corresponding safe parameter query
    let queryResult: any = null;
    if (shape === "avg_pay_by_dimension") {
      const dimension = params.dimension || "department";
      if (!["department", "country", "level"].includes(dimension)) {
        return NextResponse.json(
          { error: "Invalid query dimension parameter." },
          { status: 400 },
        );
      }
      queryResult = await queryAvgPay(
        dimension as any,
        params.filterValue,
      );
    } else if (shape === "headcount_cost_trend") {
      const limitMonths = parseInt(String(params.limitMonths || "12"), 10);
      queryResult = await queryHeadcountTrend(isNaN(limitMonths) ? 12 : limitMonths);
    } else if (shape === "pay_gap_by_dimension") {
      queryResult = await queryPayGap(params.department, params.level);
    } else if (shape === "compa_ratio_outliers") {
      const type = params.type || "all";
      if (!["underpaid", "premium", "all"].includes(type)) {
        return NextResponse.json(
          { error: "Invalid compa outlier type parameter." },
          { status: 400 },
        );
      }
      queryResult = await queryCompaOutliers(type as any);
    }

    // 3. Grounded Answer Generation Call to Groq
    const generationResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are an expert HR compensation data analyst. Formulate a clear, brief (1-3 sentences) summary answer based strictly on the provided query result facts. You MUST visibly state the relevant numbers, percentages, or averages. If the query result is empty, clearly state no matches found.",
            },
            {
              role: "user",
              content: `User Question: "${question}"\nDatabase Query Result Data: ${JSON.stringify(queryResult)}`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
        }),
      },
    );

    if (!generationResponse.ok) {
      const errTxt = await generationResponse.text();
      throw new Error(`Groq generation request failed: ${errTxt}`);
    }

    const genData = await generationResponse.json();
    const answer = genData.choices[0]?.message?.content || "";

    return NextResponse.json({
      answer,
      queryResult,
      shape,
      parameters: params,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal query error";
    console.error("Pay query API error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
