from __future__ import annotations
import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api.routers.pis import router as pis_router
from app.api.routers.features import router as features_router
from app.api.routers.findings import router as findings_router
from app.api.routers.upload import router as upload_router
from app.api.routers.roadmap import router as roadmap_router

# ─── Rate Limiting ────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(title="Jira Delivery Health API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS origins — set CORS_ORIGINS env var as comma-separated list for production
# e.g. CORS_ORIGINS="https://dashboard.example.com,http://localhost:3000"
_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST"],   # POST needed for /api/upload
    allow_headers=["Content-Type", "Authorization", "X-Upload-Key"],  # Security: restrict to specific headers
)

app.include_router(pis_router)
app.include_router(features_router)
app.include_router(findings_router)
app.include_router(upload_router)
app.include_router(roadmap_router)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/seed-demo")
def seed_demo(request: Request):
    """Seed demo data. Protected by UPLOAD_API_KEY."""
    import hmac
    upload_key = os.environ.get("UPLOAD_API_KEY", "")
    provided_key = request.headers.get("x-upload-key", "")
    if not upload_key:
        # Allow seeding if no key configured (dev mode)
        pass
    elif not provided_key or not hmac.compare_digest(provided_key, upload_key):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid or missing X-Upload-Key header.")

    from app.seed_demo import seed
    from app.engine import invalidate_cache
    seed()
    invalidate_cache()
    return {"status": "ok", "message": "Demo data seeded successfully"}
