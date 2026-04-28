from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers.pis import router as pis_router
from app.api.routers.features import router as features_router
from app.api.routers.findings import router as findings_router
from app.api.routers.upload import router as upload_router

app = FastAPI(title="Jira Delivery Health API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],   # POST needed for /api/upload
    allow_headers=["*"],
)

app.include_router(pis_router)
app.include_router(features_router)
app.include_router(findings_router)
app.include_router(upload_router)

@app.get("/health")
def health():
    return {"status": "ok"}
