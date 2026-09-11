import { NextResponse } from "next/server";
import { CozeConfigurationError, runCozeWorkflow } from "@/lib/coze";

const FAILURE_MESSAGE = "Workflow request failed. Please try again.";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return failureResponse(400);
  }

  const input = readInput(body);
  if (!input) {
    return failureResponse(400);
  }

  try {
    const output = await runCozeWorkflow(input);
    return NextResponse.json({ output });
  } catch (error) {
    if (error instanceof CozeConfigurationError) {
      return failureResponse(500);
    }

    return failureResponse(502);
  }
}

function failureResponse(status: number) {
  return NextResponse.json({ error: FAILURE_MESSAGE }, { status });
}

function readInput(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("input" in body)) {
    return null;
  }

  if (typeof body.input !== "string") {
    return null;
  }

  const input = body.input.trim();
  return input.length > 0 && input.length <= 2_000 ? input : null;
}
