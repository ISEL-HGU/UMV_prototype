/* =============================================================
 * UMV Prototype - Mock Data
 * 백엔드 연동 전 데모 데이터. 화면 항목이 바뀌면 이 파일만 수정.
 *
 * [컬럼 규칙]
 *  TIME             데모 데이터
 *  COMPUTER         분석 대상 PC 정보 없음 → 데모 데이터
 *  INFECTED FILE(S) 압축 해제 경로 (/tmp/umv_mbzip_XXXXXXXX/payload.exe)
 *  MALWARE          stage1 / stage2 결과로 자동 조합 (app.js: formatMalware)
 *                     MATCH    + MALWARE → YARA:<rule_name> / AI:MALWARE 99.8%
 *                     NO_MATCH + MALWARE → YARA:NO_MATCH     / AI:MALWARE 99.8%
 *                     MATCH    + BENIGN  → YARA:<rule_name> / AI:BENIGN 12.3%
 *                     NO_MATCH + BENIGN  → YARA:NO_MATCH     / AI:BENIGN 3.1%
 *  SCAN TYPE        'static' 고정
 *  ACTION TAKEN     'Terminated' 고정
 *
 * [상세 모달]
 *  stage1 = UMV STAGE 1 - YARA-X ANALYSIS 리포트
 *  stage2 = FEATURE BASED - HOST INFERENCE REPORT 리포트
 *  파일명(zip/exe)은 sha256 에서 자동 생성 → <sha256>.zip / <sha256>.exe
 * ============================================================= */

const SCAN_TYPE_FIXED    = 'static';     /* 고정값 */
const ACTION_TAKEN_FIXED = 'Terminated'; /* 고정값 */
const MAJOR_VIRUS_TYPE_FIXED = 'Unauthorized Change'; /* 고정값 (스크린샷 기준) */

const MOCK_COMPUTER = {
  name: 'SEC-FIN-WEB0',
  fullName: 'SEC-FIN-WEB01 (Win7 ×64)',
  platform: 'Win7 ×64',
};

/* 이벤트 1건 = 목록 1행 + 상세 모달 1개
 * 아래 4건은 Stage1 × Stage2 의 4가지 조합을 모두 보여주는 데모 세트 */
