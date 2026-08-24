import { delay, http, HttpResponse } from "msw";

import { MAX_UPLOAD_BYTES } from "@/lib/api";
import type { Analysis } from "@/lib/types";
import { DEMO_ANALYSES } from "@/mocks/data";

/**
 * 개발용 목 서버. 백엔드가 준비되면 NEXT_PUBLIC_API_MOCKING 을 끄기만 하면
 * 화면 코드는 그대로 실제 서버를 보게 된다.
 */

/** 서버 메모리 대신 쓰는 인메모리 목록 (실제 API 도 DB 없이 이렇게 동작한다) */
const store: Analysis[] = [...DEMO_ANALYSES];

/** 실제 분석 소요 시간을 흉내 낸다 — 로딩 UI 를 제대로 확인하기 위해 */
const FAKE_ANALYSIS_MS = 2500;

function apiError(
  status: number,
  code: string,
  message: string,
  stage: string | null = null,
) {
  return HttpResponse.json({ error: { code, message, stage } }, { status });
}

/** 업로드된 파일에서 네 가지 조합 중 하나를 골라 응답을 만든다 */
function buildAnalysis(file: File): Analysis {
  const template = DEMO_ANALYSES[store.length % DEMO_ANALYSES.length];

  return {
    ...template,
    analysis_id: crypto.randomUUID(),
    received_at: new Date().toISOString(),
    elapsed_seconds: Number((FAKE_ANALYSIS_MS / 1000).toFixed(2)),
    file: {
      ...template.file,
      name: file.name,
      size: file.size,
    },
  };
}

export const handlers = [
  http.get("*/api/v1/health", () =>
    HttpResponse.json({
      status: "ok",
      pipeline: "ready",
      running: 0,
      max_concurrent: 2,
    }),
  ),

  http.get("*/api/v1/events", ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
    return HttpResponse.json({
      events: store.slice(0, limit),
      count: store.length,
    });
  }),

  http.delete("*/api/v1/events/:analysisId", ({ params }) => {
    const { analysisId } = params;
    const index = store.findIndex((a) => a.analysis_id === analysisId);

    if (index === -1) {
      return apiError(404, "EVENT_NOT_FOUND", "이미 삭제된 이벤트입니다.");
    }

    store.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/v1/analyze", async ({ request }) => {
    const form = await request.formData();
    const entries = form.getAll("file");

    if (entries.length === 0) {
      return apiError(400, "NO_FILE", "분석할 파일을 선택해 주세요.", "upload");
    }
    if (entries.length > 1) {
      return apiError(
        400,
        "MULTIPLE_FILES",
        "파일은 한 번에 하나만 분석할 수 있습니다.",
        "upload",
      );
    }

    const file = entries[0];
    if (!(file instanceof File)) {
      return apiError(400, "NO_FILE", "분석할 파일을 선택해 주세요.", "upload");
    }
    if (file.size === 0) {
      return apiError(400, "EMPTY_FILE", "빈 파일은 분석할 수 없습니다.", "upload");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError(
        413,
        "FILE_TOO_LARGE",
        "파일이 너무 큽니다. 200 MB 이하만 업로드할 수 있습니다.",
        "upload",
      );
    }

    await delay(FAKE_ANALYSIS_MS);

    const analysis = buildAnalysis(file);
    store.unshift(analysis);
    return HttpResponse.json(analysis);
  }),
];
