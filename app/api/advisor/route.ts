import { NextResponse } from "next/server";
import { CozeConfigurationError, runCozeWorkflow } from "@/lib/coze";

const FAILURE_MESSAGE = "Workflow request failed. Please try again.";
const CONCISE_REPLY_INSTRUCTION =
  "[回复要求]\n请直接回答用户，不要复述分析过程或已确认信息。先用一句话给出结论，必要时补充不超过3条短建议。总长度控制在180个中文字符以内，避免大段文字。";

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
    const output = await runCozeWorkflow(
      `${input}\n\n${CONCISE_REPLY_INSTRUCTION}`,
    );
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
