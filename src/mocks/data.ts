import type { Analysis } from "@/lib/types";

/**
 * 개발용 데모 데이터. Stage1 × Stage2 의 네 가지 조합을 모두 덮는다.
 * 백엔드에서 실제 응답 JSON 샘플을 받으면 이 파일을 교체한다.
 */

export const DEMO_ANALYSES: Analysis[] = [
  /* MATCH + MALWARE */
  {
    analysis_id: "9f2c1b7e-4a03-4c5d-9e11-6b8f0d2a7c34",
    received_at: "2026-08-19T16:27:00+09:00",
    elapsed_seconds: 6.42,
    file: {
      name: "sample.zip",
      sha256:
        "c0ccc5933cd3846aa5d4f05c25ab69ba9930709fa3c26f8b580a04c510aa038e",
      size: 185856,
      format: "PE",
      source: "zip",
      depth: 1,
      inner_path: "/tmp/umv_mbzip_r6w2n657/payload.exe",
    },
    stage1: {
      status: "MATCH",
      scan_ms: 1385,
      matched_rules: [
        {
          name: "SIGNATURE_BASE_SUSP_Imphash_Mar23_3",
          namespace: "default",
          tags: ["FILE"],
        },
      ],
      error: null,
    },
    stage2: {
      status: "MALWARE",
      prob: 0.999843,
      threshold: 0.5,
      inference_seconds: 0.035,
      error: null,
    },
    verdict: { decision: "MALWARE", action_taken: "Terminated" },
  },

  /* NO_MATCH + MALWARE — AI 단독 탐지 */
  {
    analysis_id: "2b7d4e91-8c15-4f02-a3d7-1e5c9b0f7a28",
    received_at: "2026-08-19T15:04:12+09:00",
    elapsed_seconds: 5.88,
    file: {
      name: "update.zip",
      sha256:
        "7b1af204e8d5c1937a04b6f2d8e0c53991a7f4b6c2d80e19f37a5c6b93cc17e5",
      size: 274432,
      format: "PE",
      source: "zip",
      depth: 1,
      inner_path: "/tmp/umv_mbzip_k38dq1zp/payload.exe",
    },
    stage1: {
      status: "NO_MATCH",
      scan_ms: 1120,
      matched_rules: [],
      error: null,
    },
    stage2: {
      status: "MALWARE",
      prob: 0.997612,
      threshold: 0.5,
      inference_seconds: 0.041,
      error: null,
    },
    verdict: { decision: "MALWARE", action_taken: "Terminated" },
  },

  /* MATCH + BENIGN — 시그니처만 반응 */
  {
    analysis_id: "5e0a3c62-7b48-4d91-8f26-c4a17d3e9b50",
    received_at: "2026-08-19T11:48:39+09:00",
    elapsed_seconds: 4.31,
    file: {
      name: "installer.zip",
      sha256:
        "a41e88bcf03d27ac9b155e6a1d4c807be3925f18ac06d4b7e91c3d5a52fd0a73",
      size: 96256,
      format: "PE",
      source: "zip",
      depth: 1,
      inner_path: "/tmp/umv_mbzip_x9plm42v/payload.exe",
    },
    stage1: {
      status: "MATCH",
      scan_ms: 942,
      matched_rules: [
        {
          name: "SIGNATURE_BASE_SUSP_Packer_UPX",
          namespace: "default",
          tags: ["FILE"],
        },
      ],
      error: null,
    },
    stage2: {
      status: "BENIGN",
      prob: 0.123047,
      threshold: 0.5,
      inference_seconds: 0.029,
      error: null,
    },
    verdict: { decision: "BENIGN", action_taken: "Terminated" },
  },

  /* NO_MATCH + BENIGN — 정상 */
  {
    analysis_id: "c83f5a10-2d6b-4e73-9a04-8f1b6c2d5e97",
    received_at: "2026-08-19T09:12:05+09:00",
    elapsed_seconds: 3.94,
    file: {
      name: "report.zip",
      sha256:
        "3d907fe1c62b84af0d31e7593ac8b0f24d6e1179a3025cb8ef4761d9b8c4a260",
      size: 51200,
      format: "PE",
      source: "zip",
      depth: 1,
      inner_path: "/tmp/umv_mbzip_t2hs8w0e/payload.exe",
    },
    stage1: {
      status: "NO_MATCH",
      scan_ms: 806,
      matched_rules: [],
      error: null,
    },
    stage2: {
      status: "BENIGN",
      prob: 0.031285,
      threshold: 0.5,
      inference_seconds: 0.022,
      error: null,
    },
    verdict: { decision: "BENIGN", action_taken: "Terminated" },
  },
];
