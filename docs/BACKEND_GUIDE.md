# 백엔드 작업 가이드

웹 서비스를 처음 만드는 분을 위한 안내.
**Python을 다룰 줄 안다면 새로 배울 것은 많지 않다.**
이미 있는 `bin/predict.sh`를 웹에서 부를 수 있게 감싸는 것이 전부다.

응답 형식은 [API.md](API.md)에 정의되어 있다. 이 문서는 "어떻게 만드는가"를 다룬다.

---

## 0. 먼저 알아둘 개념 세 가지

**웹 서버는 그냥 함수를 실행해 주는 프로그램이다.**
브라우저가 `/api/v1/analyze`로 요청을 보내면, 그 주소에 연결된 Python 함수가 실행되고,
함수가 돌려준 값이 JSON으로 변환되어 브라우저에 간다. 그게 전부다.

**FastAPI가 그 연결을 담당한다.**
"이 주소로 요청이 오면 이 함수를 불러라"를 데코레이터 한 줄로 적는다.

**Uvicorn이 실제로 서버를 띄운다.**
FastAPI는 규칙을 적는 도구이고, 실행하는 프로그램은 Uvicorn이다.
`uvicorn main:app` 이라고 치면 서버가 뜬다.

---

## 1. 개발 환경 준비

```bash
cd /home/umv_sandbox
python3 -m venv .venv-api
source .venv-api/bin/activate
pip install "fastapi[standard]" uvicorn python-multipart
```

`python-multipart`는 파일 업로드를 받는 데 필요하다. 빼먹으면 업로드에서 오류가 난다.

> 기존 분석용 venv와 **분리**하는 것을 권한다. API 서버가 분석 코드의
> 패키지 버전에 영향을 주지 않도록.

---

## 2. 서버를 띄워 본다 (5분)

`api/main.py` 를 만들고:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
```

실행:

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

브라우저나 다른 터미널에서 확인:

```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok"}
```

여기까지 되면 웹 서버의 기본은 끝났다. `--reload`는 파일을 저장할 때마다
서버를 자동으로 다시 띄워 준다. 개발 중에만 쓴다.

**보너스** — `http://localhost:8000/docs` 에 들어가 보면 FastAPI가 만든
API 문서 화면이 나온다. 거기서 직접 파일을 올려 테스트할 수 있어서,
프론트 없이도 개발이 가능하다.

---

## 3. 파일 받기

```python
from fastapi import FastAPI, File, UploadFile
import shutil, tempfile
from pathlib import Path

app = FastAPI()

@app.post("/api/v1/analyze")
async def analyze(file: UploadFile = File(...)):
    tmpdir = tempfile.mkdtemp(prefix="umv_job_")
    saved = Path(tmpdir) / (file.filename or "upload.bin")

    with open(saved, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"saved_to": str(saved), "size": saved.stat().st_size}
```

`/docs` 화면에서 파일을 올려 경로와 크기가 나오면 성공이다.

**요청마다 새 임시 디렉터리를 만드는 것이 중요하다.**
고정된 경로를 쓰면 두 사람이 동시에 올렸을 때 서로의 파일을 덮어쓴다.

---

## 4. 파이프라인 실행하기

Python에서 셸 스크립트를 부르는 방법은 `subprocess.run`이다.

```python
import subprocess

proc = subprocess.run(
    ["/home/umv_sandbox/bin/predict.sh", str(saved)],
    capture_output=True,   # 출력을 문자열로 받는다
    text=True,
    timeout=180,           # 초 단위. 넘으면 예외가 난다
)

if proc.returncode != 0:
    # 0이 아니면 실패한 것
    print(proc.stderr)
```

### 반드시 알아야 할 함정

`subprocess.run`은 스크립트가 끝날 때까지 **그 자리에서 멈춘다.**
그런데 FastAPI는 한 프로세스로 여러 요청을 처리하기 때문에,
여기서 멈춰 버리면 **그동안 다른 모든 요청도 같이 멈춘다.**
health check조차 응답하지 않는다.

해결은 한 줄이다. 오래 걸리는 작업을 별도 스레드로 넘긴다.

```python
import asyncio

raw = await asyncio.to_thread(run_pipeline, str(saved))
```

