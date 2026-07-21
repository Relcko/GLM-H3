import { prisma } from "@/lib/server/prisma";
import { assertInternalRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { runDailyReconciliationJob } from "@/lib/server/financial/jobs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertInternalRequest(request);

    const result = await prisma.$transaction((tx) =>
      runDailyReconciliationJob(tx),
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}