const MOCK_EVENTS = [
  /* ---- 1) MATCH + MALWARE : CLI 리포트 실제 출력값 ---- */
  {
    id: 'evt-0001',
    time: 'Aug 19, 2026 16:27:00',
    computer: 'SEC-FIN-WEB01',
    platform: 'Win7 ×64',
    infectedFile: '/tmp/umv_mbzip_r6w2n657/payload.exe',
    scanType: SCAN_TYPE_FIXED,
    actionTaken: ACTION_TAKEN_FIXED,
    majorVirusType: MAJOR_VIRUS_TYPE_FIXED,
    highlighted: true,

    origin: 'Agent (UMV Hybrid Engine)',
    detectionTime: '2026-08-19 16:27:00 KST',
    sha256: 'c0ccc5933cd3846aa5d4f05c25ab69ba9930709fa3c26f8b580a04c510aa038e',
    format: 'PE',
    size: 185856,
    depth: 'zip→exe (depth 1)',

    /* UMV STAGE 1 - YARA-X ANALYSIS */
    stage1: {
      status: 'MATCH',
      scanMs: 1385,
      matchedRules: [
        { name: 'SIGNATURE_BASE_SUSP_Imphash_Mar23_3', tags: ['FILE'] },
      ],
    },

    /* FEATURE BASED - HOST INFERENCE REPORT
     * featureSet / model 은 내부 구현 정보라 화면에는 표시하지 않는다. */
    stage2: {
      status: 'MALWARE',
      featureSet: 'ember_v3_2568',
      model: 'pe_lgbm.model',
      prob: 0.999843,
      threshold: 0.50,
      inferenceSec: 0.035,
    },

    insight: '압축 해제 후 실행된 파일에서 의심스러운 악성코드 시그니처(Imphash) 및 비정상적 PE 구조 등 고위험 요소가 식별되었고, 다단계 앙상블 분석 결과 악성 확률 99.98%로 최종 판정되어 해당 프로세스를 즉시 차단 및 격리했습니다.',
    tags: [
      { name: 'UMV-Hybrid', color: 'blue' },
      { name: 'YARA-MATCH', color: 'amber' },
      { name: 'AI-MALWARE', color: 'red' },
      { name: 'Auto-Quarantined', color: 'gray' },
    ],
  },

  /* ---- 2) NO_MATCH + MALWARE (AI 단독 탐지) ---- */
  {
    id: 'evt-0002',
    time: 'Aug 19, 2026 15:04:12',
    computer: 'SEC-FIN-WEB02',
    platform: 'Win10 ×64',
    infectedFile: '/tmp/umv_mbzip_k38dq1zp/payload.exe',
    scanType: SCAN_TYPE_FIXED,
    actionTaken: ACTION_TAKEN_FIXED,
    majorVirusType: MAJOR_VIRUS_TYPE_FIXED,
    highlighted: false,

    origin: 'Agent (UMV Hybrid Engine)',
    detectionTime: '2026-08-19 15:04:12 KST',
    sha256: '7b1af204e8d5c1937a04b6f2d8e0c53991a7f4b6c2d80e19f37a5c6b93cc17e5',
    format: 'PE',
    size: 274432,
    depth: 'zip→exe (depth 1)',

    stage1: {
      status: 'NO_MATCH',
      scanMs: 1120,
      matchedRules: [],
    },
    stage2: {
      status: 'MALWARE',
      featureSet: 'ember_v3_2568',
      model: 'pe_lgbm.model',
      prob: 0.997612,
      threshold: 0.50,
      inferenceSec: 0.041,
    },

    insight: '알려진 YARA 시그니처와는 일치하지 않았으나(NO_MATCH), 정적 특징 기반 AI 추론에서 악성 확률 99.76%로 판정되었습니다. 시그니처 미등록 신종/변종으로 추정되며 프로세스를 차단 및 격리했습니다.',
    tags: [
      { name: 'UMV-Hybrid', color: 'blue' },
      { name: 'YARA-NO_MATCH', color: 'gray' },
      { name: 'AI-MALWARE', color: 'red' },
    ],
  },

  /* ---- 3) MATCH + BENIGN (시그니처만 반응) ---- */
  {
    id: 'evt-0003',
    time: 'Aug 19, 2026 11:48:39',
    computer: 'SEC-FIN-WEB01',
    platform: 'Win7 ×64',
    infectedFile: '/tmp/umv_mbzip_x9plm42v/payload.exe',
    scanType: SCAN_TYPE_FIXED,
    actionTaken: ACTION_TAKEN_FIXED,
    majorVirusType: MAJOR_VIRUS_TYPE_FIXED,
    highlighted: false,

    origin: 'Agent (UMV Hybrid Engine)',
    detectionTime: '2026-08-19 11:48:39 KST',
    sha256: 'a41e88bcf03d27ac9b155e6a1d4c807be3925f18ac06d4b7e91c3d5a52fd0a73',
    format: 'PE',
    size: 96256,
    depth: 'zip→exe (depth 1)',

    stage1: {
      status: 'MATCH',
      scanMs: 942,
      matchedRules: [
        { name: 'SIGNATURE_BASE_SUSP_Packer_UPX', tags: ['FILE'] },
      ],
    },
    stage2: {
      status: 'BENIGN',
      featureSet: 'ember_v3_2568',
      model: 'pe_lgbm.model',
      prob: 0.123047,
      threshold: 0.50,
      inferenceSec: 0.029,
    },

    insight: 'UPX 패커 사용 흔적으로 YARA 룰에 일치했으나(MATCH), AI 추론 결과 악성 확률 12.30%로 임계값(0.50) 미만이어서 정상으로 판정되었습니다. 패킹 자체는 정상 소프트웨어에서도 사용되므로 오탐 가능성이 높습니다.',
    tags: [
      { name: 'UMV-Hybrid', color: 'blue' },
      { name: 'YARA-MATCH', color: 'amber' },
      { name: 'AI-BENIGN', color: 'gray' },
    ],
  },

  /* ---- 4) NO_MATCH + BENIGN (정상) ---- */
  {
    id: 'evt-0004',
    time: 'Aug 19, 2026 09:12:05',
    computer: 'SEC-FIN-WEB03',
    platform: 'Win10 ×64',
    infectedFile: '/tmp/umv_mbzip_t2hs8w0e/payload.exe',
    scanType: SCAN_TYPE_FIXED,
    actionTaken: ACTION_TAKEN_FIXED,
    majorVirusType: MAJOR_VIRUS_TYPE_FIXED,
    highlighted: false,

    origin: 'Agent (UMV Hybrid Engine)',
    detectionTime: '2026-08-19 09:12:05 KST',
    sha256: '3d907fe1c62b84af0d31e7593ac8b0f24d6e1179a3025cb8ef4761d9b8c4a260',
    format: 'PE',
    size: 51200,
    depth: 'zip→exe (depth 1)',

    stage1: {
      status: 'NO_MATCH',
      scanMs: 806,
      matchedRules: [],
    },
    stage2: {
      status: 'BENIGN',
      featureSet: 'ember_v3_2568',
      model: 'pe_lgbm.model',
      prob: 0.031285,
      threshold: 0.50,
      inferenceSec: 0.022,
    },

    insight: 'YARA 시그니처 불일치(NO_MATCH), AI 추론 악성 확률 3.12%로 두 단계 모두 위험 요소가 확인되지 않아 정상으로 판정되었습니다.',
    tags: [
      { name: 'UMV-Hybrid', color: 'blue' },
      { name: 'YARA-NO_MATCH', color: 'gray' },
      { name: 'AI-BENIGN', color: 'gray' },
    ],
  },
];

/* 목록 상단 필터 옵션 */
const MOCK_FILTERS = {
  period: ['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'Custom Range...'],
  computers: ['All Computers', 'SEC-FIN-WEB01 (Win7 ×64)', 'SEC-FIN-WEB02 (Win10 ×64)', 'SEC-FIN-WEB03 (Win10 ×64)'],
  scope: ['All', 'Malware', 'Benign'],
  grouping: ['No Grouping', 'Group by Computer', 'Group by Malware'],
};

/* 좌측 네비게이션 */
const MOCK_NAV = [
  { id: 'overview',   label: 'Overview',             icon: 'overview' },
  { id: 'malware',    label: 'Malware Detection',    icon: 'malware', active: true },
  { id: 'integrity',  label: 'Integrity Monitoring', icon: 'monitor' },
  { id: 'loginspect', label: 'Log Inspection',       icon: 'search' },
  { id: 'settings',   label: 'Settings',             icon: 'settings' },
  { id: 'updates',    label: 'Updates',              icon: 'clock' },
  { id: 'overrides',  label: 'Overrides',            icon: 'shuffle' },
];

/* 상단 탭 */
const MOCK_TABS = [
  { id: 'general',    label: 'General' },
  { id: 'smart',      label: 'Smart Protection' },
  { id: 'advanced',   label: 'Advanced' },
  { id: 'quarantine', label: 'Quarantined Files' },
  { id: 'events',     label: 'Events', active: true },
];