`run_pipeline`은 평범한 동기 함수로 두고, 호출할 때만 `asyncio.to_thread`로 감싼다.
이렇게 하면 분석이 도는 동안에도 서버가 다른 요청에 응답한다.

---

## 5. 결과 JSON 읽어서 변환

파이프라인이 남기는 결과 파일을 읽어 [API.md](API.md)의 응답 형태로 바꾼다.

```python
import json
from pathlib import Path

def load_results(sha256: str) -> dict:
    stage1 = json.loads(Path(f"results/{sha256}.json").read_text())
    stage2 = json.loads(Path(f"output/{sha256}/prediction.json").read_text())
    return {"stage1": stage1, "stage2": stage2}
```

> 위 경로는 예시다. **실제 파일이 어디에 어떤 이름으로 떨어지는지
> 직접 `predict.sh`를 한 번 돌려서 확인하고 맞춰야 한다.**
> 이 부분이 이 작업에서 가장 손이 많이 가는 지점이다.

그다음 응답 형태로 변환한다. 파이프라인의 필드 이름과
프론트가 기대하는 이름이 다르므로 여기서 이어 준다.

```python
def to_response(stage1, stage2, filename, elapsed):
    return {
        "analysis_id": str(uuid.uuid4()),
        "received_at": datetime.now(KST).isoformat(),
        "elapsed_seconds": round(elapsed, 2),
        "file": {
            "name": filename,
            "sha256": stage2["sha256"],
            # ... API.md 참고
        },
        "stage1": {
            "status": "MATCH" if stage1["matched"] else "NO_MATCH",
            "scan_ms": stage1["elapsedMillis"],
            "matched_rules": [
                {"name": r["identifier"],
                 "namespace": r["namespace"],
                 "tags": r["tags"]}
                for r in stage1["matchedRules"]
            ],
            "error": None,
        },
        "stage2": {
            "status": stage2["decision"].upper(),
            "prob": stage2["prob"],
            "threshold": stage2["threshold"],
            "inference_seconds": stage2["inference_seconds"],
            "error": None,
        },
        "verdict": {
            "decision": stage2["decision"].upper(),
            "action_taken": "Terminated",
        },
    }
```

**서버는 화면에 보일 문자열을 만들지 않는다.**
`"YARA:룰이름 / AI:MALWARE 99.9%"` 같은 조합은 프론트가 한다.
서버는 원본 값만 정확히 넘기면 된다.

---

## 6. 오류 처리

