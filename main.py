from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.wsgi import WSGIMiddleware # What is this?
from fastapi.middleware.cors import CORSMiddleware
from api.wepproad import router as wepproad_router
from api.disturbed import router as disturbed_router
from api.ermit import router as ermit_router
from api.rockclim import router as rockclim_router
from api.logger import router as logger_router

import traceback
import uuid

app = FastAPI()

origins = [
    "https://fswepp2-dev.bearhive.duckdns.org",
    "https://fswepp2.bearhive.duckdns.org",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

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
    # Return the stack trace with the response
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "stack_trace": stack_trace,
        },
    )


app.include_router(wepproad_router, prefix="/api")
app.include_router(disturbed_router, prefix="/api")
app.include_router(ermit_router, prefix="/api")
app.include_router(rockclim_router, prefix="/api")
app.include_router(logger_router, prefix="/api")
