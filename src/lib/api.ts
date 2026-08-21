import {
  AnalysisSchema,
  ApiErrorSchema,
  EventsResponseSchema,
  HealthSchema,
  type Analysis,
  type EventsResponse,
  type Health,
} from "@/lib/types";

/**
 * API 호출 계층. 응답은 전부 Zod 로 검증한 뒤 넘긴다.
 * 서버가 필드를 바꾸면 화면에서 undefined 로 터지는 대신 여기서 잡힌다.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** 업로드 상한. 백엔드 Nginx client_max_body_size 와 맞춰야 한다. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export class ApiError extends Error {
  readonly code: string;
  readonly stage: string | null;
  readonly status: number;

  constructor(
    status: number,
    code: string,
    message: string,
    stage: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.stage = stage;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError(
      response.status,
      "UNKNOWN",
      `요청이 실패했습니다. (HTTP ${response.status})`,
    );
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError(
      response.status,
      "UNKNOWN",
      `요청이 실패했습니다. (HTTP ${response.status})`,
    );
  }

  const { code, message, stage } = parsed.data.error;
  return new ApiError(response.status, code, message, stage);
}

export async function analyzeFile(file: File): Promise<Analysis> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) throw await toApiError(response);

  return AnalysisSchema.parse(await response.json());
}

export async function fetchEvents(limit = 50): Promise<EventsResponse> {
  const response = await fetch(`${API_BASE}/api/v1/events?limit=${limit}`);
  if (!response.ok) throw await toApiError(response);

  return EventsResponseSchema.parse(await response.json());
}

export async function fetchHealth(): Promise<Health> {
  const response = await fetch(`${API_BASE}/api/v1/health`);
  if (!response.ok) throw await toApiError(response);

  return HealthSchema.parse(await response.json());
}

export const queryKeys = {
  events: (limit: number) => ["events", limit] as const,
  health: () => ["health"] as const,
};
