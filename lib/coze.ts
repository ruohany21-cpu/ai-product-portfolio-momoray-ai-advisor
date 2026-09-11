export type CozeClientOptions = {
  token?: string;
  workflowId?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

type SuccessfulCozePayload = {
  code: 0;
  data: string;
};

type WorkflowOutput = {
  output: string;
};

export class CozeWorkflowError extends Error {
  constructor() {
    super("Workflow request failed");
    this.name = "CozeWorkflowError";
  }
}

export class CozeConfigurationError extends Error {
  constructor() {
    super("Coze server configuration is missing");
    this.name = "CozeConfigurationError";
  }
}

export async function runCozeWorkflow(
  input: string,
  options: CozeClientOptions = {},
): Promise<string> {
  const token = options.token ?? process.env.COZE_API_TOKEN;
  const workflowId = options.workflowId ?? process.env.COZE_WORKFLOW_ID;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!token || !workflowId) {
    throw new CozeConfigurationError();
  }

  try {
    const response = await fetchImpl("https://api.coze.cn/v1/workflow/run", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        parameters: { input },
      }),
      signal: options.signal ?? AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new CozeWorkflowError();
    }

    const payload: unknown = await response.json();
    if (!isSuccessfulCozePayload(payload)) {
      throw new CozeWorkflowError();
    }

    const data: unknown = JSON.parse(payload.data);
    if (!hasWorkflowOutput(data)) {
      throw new CozeWorkflowError();
    }

    return data.output;
  } catch {
    throw new CozeWorkflowError();
  }
}

function isSuccessfulCozePayload(
  payload: unknown,
): payload is SuccessfulCozePayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    payload.code === 0 &&
    "data" in payload &&
    typeof payload.data === "string"
  );
}

function hasWorkflowOutput(data: unknown): data is WorkflowOutput {
  return (
    typeof data === "object" &&
    data !== null &&
    "output" in data &&
    typeof data.output === "string" &&
    data.output.trim().length > 0
  );
}
