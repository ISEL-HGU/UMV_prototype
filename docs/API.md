# UMV API 명세 (MVP)

프론트엔드와 샌드박스 서버 사이의 통신 규약.
**DB 없음.** 업로드 → 파이프라인 실행 → 결과 반환까지를 한 요청으로 처리한다.

- 작성일: 2026-08-21
- 대상: `bin/predict.sh` 기반 분석 파이프라인
- Base URL: `/api/v1`

---

## 1. 동작 방식

```
브라우저 ──POST /api/v1/analyze (multipart)──▶ FastAPI
                                                 │ 파일을 임시 경로에 저장
                                                 ▼
                                            worker: bin/predict.sh
                                                 │ Stage 1 → Stage 2
                                                 ▼
                                            결과 JSON 읽어 변환
브라우저 ◀──────── 200 + 분석 결과 전문 ────────┘
```

분석이 끝날 때까지 응답이 지연되는 **동기 방식**이다.
job id도, 폴링도, DB도 없다. 프론트는 요청을 보내고 로딩 상태를 표시하다가
응답이 오면 바로 화면에 뿌린다.

### 왜 동기인가

분석 1건이 수 초 규모라 폴링 구조를 만들 이유가 없다.
단계별 진행 표시가 필요해지면 [9. 확장](#9-확장-단계별-진행-표시가-필요해지면)의 SSE 방식으로 바꾼다.

### 서버 설정 주의

동기 방식이라 요청이 오래 열려 있다. 아래 타임아웃을 분석 최대 소요 시간보다 길게 잡는다.

| 위치 | 설정 | 권장 |
|---|---|---|
| Nginx | `proxy_read_timeout` | 180s |
| Nginx | `client_max_body_size` | 200m |
| Uvicorn | `--timeout-keep-alive` | 180 |

---

## 2. 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/v1/analyze` | 파일 업로드 및 분석. 결과를 그대로 반환 |
| `GET` | `/api/v1/events` | 서버가 메모리에 들고 있는 최근 분석 결과 목록 |
| `DELETE` | `/api/v1/events/{analysis_id}` | 이벤트 한 건 삭제 |
| `GET` | `/api/v1/health` | 서버와 파이프라인 상태 확인 |

---

## 3. POST /api/v1/analyze

파일 하나를 업로드하고 분석 결과를 받는다.

### 요청

```
POST /api/v1/analyze
Content-Type: multipart/form-data
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `file` | file | 예 | 분석할 파일 **1개**. 여러 개를 보내면 `400` |

> 파이프라인이 파일 하나만 받으므로 프론트의 `input[type=file]`에서
> `multiple` 속성을 제거해야 한다.

### 응답 `200 OK`

```json
{
  "analysis_id": "9f2c1b7e-4a03-4c5d-9e11-6b8f0d2a7c34",
  "received_at": "2026-08-21T16:27:00+09:00",
  "elapsed_seconds": 6.42,

  "file": {
    "name": "sample.zip",
    "sha256": "c0ccc5933cd3846aa5d4f05c25ab69ba9930709fa3c26f8b580a04c510aa038e",
    "size": 185856,
    "format": "PE",
    "source": "zip",
    "depth": 1,
    "inner_path": "/tmp/umv_mbzip_r6w2n657/payload.exe"
  },

  "stage1": {
    "status": "MATCH",
    "scan_ms": 1385,
    "matched_rules": [
      {
        "name": "SIGNATURE_BASE_SUSP_Imphash_Mar23_3",
        "namespace": "default",
        "tags": ["FILE"]
      }
    ],
    "error": null
  },

  "stage2": {
    "status": "MALWARE",
    "prob": 0.999843,
    "threshold": 0.5,
    "inference_seconds": 0.035,
    "error": null
  },

  "verdict": {
    "decision": "MALWARE",
    "action_taken": "Terminated"
  }
}
```

### 필드 정의

#### 최상위

| 필드 | 타입 | 설명 |
|---|---|---|
| `analysis_id` | string (UUID) | 요청 식별자. 로그 추적용이며 저장되지 않는다 |
| `received_at` | string (ISO 8601) | 서버가 파일을 받은 시각. 오프셋 포함 |
| `elapsed_seconds` | number | 업로드 수신부터 결과 생성까지 총 소요 시간 |

#### `file`

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | string | 업로드된 원본 파일명 |
| `sha256` | string | 실제 분석 대상(압축 내부 파일)의 SHA-256 |
| `size` | integer | 분석 대상 크기 (바이트) |
| `format` | string | `PE` \| `ELF` \| `PDF` \| `WORD` \| `EXCEL` \| `UNKNOWN` |
| `source` | string | `direct`(파일 직접) \| `zip`(압축 해제 후) |
| `depth` | integer | 압축 해제 깊이. `direct`면 `0` |
| `inner_path` | string | 분석 시점의 추출 경로. 화면 `INFECTED FILE(S)` 열에 표시 |

#### `stage1` — YARA 시그니처

| 필드 | 타입 | 설명 |
|---|---|---|
| `status` | string | `MATCH` \| `NO_MATCH` \| `ERROR` \| `SKIPPED` |
| `scan_ms` | integer | 스캔 소요 시간 (밀리초) |
| `matched_rules` | array | 일치한 룰 목록. `NO_MATCH`면 빈 배열 |
| `matched_rules[].name` | string | 룰 이름 |
| `matched_rules[].namespace` | string | 룰 네임스페이스 |
| `matched_rules[].tags` | string[] | 룰 태그 |
| `error` | string \| null | `status`가 `ERROR`일 때만 값이 있다 |

#### `stage2` — AI 추론

| 필드 | 타입 | 설명 |
|---|---|---|
| `status` | string | `MALWARE` \| `BENIGN` \| `UNDECIDED` \| `ERROR` \| `SKIPPED` |
| `prob` | number \| null | **악성 확률** `0.0`~`1.0`. 원본 정밀도 그대로 |
| `threshold` | number | 판정 임계값. 기본 `0.5` |
| `inference_seconds` | number | 추론 소요 시간 |
| `error` | string \| null | `status`가 `ERROR`일 때만 값이 있다 |

> `UNDECIDED`는 문서 파일 앙상블에서 세 모델의 판정이 갈린 경우다.
> 이때 `prob`는 세 확률 중 최댓값이다.

#### `verdict` — 최종 판정

| 필드 | 타입 | 설명 |
|---|---|---|
| `decision` | string | `MALWARE` \| `BENIGN` \| `UNDECIDED` |
| `action_taken` | string | 조치 결과. 현재는 `Terminated` 고정 |

---

## 4. 화면 항목 매핑

프론트가 응답을 어떻게 쓰는지에 대한 참고. **서버는 표시용 문자열을 만들지 않는다.**

### 이벤트 목록

| 화면 열 | 사용 필드 |
|---|---|
| `TIME` | `received_at` |
| `COMPUTER` | (서버 정보 없음 — 프론트 고정값) |
| `INFECTED FILE(S)` | `file.inner_path` |
| `MALWARE` | `stage1` + `stage2`를 프론트에서 조합 (아래) |
| `SCAN TYPE` | 고정 `static` |
| `ACTION TAKEN` | `verdict.action_taken` |
| `MAJOR VIRUS TYPE` | 고정 `Unauthorized Change` |

`MALWARE` 열 조합 규칙:

```
stage1.status === "MATCH"
  ? "YARA:" + stage1.matched_rules[0].name
  : "YARA:NO_MATCH"
+ " / "
+ "AI:" + stage2.status + " " + 확률백분율(stage2.prob)
```

확률은 **내림** 처리한다. `0.999843`을 반올림하면 `100.0%`가 되어 오해를 부른다.

> 표기 규칙을 서버가 아닌 프론트에 두는 이유: 문구가 바뀌어도 서버를 건드리지 않는다.

### 탐지 상세 모달

Stage 1 · Stage 2 섹션은 각 객체의 필드를 그대로 나열한다.
`stage2.model`, `stage2.feature_set`은 내부 구현 정보라 응답에 포함하지 않는다.

---

## 5. 오류 응답

모든 오류는 아래 형태를 따른다.

```json
{
  "error": {
    "code": "PIPELINE_FAILED",
    "message": "분석 중 오류가 발생했습니다. 파일을 다시 업로드해 주세요.",
    "stage": "stage1",
    "detail": "yr exited with code 1"
  }
}
```

| 필드 | 설명 |
|---|---|
| `code` | 프론트 분기용 식별자 |
| `message` | **사용자에게 그대로 보여줄 한국어 문장** |
| `stage` | 실패 지점. `upload` \| `stage1` \| `stage2` \| `null` |
| `detail` | 원인 문자열. 개발 환경에서만 채우고 운영에서는 생략 |

### 상태 코드

| 코드 | `error.code` | 상황 |
|---|---|---|
| `400` | `NO_FILE` | `file` 필드가 없음 |
| `400` | `MULTIPLE_FILES` | 파일을 2개 이상 보냄 |
| `400` | `EMPTY_FILE` | 크기 0바이트 |
| `413` | `FILE_TOO_LARGE` | 업로드 상한 초과 |
| `415` | `UNSUPPORTED_FORMAT` | 파이프라인이 다루지 못하는 형식 |
| `429` | `TOO_MANY_REQUESTS` | 동시 분석 수 초과 (8절 참고) |
| `500` | `PIPELINE_FAILED` | `predict.sh` 실행 실패 |
| `504` | `ANALYSIS_TIMEOUT` | 분석이 제한 시간을 넘김 |

> 부분 실패는 오류가 아니다. Stage 1은 성공하고 Stage 2만 실패했다면
> `200`으로 응답하되 `stage2.status`를 `ERROR`로 채운다.
> 화면에 "1단계는 나왔고 2단계가 실패했다"를 보여줄 수 있어야 한다.

---

## 6. GET /api/v1/events

서버 프로세스가 메모리에 들고 있는 최근 분석 결과 목록.

```
GET /api/v1/events?limit=50
```

| 쿼리 | 기본값 | 설명 |
|---|---|---|
| `limit` | `50` | 최대 반환 개수. 최신순 |

### 응답 `200 OK`

```json
{
  "events": [ /* analyze 응답과 동일한 객체의 배열 */ ],
  "count": 4
}
```

> **DB가 없으므로 서버를 재시작하면 목록이 비워진다.**
> 시연에는 충분하지만, 이력 보존이 요건이 되는 순간 저장소가 필요해진다.
> 보관 개수는 메모리 상한을 두고 오래된 것부터 버린다 (예: 최근 100건).

---

## 7. DELETE /api/v1/events/{analysis_id}

목록에서 이벤트 한 건을 지운다. 탐지 상세 화면의 **삭제**에서 호출한다.

```
DELETE /api/v1/events/9f2c1b7e-4a03-4c5d-9e11-6b8f0d2a7c34
```

### 응답

| 코드 | 본문 | 상황 |
|---|---|---|
| `204` | 없음 | 삭제 완료 |
| `404` | `EVENT_NOT_FOUND` | 이미 지워졌거나 없는 id |

성공 시 본문이 없으므로 프론트는 상태 코드만 확인하고 목록 캐시를 무효화한다.

> 지우는 대상은 **목록에 있는 분석 기록**이다. 파이프라인이 디스크에 남긴
> 결과 JSON과 격리 보관된 원본 파일까지 지울지는 별도로 정해야 한다
> (감사 추적이 요건이 되면 기록은 남기고 화면에서만 감추는 편이 낫다).

### CORS

프론트를 별도 오리진에 두는 경우 `Access-Control-Allow-Methods` 에
`DELETE` 가 포함되어야 한다.

---

## 8. GET /api/v1/health

```json
{
  "status": "ok",
  "pipeline": "ready",
  "running": 0,
  "max_concurrent": 2
}
```

| 필드 | 설명 |
|---|---|
| `status` | `ok` \| `degraded` |
| `pipeline` | `ready` \| `unavailable` — `predict.sh` 실행 가능 여부 |
| `running` | 현재 분석 중인 건수 |
| `max_concurrent` | 동시 실행 상한 |

### 동시 실행 제한이 필요한 이유

Kata 컨테이너 하나가 메모리 4 GiB, CPU 2개를 잡는다.
동시 요청을 제한하지 않으면 호스트가 마른다.
상한을 넘는 요청은 `429`로 즉시 거절한다.

---

## 9. 확장: 단계별 진행 표시가 필요해지면

동기 방식에서는 "분석 중" 스피너만 돌릴 수 있다.
Stage 1 완료 / Stage 2 진행 같은 단계 표시가 필요하면 SSE로 바꾼다.
**DB는 여전히 필요 없다** — 진행 상태는 서버 메모리에만 둔다.

```
POST /api/v1/analyze        →  202 { "analysis_id": "..." }
GET  /api/v1/analyze/{id}/stream   (text/event-stream)

event: stage1
data: {"status":"MATCH","scan_ms":1385}

event: stage2
data: {"status":"MALWARE","prob":0.999843}

event: done
data: { /* analyze 응답과 동일한 전체 객체 */ }
```

---

## 10. 배치와 접근

### CORS를 피하는 배치

SSH 터널로 접속하는 상황에서는 **API 서버가 프론트 정적 파일도 함께 서빙**하는 편이 낫다.
같은 오리진이 되어 CORS 설정이 아예 필요 없다.

```
GET /            → index.html   (업로드 화면)
GET /dashboard   → dashboard.html
GET /assets/*    → 정적 자원
GET /api/v1/*    → API
```

프론트를 Vercel 등 외부에 두면, HTTPS 페이지에서 터널의 HTTP 주소로 요청하게 되어
혼합 콘텐츠 차단과 CORS를 둘 다 처리해야 한다.

### SSH 터널 접속

```bash
ssh -L 8000:localhost:8000 <user>@<sandbox-host>
```

브라우저에서 `http://localhost:8000` 으로 접근한다.

---

## 11. 구현 전에 정리되어야 할 것

API와 직접 얽혀 있어, 이 셋이 풀리지 않으면 명세대로 동작하지 않는다.

| 항목 | 내용 |
|---|---|
| **권한 분리** | 파이프라인이 `sudo nerdctl`을 호출한다. FastAPI 프로세스에 sudo나 containerd 권한을 직접 주면 안 된다. API는 요청만 받고, 고정된 명령·경로만 실행하는 전용 worker 계정이 분석을 수행해야 한다 |
| **결과 경로 충돌** | Stage 1은 공용 `results/`, Stage 2는 `output/<sha256>/`를 쓴다. 같은 파일을 동시에 두 번 올리면 결과를 덮어쓴다. 요청마다 별도 작업 디렉터리를 쓰도록 격리해야 한다 |
| **Stage 1 결과 파일** | `Main.java`에서 결과 저장 호출이 주석 처리되어 있는데 `run_kata_yara.sh`는 JSON 파일 생성을 기대한다. 소스에서 이미지를 다시 빌드하고 direct/ZIP 각각으로 smoke test를 거쳐야 한다 |

### 아울러 측정이 필요한 값

| 값 | 결정하는 것 |
|---|---|
| Kata VM 부팅 포함 분석 총 소요 시간 | 타임아웃 값, 동기 방식 유지 여부 |
| 업로드 최대 크기 | Nginx `client_max_body_size`, 컨테이너 file size ulimit(200 MiB)과의 정합성 |
| 동시 분석 가능 수 | `max_concurrent` 값 |
