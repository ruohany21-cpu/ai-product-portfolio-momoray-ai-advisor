export type CozeClientOptions = {
  token?: string;
  workflowId?: string;
  botId?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};


export type CozeConversationResult = {
  output: string;
  conversationId?: string;
};

console.log(
  "Current workflow id:",
  process.env.NEXT_PUBLIC_COZE_WORKFLOW_ID,
);


export class CozeWorkflowError extends Error {
  constructor(message = "Workflow request failed") {
    super(message);
    this.name = "CozeWorkflowError";
  }
}


export class CozeConfigurationError extends Error {
  constructor() {
    super("Coze client configuration is missing");
    this.name = "CozeConfigurationError";
  }
}


/**
 * 调用 Coze Workflow
 */
export async function runCozeConversation(
  input: string,
  conversationId?: string,
  options: CozeClientOptions = {}
): Promise<CozeConversationResult> {

  const token =
    options.token ?? process.env.NEXT_PUBLIC_COZE_API_TOKEN;

  const workflowId =
    options.workflowId ?? process.env.NEXT_PUBLIC_COZE_WORKFLOW_ID;

  const fetchImpl =
    options.fetchImpl ?? fetch;


  if (!token || !workflowId) {
    throw new CozeConfigurationError();
  }


  /**
   * Coze Workflow API 参数
   */
  const body = {
    workflow_id: workflowId,
    parameters: {
      CONVERSATION_NAME: "Default",
      USER_INPUT: input,
      input: "",
    },
    additional_messages: [{
      content: input,
      content_type: "text",
      role: "user",
    }],
    ...(conversationId ? { conversation_id: conversationId } : {}),
  };


  try {
    const url = "https://api.coze.cn/v1/workflows/chat";

    console.info("[Coze] request", { url });
    console.info("[Coze] request body", body);

    const response = await fetchImpl(
      url,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),

        signal:
          options.signal ??
          AbortSignal.timeout(90000),
      }
    );

    const responseText = await response.text();

    console.error("[Coze] response", {
      url,
      status: response.status,
      body: responseText,
    });


    /**
     * 调试 Coze 返回错误
     */
    if (!response.ok) {
      throw new CozeWorkflowError(
        `Coze API failed: ${response.status}`
      );
    }


    const jsonResult = parseJsonResult(responseText);
    if (jsonResult) return jsonResult;

    const events = parseSseEvents(responseText);
    const conversation = events.find((event) =>
      typeof event.data?.conversation_id === "string")?.data?.conversation_id;
    const output = events.find((event) =>
      event.event === "conversation.message.completed" &&
      event.data?.role === "assistant" &&
      event.data?.type === "answer")?.data?.content;

    if (events.some((event) => event.event === "error" || event.event === "conversation.chat.failed") || !output) {

      throw new CozeWorkflowError(
        "Coze returned empty output"
      );

    }


    return {

      output: String(output),

      conversationId:
        typeof conversation === "string"
          ? conversation
          : undefined,
    };


  } catch(error) {


    if (
      error instanceof CozeConfigurationError
    ) {
      throw error;
    }


    if (
      error instanceof CozeWorkflowError
    ) {
      throw error;
    }


    console.log(
      "======== COZE UNKNOWN ERROR ========",
      error
    );


    throw new CozeWorkflowError();

  }

}

type SseEvent = { event: string; data: Record<string, unknown> };

function parseSseEvents(text: string): SseEvent[] {
  return text.split(/\n\n+/).flatMap((block) => {
    const event = block.match(/^event:\s*(.+)$/m)?.[1];
    const data = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!event || !data) return [];
    try {
      const parsed: unknown = JSON.parse(data);
      return typeof parsed === "object" && parsed !== null
        ? [{ event, data: parsed as Record<string, unknown> }]
        : [];
    } catch {
      return [];
    }
  });
}

function parseJsonResult(text: string): CozeConversationResult | null {
  try {
    const payload: any = JSON.parse(text);
    const data = typeof payload?.data === "string"
      ? JSON.parse(payload.data)
      : payload?.data ?? payload;
    const output = data?.output;
    if (!output) return null;
    return {
      output: typeof output === "string" ? output : JSON.stringify(output),
      conversationId: typeof data?.conversationId === "string"
        ? data.conversationId
        : typeof data?.conversation_id === "string"
          ? data.conversation_id
        : typeof payload?.conversation_id === "string"
          ? payload.conversation_id
          : undefined,
    };
  } catch {
    return null;
  }
}
