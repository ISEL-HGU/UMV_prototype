# UMV Prototype — Malware Detection Console

UMV Hybrid Engine 악성코드 탐지 결과를 보여주는 관리 콘솔 프론트엔드.
현재는 **MSW 목 서버로 동작**하며, 백엔드가 준비되면 환경 변수 하나로 실제 API에 붙는다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript (strict) |
| 서버 상태 | TanStack Query |
| 데이터 그리드 | TanStack Table |
| 스타일 | Tailwind CSS v4 |
| UI 컴포넌트 | shadcn/ui (Base UI 기반) |
| 폼 · 검증 | React Hook Form + Zod |
| 다국어 | next-intl (ko · en) |
| 개발용 목 서버 | MSW |

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 업로드 화면이 뜬다.

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `BUILD_STANDALONE=true npm run build` | 온프레미스용 standalone 빌드 (`.next/standalone`) |
| `npm start` | 빌드 결과 실행 |
| `npx tsc --noEmit` | 타입 검사 |
| `npx eslint src` | 린트 |

## 화면

업로드 화면과 대시보드는 **서로 독립된 페이지**다.

| 경로 | 화면 | 설명 |
|---|---|---|
| `/` | Upload a file | 진입 화면. 드래그&드롭 업로드 |
| `/dashboard` | Malware Detection Events | 탐지 이벤트 목록. 검색 · 판정 필터 · 정렬 · 열 표시 선택 |
| `/dashboard` | Detection Details | 행 클릭 시 상세 모달. General / Tags 탭 |

업로드에 성공하면 대시보드로 이동하고, 목록 캐시가 자동으로 갱신된다.

## 백엔드 연결

`.env.development` 의 두 값으로 제어한다.

```bash
# 목 서버 사용 (기본). 실제 백엔드가 준비되면 disabled 로 바꾼다.
NEXT_PUBLIC_API_MOCKING=enabled

# 백엔드가 프론트를 같이 서빙하면 비워 둔다 (같은 오리진 → CORS 불필요).
# 별도 주소면 예: http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=
```

`NEXT_PUBLIC_API_MOCKING=disabled` 로 바꾸면 **화면 코드는 그대로 둔 채**
같은 `fetch` 가 실제 서버를 향한다.

API 규약은 [docs/API.md](docs/API.md) 를 따른다.

## 판정 표기 규칙

서버는 원본 값만 내려주고, 표시 문자열은 프론트에서 조합한다
([`src/lib/format.ts`](src/lib/format.ts)). 문구가 바뀌어도 서버를 건드리지 않는다.

| Stage 1 | Stage 2 | 표시 |
|---|---|---|
| MATCH | MALWARE | `YARA:<rule_name> / AI:MALWARE 99.9%` |
| NO_MATCH | MALWARE | `YARA:NO_MATCH / AI:MALWARE 99.7%` |
| MATCH | BENIGN | `YARA:<rule_name> / AI:BENIGN 12.3%` |
| NO_MATCH | BENIGN | `YARA:NO_MATCH / AI:BENIGN 3.1%` |

확률은 **악성 확률**이며, `0.999843` 이 `100.0%` 로 보이지 않도록 내림 처리한다.

## 구조

```
src/
  app/
    page.tsx                    업로드 화면 (진입점)
    dashboard/page.tsx          대시보드
    layout.tsx                  폰트 · i18n · Provider
    globals.css                 Tailwind 테마 + UMV 콘솔 토큰
  components/
    providers.tsx               TanStack Query + MSW 초기화
    console/                    콘솔 셸 (상단바 · 사이드바 · 탭), 언어 전환
    events/                     이벤트 목록, 탐지 상세 모달
    upload/                     업로드 폼
    ui/                         shadcn/ui 컴포넌트
  lib/
    types.ts                    Zod 스키마 + 타입 (docs/API.md 대응)
    api.ts                      fetch 래퍼 · 응답 검증 · ApiError
    format.ts                   판정 표기 순수 함수
  mocks/
    data.ts                     데모 데이터 (판정 4가지 조합)
    handlers.ts                 MSW 핸들러
  i18n/                         로케일 설정 · 쿠키 전환
messages/
  ko.json · en.json             UI 문자열
```

## 데이터 교체

백엔드에서 실제 응답 JSON 샘플을 받으면
[`src/mocks/data.ts`](src/mocks/data.ts) 의 `DEMO_ANALYSES` 만 교체한다.
목록과 상세 모달에 함께 반영된다.

응답 형식이 [`src/lib/types.ts`](src/lib/types.ts) 의 Zod 스키마와 어긋나면
화면에서 `undefined` 로 터지는 대신 API 계층에서 잡힌다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/API.md](docs/API.md) | 프론트엔드 ↔ 백엔드 API 명세 (DB 없는 MVP 기준) |
| [docs/BACKEND_GUIDE.md](docs/BACKEND_GUIDE.md) | 백엔드 구현 가이드 — 웹 서버를 처음 만드는 경우 |
