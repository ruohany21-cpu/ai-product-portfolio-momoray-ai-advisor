export type CozeClientOptions = {
  token?: string;
  workflowId?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};


export type CozeConversationResult = {
  output: string;
  conversationId?: string;
};


export class CozeWorkflowError extends Error {
  constructor(message = "Workflow request failed") {
    super(message);
    this.name = "CozeWorkflowError";
  }
}


export class CozeConfigurationError extends Error {
  constructor() {
    super("Coze server configuration is missing");
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
    options.token ?? process.env.COZE_API_TOKEN;

  const workflowId =
    options.workflowId ?? process.env.COZE_WORKFLOW_ID;


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
      input: input,
    },

    ...(conversationId
      ? {
          conversation_id: conversationId,
        }
      : {}),
  };


  try {

    const response = await fetchImpl(
      "https://api.coze.cn/v1/workflow/run",
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


    /**
     * 调试 Coze 返回错误
     */
    if (!response.ok) {

      const errorText =
        await response.text();


      console.log(
        "======== COZE API ERROR ========",
        response.status,
        errorText
      );


      throw new CozeWorkflowError(
        `Coze API failed: ${response.status}`
      );
    }


    const data =
      await response.json();


    console.log(
      "======== COZE SUCCESS ========",
      JSON.stringify(data)
    );


    /**
     * Workflow 返回结构：
     *
     * data:
     * {
     *   output:"xxx"
     * }
     *
     */


    const output =
      data?.data?.output ??
      data?.output ??
      "";


    const conversation =
      data?.data?.conversation_id ??
      data?.conversation_id;


    if (!output) {

      throw new CozeWorkflowError(
        "Coze returned empty output"
      );

    }


    return {

      output:
        typeof output === "string"
          ? output
          : JSON.stringify(output),

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