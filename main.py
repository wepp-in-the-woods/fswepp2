from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.wsgi import WSGIMiddleware # What is this?
from fastapi.middleware.cors import CORSMiddleware
from api.wepproad import router as wepproad_router
from api.disturbed import router as disturbed_router
from api.ermit import router as ermit_router
from api.fume import router as fume_router
from api.rockclim import router as rockclim_router
from api.logger import router as logger_router
from api import prism_cache

import traceback
import uuid
import os
import json
import time
import logging

app = FastAPI()

origins = [
    "https://fswepp2-dev.bearhive.duckdns.org",
    "https://fswepp2.bearhive.duckdns.org",
    "http://localhost:5173",
    "http://localhost:8091",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8091",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)


@app.on_event("startup")
async def load_prism_cache() -> None:
    logging.getLogger(__name__).info("Loading PRISM cache on startup.")
    prism_cache.load()

def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"

def _log_json(payload: dict) -> None:
    print(json.dumps(payload, separators=(",", ":")), flush=True)

@app.middleware("http")
async def request_id_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    request_id = request.headers.get("x-request-id")
    if not request_id or len(request_id) > 255:
        request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Skip logging for health check endpoint
    should_log = request.url.path != "/health"

    try:
        response: Response = await call_next(request)
    except Exception as exc:
        if should_log:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            _log_json({
                "ts": time.time(),
                "level": "error",
                "msg": "request_error",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": 500,
                "duration_ms": duration_ms,
                "client_ip": _client_ip(request),
                "user_agent": request.headers.get("user-agent"),
            })
        raise exc

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-Id"] = request_id

    if should_log:
        _log_json({
            "ts": time.time(),
            "level": "info",
            "msg": "request",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": _client_ip(request),
            "user_agent": request.headers.get("user-agent"),
        })
    return response

@app.middleware("http")
async def ensure_user_id_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    
    if not request.cookies.get("user_id"):
        user_id = str(uuid.uuid4())
        response.set_cookie(
            key="user_id",
            value=user_id,
            path="/",
            max_age=60*60*24*7
        )
        
        # print(f"user_id: {user_id}")

    return response

@app.get("/health", tags=["health"])
async def health_check():
    """
    Simple liveness/readiness probe.
    """
    return {"status": "ok"}

@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    # Get the full traceback as a string
    stack_trace = ''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    debug_mode = os.getenv("FSWEPP_DEBUG", "0") not in ("0", "false", "False", "")

    headers = {}
    if hasattr(request.state, "request_id"):
        headers["X-Request-Id"] = request.state.request_id

    if debug_mode:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error",
                "error": str(exc),
                "stack_trace": stack_trace,
            },
            headers=headers,
        )

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers=headers,
    )


app.include_router(wepproad_router, prefix="/api")
app.include_router(disturbed_router, prefix="/api")
app.include_router(ermit_router, prefix="/api")
app.include_router(fume_router, prefix="/api")
app.include_router(rockclim_router, prefix="/api")
app.include_router(logger_router, prefix="/api")
