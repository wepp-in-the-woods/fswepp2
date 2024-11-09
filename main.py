from fastapi import FastAPI, Query
from typing import Optional

from app.wepproad import router as wepproad_router
from app.rockclim import router as rockclim_router

app = FastAPI()

# Include the routers
app.include_router(wepproad_router, prefix="/api")
app.include_router(rockclim_router, prefix="/api")