사용자에게 Python 예외 메시지를 그대로 보여주면 안 된다.
[API.md 5절](API.md#5-오류-응답)의 형태로 통일한다.

```python
from fastapi.responses import JSONResponse

def error(status, code, message, stage=None, detail=None):
    return JSONResponse(
        status_code=status,
        content={"error": {
            "code": code, "message": message,
            "stage": stage, "detail": detail,
        }},
    )
```

`message`는 **사용자가 그대로 읽을 한국어 문장**으로 쓴다.
`detail`에는 원인을 넣되, 외부에 열 때는 비운다 — 내부 경로가 노출된다.

### 부분 실패는 오류가 아니다

Stage 1은 성공했는데 Stage 2만 실패했다면 `500`이 아니라 `200`으로 응답하고
`stage2.status`를 `"ERROR"`로 채운다. 화면에서 "1단계 결과는 나왔고
2단계가 실패했다"를 보여줄 수 있어야 하기 때문이다.

---

## 7. 동시 실행 제한

Kata 컨테이너 하나가 메모리 4 GiB와 CPU 2개를 잡는다.
여러 명이 동시에 올리면 서버가 마른다. 상한을 두고 넘으면 거절한다.

```python
MAX_CONCURRENT = 2
running = 0

@app.post("/api/v1/analyze")
async def analyze(file: UploadFile = File(...)):
    global running
    if running >= MAX_CONCURRENT:
        return error(429, "TOO_MANY_REQUESTS",
                     "분석 서버가 바쁩니다. 잠시 후 다시 시도해 주세요.")
    running += 1
    try:
        ...
    finally:
        running -= 1   # 오류가 나도 반드시 줄어들도록 finally 에 둔다
```

---

## 8. 프론트 화면 같이 서빙하기

API 서버가 HTML 파일도 함께 내보내면 **CORS 설정이 아예 필요 없다.**
SSH 터널로 테스트하는 상황에서는 이 방식이 가장 간단하다.

```python
from fastapi.staticfiles import StaticFiles

# ... 위에 API 라우트를 모두 정의한 다음, 맨 마지막에 ...
app.mount("/", StaticFiles(directory="/path/to/UMV_prototype", html=True))
```

**반드시 맨 아래에 둔다.** `mount("/")`가 위에 있으면 모든 주소를 정적 파일이
먼저 가로채서 API가 동작하지 않는다. 처음 만들 때 자주 겪는 문제다.

---

## 9. SSH 터널로 확인

서버에서 Uvicorn을 띄워 두고, 접속할 컴퓨터에서:

```bash
ssh -L 8000:localhost:8000 <계정>@<서버주소>
```

터널을 연 채로 브라우저에서 `http://localhost:8000` 을 연다.
서버에 방화벽 구멍을 내지 않아도 되고, 외부에 노출되지도 않는다.

---

## 10. 상시 실행 (systemd)

터미널을 닫으면 Uvicorn도 죽는다. 계속 돌리려면 systemd에 등록한다.
`/etc/systemd/system/umv-api.service`:

```ini
[Unit]
Description=UMV API Server
After=network.target

[Service]
User=umv
WorkingDirectory=/home/umv_sandbox
ExecStart=/home/umv_sandbox/.venv-api/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now umv-api
sudo systemctl status umv-api      # 상태 확인
journalctl -u umv-api -f           # 로그 실시간 보기
```

`Restart=always` 덕분에 서버가 죽어도 자동으로 다시 뜬다.

---

## 11. 작업 순서 체크리스트

위에서부터 하나씩. **각 단계가 끝날 때마다 동작을 확인하고 넘어간다.**

- [ ] venv 만들고 FastAPI 설치
- [ ] `/api/v1/health` 응답 확인
- [ ] 파일 업로드받아 임시 디렉터리에 저장
- [ ] `predict.sh`를 `subprocess`로 실행 (`asyncio.to_thread` 사용)
- [ ] **결과 파일이 실제로 어디에 떨어지는지 확인** ← 가장 오래 걸리는 지점
- [ ] 결과를 API.md 형태로 변환
- [ ] 오류 응답 형태 통일
- [ ] 동시 실행 제한
- [ ] 임시 디렉터리 정리 (`finally`에서 `shutil.rmtree`)
- [ ] `/api/v1/events` — 최근 결과를 리스트에 담아 반환
- [ ] 정적 파일 서빙 붙이기
- [ ] SSH 터널로 브라우저 확인
- [ ] systemd 등록

---

## 12. 시연 이후에 반드시 할 것

아래는 **지금 하지 않아도 되지만, 외부에 열기 전에는 반드시 해야 한다.**
지금 단계에서 신경 쓰다 진도가 안 나가는 것보다는, 나중에 한 번에 정리하는 편이 낫다.

| 항목 | 왜 |
|---|---|
| **API와 분석 실행 권한 분리** | 파이프라인이 `sudo nerdctl`을 부른다. 웹 프로세스가 sudo 권한을 가지면, 웹에 구멍이 뚫렸을 때 서버 전체를 내주게 된다. API는 요청만 받고, 별도 계정의 worker가 고정된 명령만 실행하도록 나눈다 |
| **결과 경로 충돌** | Stage 1은 공용 `results/`, Stage 2는 `output/<sha256>/`를 쓴다. 같은 파일을 동시에 올리면 서로 덮어쓴다 |
| **업로드 크기 제한** | Nginx `client_max_body_size`와 컨테이너 file size ulimit(200 MiB)을 맞춘다 |
| **HTTPS와 리버스 프록시** | Nginx 또는 Caddy를 앞에 둔다 |
| **인증** | 지금은 누구나 파일을 올릴 수 있다 |

---

## 13. 전체 뼈대

위 내용을 합친 시작점. **결과 파일 경로와 필드 이름은 실제 파이프라인에 맞춰 고쳐야 한다.**

```python
# api/main.py
import asyncio, json, shutil, subprocess, tempfile, time, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

PREDICT_SH = "/home/umv_sandbox/bin/predict.sh"
FRONTEND_DIR = "/home/umv_sandbox/UMV_prototype"
MAX_CONCURRENT = 2
TIMEOUT_SEC = 180
KST = timezone(timedelta(hours=9))

app = FastAPI(title="UMV API")

running = 0
recent: list[dict] = []


def error(status, code, message, stage=None, detail=None):
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message,
                           "stage": stage, "detail": detail}},
    )


def run_pipeline(input_path: str) -> dict:
    """predict.sh 를 실행하고 결과 JSON 들을 읽어 돌려준다. (동기 함수)"""
    proc = subprocess.run(
        [PREDICT_SH, input_path],
        capture_output=True, text=True, timeout=TIMEOUT_SEC,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[-2000:])

    # TODO: 실제 결과 파일 경로에 맞춰 수정할 것
    sha256 = "..."
    stage1 = json.loads(Path(f"results/{sha256}.json").read_text())
    stage2 = json.loads(Path(f"output/{sha256}/prediction.json").read_text())
    return {"stage1": stage1, "stage2": stage2}


def to_response(raw: dict, filename: str, elapsed: float) -> dict:
    """파이프라인 결과를 API.md 형태로 변환한다."""
    s1, s2 = raw["stage1"], raw["stage2"]
    decision = s2["decision"].upper()
    return {
        "analysis_id": str(uuid.uuid4()),
        "received_at": datetime.now(KST).isoformat(),
        "elapsed_seconds": round(elapsed, 2),
        "file": {
            "name": filename,
            "sha256": s2["sha256"],
            "size": s2["size"],
            "format": s2["file_type"],
            "source": s2["source_info"]["kind"],
            "depth": s2["source_info"].get("depth", 0),
            "inner_path": s1["input"],
        },
        "stage1": {
            "status": "MATCH" if s1["matched"] else "NO_MATCH",
            "scan_ms": s1["elapsedMillis"],
            "matched_rules": [
                {"name": r["identifier"], "namespace": r["namespace"],
                 "tags": r["tags"]}
                for r in s1["matchedRules"]
            ],
            "error": None,
        },
        "stage2": {
            "status": decision,
            "prob": s2["prob"],
            "threshold": s2["threshold"],
            "inference_seconds": s2["inference_seconds"],
            "error": None,
        },
        "verdict": {"decision": decision, "action_taken": "Terminated"},
    }


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "pipeline": "ready",
            "running": running, "max_concurrent": MAX_CONCURRENT}


@app.get("/api/v1/events")
def events(limit: int = 50):
    return {"events": recent[:limit], "count": len(recent)}


@app.post("/api/v1/analyze")
async def analyze(file: UploadFile = File(...)):
    global running

    if running >= MAX_CONCURRENT:
        return error(429, "TOO_MANY_REQUESTS",
                     "분석 서버가 바쁩니다. 잠시 후 다시 시도해 주세요.")

    running += 1
    started = time.time()
    tmpdir = tempfile.mkdtemp(prefix="umv_job_")

    try:
        saved = Path(tmpdir) / (file.filename or "upload.bin")
        with open(saved, "wb") as f:
            shutil.copyfileobj(file.file, f)

        if saved.stat().st_size == 0:
            return error(400, "EMPTY_FILE", "빈 파일은 분석할 수 없습니다.")

        raw = await asyncio.to_thread(run_pipeline, str(saved))
        result = to_response(raw, file.filename, time.time() - started)

        recent.insert(0, result)
        del recent[100:]          # 최근 100건만 메모리에 보관
        return result

    except subprocess.TimeoutExpired:
        return error(504, "ANALYSIS_TIMEOUT",
                     "분석 시간이 초과되었습니다. 파일 크기를 확인해 주세요.")
    except Exception as e:
        return error(500, "PIPELINE_FAILED",
                     "분석 중 오류가 발생했습니다.", detail=str(e))
    finally:
        running -= 1
        shutil.rmtree(tmpdir, ignore_errors=True)


# 정적 파일은 반드시 맨 마지막에 mount 한다
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True))
```
