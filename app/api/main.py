from __future__ import annotations
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers.pis import router as pis_router
from app.api.routers.features import router as features_router
from app.api.routers.findings import router as findings_router
from app.api.routers.upload import router as upload_router
from app.api.routers.roadmap import router as roadmap_router

app = FastAPI(title="Jira Delivery Health API", version="0.1.0")

# CORS origins — set CORS_ORIGINS env var as comma-separated list for production
# e.g. CORS_ORIGINS="https://dashboard.example.com,http://localhost:3000"
_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST"],   # POST needed for /api/upload
    allow_headers=["*"],
)

app.include_router(pis_router)
app.include_router(features_router)
app.include_router(findings_router)
app.include_router(upload_router)
app.include_router(roadmap_router)

@app.get("/health")
def health():
    return {"status": "ok"}
