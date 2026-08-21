import type { Analysis } from "@/lib/types";

/**
 * 판정 표기 규칙. 서버는 원본 값만 내려주고 표시 문자열은 여기서 만든다.
 * 프레임워크에 의존하지 않는 순수 함수라 그대로 단위 테스트 대상이 된다.
 */

/** 목록 SCAN TYPE 열 고정값 */
export const SCAN_TYPE = "static";

/** 목록 MAJOR VIRUS TYPE 열 고정값 */
export const MAJOR_VIRUS_TYPE = "Unauthorized Change";

/**
 * 악성 확률을 백분율 문자열로. 반올림하면 0.999843 이 "100.0%" 가 되어
 * 오해를 부르므로 내림 처리한다.
 */
export function probToPercent(prob: number | null, digits = 1): string {
  if (prob === null) return "—";
  const factor = 10 ** (digits + 2);
  return `${(Math.floor(prob * factor) / 10 ** digits).toFixed(digits)}%`;
}

/** sha256 축약 표기: c0ccc593...10aa038e */
export function shortHash(sha256: string): string {
  if (sha256.length <= 16) return sha256;
  return `${sha256.slice(0, 8)}...${sha256.slice(-8)}`;
}

/** MATCH → "YARA:<rule_name>" / 그 외 → "YARA:NO_MATCH" */
export function formatYara(analysis: Analysis): string {
  const { status, matched_rules } = analysis.stage1;
  if (status === "MATCH" && matched_rules.length > 0) {
    return `YARA:${matched_rules[0].name}`;
  }
  if (status === "ERROR") return "YARA:ERROR";
  return "YARA:NO_MATCH";
}

/** "AI:MALWARE 99.9%" / "AI:BENIGN 12.3%" */
export function formatAi(analysis: Analysis): string {
  const { status, prob } = analysis.stage2;
  if (status === "ERROR") return "AI:ERROR";
  return `AI:${status} ${probToPercent(prob)}`;
}

/** 목록 MALWARE 열 최종 문자열 */
export function formatMalwareCell(analysis: Analysis): string {
  return `${formatYara(analysis)} / ${formatAi(analysis)}`;
}

export type SeverityTone = "malware" | "suspicious" | "benign" | "unknown";

/** 악성=빨강, YARA 만 반응=주황(의심), 정상=초록, 그 외=회색 */
export function severityTone(analysis: Analysis): SeverityTone {
  if (analysis.stage2.status === "MALWARE") return "malware";
  if (analysis.stage2.status === "UNDECIDED") return "suspicious";
  if (analysis.stage2.status === "ERROR") return "unknown";
  if (analysis.stage1.status === "MATCH") return "suspicious";
  if (analysis.stage2.status === "BENIGN") return "benign";
  return "unknown";
}

export function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString()} bytes`;
}

/** 화면 표시용 시각. 서버가 보낸 오프셋을 그대로 존중한다. */
export function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** <sha256>.zip / <sha256>.exe 형태의 파이프라인 산출물 이름 */
export function archiveName(analysis: Analysis): string {
  return `${analysis.file.sha256}.zip`;
}

export function innerFileName(analysis: Analysis): string {
  const ext = analysis.file.format === "ELF" ? "" : ".exe";
  return `${analysis.file.sha256}${ext}`;
}

/** "zip→exe (depth 1)" / "direct" */
export function sourceLabel(analysis: Analysis): string {
  const { source, depth, format } = analysis.file;
  if (source === "direct") return "direct";
  return `zip→${format.toLowerCase()} (depth ${depth})`;
}
