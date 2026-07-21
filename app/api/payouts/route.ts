import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { createPayoutTx, processPayoutTx, completePayoutTx, failPayoutTx } from "@/lib/server/financial/payout";

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const body = await readJsonBody(request) as Record<string, unknown>;
    const action = (body?.action as string) ?? "create";

    if (action === "create") {
      const result = await prisma.$transaction((tx) =>
        createPayoutTx(tx, {
          allocationId: body.allocationId as string,
          distributionId: body.distributionId as string,
          investorId: actor.id,
          amount: body.amount as number,
        }),
      );
      return new Response(JSON.stringify(result), {
        status: result.alreadyProcessed ? 200 : 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (action === "process") {
      const result = await prisma.$transaction((tx) =>
        processPayoutTx(tx, body.payoutId as string),
      );
      return new Response(JSON.stringify(result), {
        status: result.alreadyProcessed ? 200 : 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (action === "complete") {
      const result = await prisma.$transaction((tx) =>
        completePayoutTx(tx, body.payoutId as string, actor.id),
      );
      return new Response(JSON.stringify(result), {
        status: result.alreadyProcessed ? 200 : 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (action === "fail") {
      const result = await prisma.$transaction((tx) =>
        failPayoutTx(tx, body.payoutId as string, (body.error as string) ?? "Manual failure"),
      );
      return new Response(JSON.stringify(result), {
        status: result.alreadyProcessed ? 200 : 201,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action", code: "INVALID_ACTION" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}