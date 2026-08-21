# UMV Prototype — Malware Detection Console

UMV Hybrid Engine 악성코드 탐지 결과를 보여주는 관리 콘솔 UI 프로토타입.
**백엔드 연동 없이 데모 데이터로 동작하는 정적 웹페이지**입니다.

## 실행

별도 빌드나 서버 없이 HTML 파일을 브라우저로 열면 됩니다.

## 화면

업로드 화면과 대시보드는 **서로 독립된 페이지**입니다.

| 페이지 | 화면 | 설명 |
|---|---|---|
| `upload.html` | Upload a file | 파일 드래그&드롭 업로드 (단독 화면) |
| `index.html` | Malware Detection Events | 탐지 이벤트 목록. 검색 / All·Malware·Benign 필터 |
| `index.html` | Detection Details | 행 클릭 시 상세 모달. General / Tags 탭 |

`upload.html` 에서 **Upload file** 을 누르면 (백엔드가 없으므로) 분석 완료를
가정하고 `index.html` 대시보드로 이동합니다.

## 이벤트 목록 컬럼

| 컬럼 | 값 |
|---|---|
| TIME | 데모 데이터 |
| COMPUTER | 데모 데이터 (분석 대상 PC 정보 없음) |
| INFECTED FILE(S) | 압축 해제 경로 `/tmp/umv_mbzip_XXXXXXXX/payload.exe` |
| MALWARE | Stage1 / Stage2 결과로 자동 조합 |
| SCAN TYPE | `static` 고정 |
| ACTION TAKEN | `Terminated` 고정 |
| MAJOR VIRUS TYPE | `Unauthorized Change` 고정 |

### MALWARE 컬럼 조합 규칙

| Stage1 | Stage2 | 표시 |
|---|---|---|
| MATCH | MALWARE | `YARA:<rule_name> / AI:MALWARE 99.9%` |
| NO_MATCH | MALWARE | `YARA:NO_MATCH / AI:MALWARE 99.7%` |
| MATCH | BENIGN | `YARA:<rule_name> / AI:BENIGN 12.3%` |
| NO_MATCH | BENIGN | `YARA:NO_MATCH / AI:BENIGN 3.1%` |

퍼센트는 **악성 확률**이며, `0.999843` 이 `100.0%` 로 보이지 않도록 내림 처리합니다.

## 상세 모달

CLI 리포트 원문과 동일한 항목·순서로 표시합니다.

- **Stage 1** `UMV STAGE 1 - YARA-X ANALYSIS`
  Input / Rule matches / Scan time / Matched Rules / [RESULT]
- **Stage 2** `FEATURE BASED - HOST INFERENCE REPORT`
  Input / Inner file / Format / Subject size / Subject SHA256 / Feature set /
  Model used / Malware prob / Threshold / Inference time / [RESULT] ==>

## 구조

```
index.html              대시보드 — 콘솔 셸 + 탐지 상세 모달
upload.html             업로드 화면 — 대시보드와 분리된 독립 페이지
assets/css/style.css    전체 스타일 (색상은 :root 변수)
assets/js/mock-data.js  데모 데이터 — 값 수정은 이 파일만
assets/js/icons.js      인라인 SVG 아이콘 (외부 CDN 없음)
assets/js/app.js        대시보드 렌더링 + 모달/탭/검색 로직
assets/js/upload.js     업로드 화면 로직
```

데이터를 바꾸려면 [`assets/js/mock-data.js`](assets/js/mock-data.js) 의
`MOCK_EVENTS` 만 수정하면 목록과 상세 모달에 함께 반영됩니다.
