"""HTTP API for the model, and the static host for the built frontend."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

from markov_calls.actions import UnknownActionError
from markov_calls.service import get_service

from .schemas import PredictRequest

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app):
    # Train and evaluate once at startup, so the first request is fast.
    await run_in_threadpool(get_service)
    yield


app = FastAPI(title="Customer Care Call Prediction API", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.exception_handler(UnknownActionError)
async def unknown_action_handler(_request: Request, error: UnknownActionError):
    return JSONResponse(status_code=422, content={"detail": str(error), "action": error.action})


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/actions")
def actions():
    return get_service().catalog()


@app.get("/api/model")
def model_summary():
    return get_service().summary()


@app.get("/api/patterns")
def patterns():
    return get_service().patterns()


@app.post("/api/predict")
def predict(request: PredictRequest):
    try:
        return get_service().predict(request.actions)
    except UnknownActionError:
        raise
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/api/performance")
def performance():
    return get_service().performance


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
def api_not_found(path: str):
    raise HTTPException(status_code=404, detail=f"Unknown API endpoint: /api/{path}")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    """Serve the built single-page app; unknown paths return index.html so client routing works."""
    index = FRONTEND_DIST / "index.html"
    if not index.exists():
        return JSONResponse(status_code=503, content={
            "detail": "The frontend is not built yet. Run 'npm run build' in the frontend folder."})
    requested = (FRONTEND_DIST / path).resolve()
    if path and requested.is_file() and FRONTEND_DIST in requested.parents:
        headers = {"Cache-Control": "public, max-age=31536000, immutable"} if path.startswith("assets/") else {}
        return FileResponse(requested, headers=headers)
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
