from fastapi import FastAPI, Query
from typing import Optional

app = FastAPI()

from app.wepproad import router as wepproad_router

app = FastAPI()

# Include the routers
app.include_router(wepproad_router, prefix="/api")