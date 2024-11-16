from fastapi import FastAPI, Request, Response
from starlette.middleware.wsgi import WSGIMiddleware
from api.wepproad import router as wepproad_router
from api.disturbed import router as disturbed_router
from api.ermit import router as ermit_router
from api.rockclim import router as rockclim_router
from api.logger import router as logger_router

from frontend.flask_app import flask_app
import uuid

app = FastAPI()

@app.middleware("http")
async def ensure_user_id_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    
    if not request.cookies.get("user_id"):
        user_id = str(uuid.uuid4())
        response.set_cookie(
            key="user_id",
            value=user_id,
            path="/"
        )
        
        print(f"user_id: {user_id}")

    return response


app.include_router(wepproad_router, prefix="/api")
app.include_router(disturbed_router, prefix="/api")
app.include_router(ermit_router, prefix="/api")
app.include_router(rockclim_router, prefix="/api")
app.include_router(logger_router, prefix="/api")

app.mount("/fswepp2", WSGIMiddleware(flask_app))
