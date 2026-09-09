"""Local-only API. Heavy solves run in FastAPI's worker pool."""

import json
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .models import SimulationRequest, Track, Vehicle
from .solver import solve

ROOT = Path(__file__).resolve().parents[2]
app = FastAPI(title="LAPTRIX Simulation", version="0.1.0")


@app.middleware("http")
async def local_requests(request: Request, call_next):
    # No wildcard CORS. Reject browser cross-origin writes to this local service.
    origin = request.headers.get("origin")
    if (
        request.method == "POST"
        and origin
        and origin
        not in {
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
            "http://127.0.0.1:8000",
        }
    ):
        return JSONResponse({"detail": "Cross-origin simulation requests are disabled"}, status_code=403)
    body = await request.body()
    if len(body) > 1_500_000:
        return JSONResponse({"detail": "Request exceeds the 1.5 MB limit"}, status_code=413)
    return await call_next(request)


@lru_cache
def catalog():
    tracks = [Track.model_validate_json(p.read_text()) for p in sorted((ROOT / "data/tracks").glob("*.json"))]
    vehicles = [
        Vehicle.model_validate_json(p.read_text()) for p in sorted((ROOT / "data/vehicles").glob("*.json"))
    ]
    return tracks, vehicles


@app.get("/api/health")
def health():
    return {"status": "ok", "model": "Development Physics Model"}


@app.get("/api/catalog")
def get_catalog():
    tracks, vehicles = catalog()
    return {"tracks": [t.model_dump() for t in tracks], "vehicles": [v.model_dump() for v in vehicles]}


@lru_cache(maxsize=24)
def cached_solve(track_json: str, vehicle_json: str, setup_json: str):
    from .models import Setup

    return solve(
        Track.model_validate_json(track_json),
        Vehicle.model_validate_json(vehicle_json),
        Setup.model_validate_json(setup_json),
    )


@app.post("/api/simulate")
def simulate(request: SimulationRequest):
    tracks, vehicles = catalog()
    track = request.track or next((t for t in tracks if t.id == request.trackId), None)
    vehicle = next((v for v in vehicles if v.id == request.vehicleId), None)
    if track is None or vehicle is None:
        raise HTTPException(404, "Unknown track or vehicle")
    try:
        return cached_solve(
            track.model_dump_json(), vehicle.model_dump_json(), request.setup.model_dump_json()
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/api/schema/track")
def track_schema():
    return json.loads(json.dumps(Track.model_json_schema()))
