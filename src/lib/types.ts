import { z } from "zod";

/**
 * API 응답 스키마. docs/API.md 의 정의를 그대로 옮긴 것.
 *
 * 백엔드가 FastAPI 로 확정되면 /openapi.json 에서 타입을 자동 생성하고
 * 이 파일은 런타임 검증 전용으로 남긴다.
 */

export const Stage1StatusSchema = z.enum([
  "MATCH",
  "NO_MATCH",
  "ERROR",
  "SKIPPED",
]);

export const Stage2StatusSchema = z.enum([
  "MALWARE",
  "BENIGN",
  "UNDECIDED",
  "ERROR",
  "SKIPPED",
]);

export const DecisionSchema = z.enum(["MALWARE", "BENIGN", "UNDECIDED"]);

export const FileFormatSchema = z.enum([
  "PE",
  "ELF",
  "PDF",
  "WORD",
  "EXCEL",
  "UNKNOWN",
]);

export const MatchedRuleSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  tags: z.array(z.string()),
});

export const FileInfoSchema = z.object({
  name: z.string(),
  sha256: z.string(),
  size: z.number().int().nonnegative(),
  format: FileFormatSchema,
  /** direct = 파일 직접, zip = 압축 해제 후 */
  source: z.enum(["direct", "zip"]),
  depth: z.number().int().nonnegative(),
  /** 분석 시점의 추출 경로. 목록의 INFECTED FILE(S) 열에 표시된다 */
  inner_path: z.string(),
});

export const Stage1Schema = z.object({
  status: Stage1StatusSchema,
  scan_ms: z.number().nonnegative(),
  matched_rules: z.array(MatchedRuleSchema),
  error: z.string().nullable(),
});

export const Stage2Schema = z.object({
  status: Stage2StatusSchema,
  /** 악성 확률 0.0 ~ 1.0. 원본 정밀도 그대로 */
  prob: z.number().min(0).max(1).nullable(),
  threshold: z.number(),
  inference_seconds: z.number().nonnegative(),
  error: z.string().nullable(),
});

export const VerdictSchema = z.object({
  decision: DecisionSchema,
  action_taken: z.string(),
});

export const AnalysisSchema = z.object({
  analysis_id: z.string(),
  /** ISO 8601. 타임존 오프셋 포함 */
  received_at: z.string(),
  elapsed_seconds: z.number().nonnegative(),
  file: FileInfoSchema,
  stage1: Stage1Schema,
  stage2: Stage2Schema,
  verdict: VerdictSchema,
});

export const EventsResponseSchema = z.object({
  events: z.array(AnalysisSchema),
  count: z.number().int().nonnegative(),
});

export const HealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  pipeline: z.enum(["ready", "unavailable"]),
  running: z.number().int().nonnegative(),
  max_concurrent: z.number().int().positive(),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    /** 사용자에게 그대로 보여줄 문장 */
    message: z.string(),
    stage: z.string().nullable(),
    detail: z.string().nullable().optional(),
  }),
});

export type Stage1Status = z.infer<typeof Stage1StatusSchema>;
export type Stage2Status = z.infer<typeof Stage2StatusSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type FileFormat = z.infer<typeof FileFormatSchema>;
export type MatchedRule = z.infer<typeof MatchedRuleSchema>;
export type FileInfo = z.infer<typeof FileInfoSchema>;
export type Stage1 = z.infer<typeof Stage1Schema>;
export type Stage2 = z.infer<typeof Stage2Schema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type EventsResponse = z.infer<typeof EventsResponseSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
