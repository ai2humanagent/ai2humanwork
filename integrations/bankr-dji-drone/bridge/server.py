#!/usr/bin/env python3
"""DJI Enterprise Drone bridge — the engine the Bankr skill talks to.

    agent (skill) --HTTP--> THIS bridge --> (mock | DJI Cloud API) --> drone

The bridge owns ALL safety. It exposes the HTTP contract SKILL.md expects
(/health /state /actions /command) and refuses unsafe commands with HTTP 422.
It runs a built-in flight simulator so the whole chain works with zero hardware,
streams live state to the web simulator over SSE (/events), and serves it at /.

Run:
    export BRIDGE_TOKEN=$(openssl rand -hex 24)
    export DRONE_MOCK=1
    uvicorn bridge.server:app --host 0.0.0.0 --port 8080
Then open http://localhost:8080/ for the web simulator.
"""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
from pathlib import Path
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

# --- Config (env-driven; bridge is the single source of truth for safety) --- #
BRIDGE_TOKEN = os.environ.get("BRIDGE_TOKEN", "dev-token")
DRONE_MOCK = os.environ.get("DRONE_MOCK", "1") not in ("0", "false", "False", "")
GEOFENCE_RADIUS_M = float(os.environ.get("GEOFENCE_RADIUS_M", "500"))
MAX_ALT_M = float(os.environ.get("MAX_ALT_M", "120"))
RTH_BATTERY_PCT = float(os.environ.get("RTH_BATTERY_PCT", "20"))
TAKEOFF_MIN_BATTERY_PCT = float(os.environ.get("TAKEOFF_MIN_BATTERY_PCT", "50"))
HOME_LAT = float(os.environ.get("HOME_LAT", "40.7484"))
HOME_LON = float(os.environ.get("HOME_LON", "-73.9857"))
WEB_DIR = Path(__file__).resolve().parent.parent / "web"

EARTH_R = 6371000.0


def meters_between(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def offset_meters(lat, lon, north_m, east_m):
    dlat = north_m / EARTH_R
    dlon = east_m / (EARTH_R * math.cos(math.radians(lat)))
    return lat + math.degrees(dlat), lon + math.degrees(dlon)


class Drone:
    def __init__(self) -> None:
        self.online = True
        self.mock = DRONE_MOCK
        self.home_lat = HOME_LAT
        self.home_lon = HOME_LON
        self.home_set = True
        self.lat = HOME_LAT
        self.lon = HOME_LON
        self.alt_m = 0.0
        self.battery = 96.0
        self.gps_fix = "good"
        self.flight_status = "on_dock"  # on_dock | idle | flying | returning
        self.recording = False
        self.gimbal_pitch = 0.0
        self.gimbal_yaw = 0.0
        self._target: Optional[tuple] = None
        self._orbit: Optional[dict] = None
        self._speed_mps = 12.0
        self._vspeed_mps = 3.0
        self.last_event = "bridge started"

    def dist_from_home(self) -> float:
        return meters_between(self.lat, self.lon, self.home_lat, self.home_lon)

    def snapshot(self) -> dict:
        return {
            "online": self.online,
            "mock": self.mock,
            "flight_status": self.flight_status,
            "battery": round(self.battery, 1),
            "gps_fix": self.gps_fix,
            "altitude_m": round(self.alt_m, 1),
            "lat": round(self.lat, 6),
            "lon": round(self.lon, 6),
            "home_lat": round(self.home_lat, 6),
            "home_lon": round(self.home_lon, 6),
            "home_set": self.home_set,
            "geofence_ok": self.dist_from_home() <= GEOFENCE_RADIUS_M and self.alt_m <= MAX_ALT_M,
            "geofence_radius_m": GEOFENCE_RADIUS_M,
            "max_alt_m": MAX_ALT_M,
            "dist_from_home_m": round(self.dist_from_home(), 1),
            "recording": self.recording,
            "gimbal": {"pitch": self.gimbal_pitch, "yaw": self.gimbal_yaw},
            "last_event": self.last_event,
        }


drone = Drone()
_subscribers: set = set()


async def publish(kind: str, payload: dict) -> None:
    msg = json.dumps({"kind": kind, "payload": payload, "ts": time.time()})
    for q in list(_subscribers):
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass


def log_event(text: str) -> None:
    drone.last_event = text


FLIGHT_ACTIONS = {"takeoff", "hover", "goto", "orbit", "set_altitude", "land_now"}
DANGEROUS_ACTIONS = {"takeoff", "land_now"}
ACTIONS_SPEC = [
    {"action": "takeoff", "dangerous": True, "requires": "GPS fix + battery >= 50%; confirm:true"},
    {"action": "hover", "dangerous": False, "requires": "must be flying"},
    {"action": "goto", "dangerous": False, "requires": "{lat,lon,alt_m} inside geofence + under max alt"},
    {"action": "orbit", "dangerous": False, "requires": "{radius_m,alt_m}; center=current point; inside geofence"},
    {"action": "set_altitude", "dangerous": False, "requires": "{alt_m} under max alt"},
    {"action": "capture_photo", "dangerous": False, "requires": "payload; any flight status"},
    {"action": "start_video", "dangerous": False, "requires": "payload"},
    {"action": "stop_video", "dangerous": False, "requires": "payload"},
    {"action": "gimbal", "dangerous": False, "requires": "{pitch,yaw} within limits"},
    {"action": "return_to_home", "dangerous": False, "requires": "always allowed, never refused"},
    {"action": "land_now", "dangerous": True, "requires": "lands at current position; confirm:true"},
]
WHITELIST = {a["action"] for a in ACTIONS_SPEC}


class Refused(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def require_flying() -> None:
    if drone.flight_status not in ("flying", "returning"):
        raise Refused("drone is not airborne — take off first")


def check_online_ready() -> None:
    if not drone.online:
        raise Refused("drone is offline")
    if drone.gps_fix == "none":
        raise Refused("no GPS fix — cannot fly safely")


def apply_command(action: str, body: dict) -> str:
    confirm = bool(body.get("confirm", False))

    if action == "return_to_home":
        drone.flight_status = "returning"
        drone._orbit = None
        drone._target = (drone.home_lat, drone.home_lon, 0.0)
        return "returning to home and landing on the dock"

    if action in DANGEROUS_ACTIONS and not confirm:
        raise Refused(f"'{action}' is dangerous — resend with confirm:true")

    if action in FLIGHT_ACTIONS:
        check_online_ready()

    if action == "takeoff":
        if drone.flight_status == "flying":
            return "already airborne"
        if drone.battery < TAKEOFF_MIN_BATTERY_PCT:
            raise Refused(f"battery {drone.battery:.0f}% below take-off minimum {TAKEOFF_MIN_BATTERY_PCT:.0f}%")
        drone.flight_status = "flying"
        drone._target = (drone.lat, drone.lon, 15.0)
        drone._orbit = None
        return "taking off to 15 m and holding"

    if action == "hover":
        require_flying()
        drone._target = None
        drone._orbit = None
        drone.flight_status = "flying"
        return f"holding position at {drone.alt_m:.0f} m"

    if action == "goto":
        require_flying()
        lat, lon = body.get("lat"), body.get("lon")
        alt = float(body.get("alt_m", drone.alt_m))
        if lat is None or lon is None:
            raise Refused("goto needs lat and lon")
        dist = meters_between(drone.home_lat, drone.home_lon, float(lat), float(lon))
        if dist > GEOFENCE_RADIUS_M:
            raise Refused(f"target outside geofence (max ~{GEOFENCE_RADIUS_M:.0f} m from home)")
        if alt > MAX_ALT_M:
            raise Refused(f"target altitude {alt:.0f} m above max {MAX_ALT_M:.0f} m")
        drone._orbit = None
        drone._target = (float(lat), float(lon), alt)
        return f"flying to point at {alt:.0f} m"

    if action == "orbit":
        require_flying()
        radius = float(body.get("radius_m", 20))
        alt = float(body.get("alt_m", max(drone.alt_m, 20)))
        if alt > MAX_ALT_M:
            raise Refused(f"orbit altitude {alt:.0f} m above max {MAX_ALT_M:.0f} m")
        clat = float(body["lat"]) if "lat" in body else drone.lat
        clon = float(body["lon"]) if "lon" in body else drone.lon
        cdist = meters_between(drone.home_lat, drone.home_lon, clat, clon)
        if cdist + radius > GEOFENCE_RADIUS_M:
            raise Refused(f"orbit would leave geofence (max ~{GEOFENCE_RADIUS_M:.0f} m from home)")
        drone._target = None
        drone._orbit = {"lat": clat, "lon": clon, "radius": radius, "alt": alt, "angle": 0.0}
        return f"orbiting at {radius:.0f} m radius, {alt:.0f} m altitude"

    if action == "set_altitude":
        require_flying()
        alt = float(body.get("alt_m", drone.alt_m))
        if alt > MAX_ALT_M:
            raise Refused(f"altitude {alt:.0f} m above max {MAX_ALT_M:.0f} m")
        if alt < 2:
            raise Refused("altitude too low — use land_now or return_to_home to land")
        drone._target = (drone.lat, drone.lon, alt)
        return f"changing altitude to {alt:.0f} m"

    if action == "land_now":
        drone.flight_status = "returning"
        drone._orbit = None
        drone._target = (drone.lat, drone.lon, 0.0)
        return "emergency landing at current position"

    if action == "capture_photo":
        return "photo captured"
    if action == "start_video":
        drone.recording = True
        return "recording started"
    if action == "stop_video":
        drone.recording = False
        return "recording stopped"
    if action == "gimbal":
        drone.gimbal_pitch = float(body.get("pitch", drone.gimbal_pitch))
        drone.gimbal_yaw = float(body.get("yaw", drone.gimbal_yaw))
        return f"gimbal set to pitch {drone.gimbal_pitch:.0f}, yaw {drone.gimbal_yaw:.0f}"

    raise Refused(f"unknown action '{action}'")


async def simulator() -> None:
    dt = 0.5
    while True:
        await asyncio.sleep(dt)
        _tick(dt)
        await publish("state", drone.snapshot())


def _tick(dt: float) -> None:
    flying = drone.flight_status in ("flying", "returning")
    if flying:
        drone.battery = max(0.0, drone.battery - 0.05)
    elif drone.flight_status == "idle":
        drone.battery = max(0.0, drone.battery - 0.005)

    if flying and drone.battery <= RTH_BATTERY_PCT and drone.flight_status != "returning":
        drone.flight_status = "returning"
        drone._orbit = None
        drone._target = (drone.home_lat, drone.home_lon, 0.0)
        log_event(f"low battery {drone.battery:.0f}% — auto return-to-home")

    if drone._orbit is not None and drone.flight_status == "flying":
        o = drone._orbit
        o["angle"] = (o["angle"] + math.radians(20)) % (2 * math.pi)
        north = o["radius"] * math.cos(o["angle"])
        east = o["radius"] * math.sin(o["angle"])
        drone.lat, drone.lon = offset_meters(o["lat"], o["lon"], north, east)
        drone.alt_m += max(-drone._vspeed_mps * dt, min(drone._vspeed_mps * dt, o["alt"] - drone.alt_m))
        return

    if drone._target is not None:
        tlat, tlon, talt = drone._target
        horiz = meters_between(drone.lat, drone.lon, tlat, tlon)
        step = drone._speed_mps * dt
        if horiz > 1.0:
            frac = min(1.0, step / horiz)
            drone.lat += (tlat - drone.lat) * frac
            drone.lon += (tlon - drone.lon) * frac
        vstep = drone._vspeed_mps * dt
        drone.alt_m += max(-vstep, min(vstep, talt - drone.alt_m))
        if horiz <= 1.0 and abs(drone.alt_m - talt) < 0.3:
            drone.alt_m = talt
            drone._target = None
            if drone.flight_status == "returning":
                drone.flight_status = "on_dock"
                drone.recording = False
                log_event("landed on dock")


app = FastAPI(title="DJI Drone Bridge", version="1.0")


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(simulator())


def auth(authorization: str = Header(default="")) -> None:
    if authorization != f"Bearer {BRIDGE_TOKEN}":
        raise HTTPException(status_code=401, detail="invalid or missing bearer token")


class CommandBody(BaseModel):
    action: str
    confirm: Optional[bool] = False

    class Config:
        extra = "allow"


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "mock": drone.mock, "online": drone.online}


@app.get("/state")
async def state(_: None = Depends(auth)) -> dict:
    return drone.snapshot()


@app.get("/actions")
async def actions(_: None = Depends(auth)) -> dict:
    return {
        "whitelist": ACTIONS_SPEC,
        "limits": {
            "geofence_radius_m": GEOFENCE_RADIUS_M,
            "max_alt_m": MAX_ALT_M,
            "rth_battery_pct": RTH_BATTERY_PCT,
            "takeoff_min_battery_pct": TAKEOFF_MIN_BATTERY_PCT,
        },
    }


@app.post("/command")
async def command(request: Request, _: None = Depends(auth)) -> Any:
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    action = str(body.get("action", "")).strip()
    if action not in WHITELIST:
        raise HTTPException(status_code=400, detail=f"unknown action '{action}'")
    try:
        message = apply_command(action, body)
    except Refused as r:
        log_event(f"REFUSED {action}: {r.message}")
        await publish("command", {"action": action, "ok": False, "message": r.message})
        return JSONResponse(
            status_code=422,
            content={"ok": False, "action": action, "message": r.message, "state": drone.snapshot()},
        )
    log_event(f"{action}: {message}")
    await publish("command", {"action": action, "ok": True, "message": message})
    return {"ok": True, "action": action, "message": message, "state": drone.snapshot()}


@app.get("/events")
async def events() -> StreamingResponse:
    async def gen():
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        _subscribers.add(q)
        try:
            yield f"data: {json.dumps({'kind': 'state', 'payload': drone.snapshot()})}\n\n"
            while True:
                msg = await q.get()
                yield f"data: {msg}\n\n"
        finally:
            _subscribers.discard(q)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/")
async def index() -> Any:
    idx = WEB_DIR / "index.html"
    if idx.exists():
        return FileResponse(str(idx))
    return JSONResponse({"ok": True, "hint": "web simulator not found; API is up"})


@app.get("/config")
async def config() -> dict:
    """Non-secret config the web simulator needs (token to call /command)."""
    return {"token": BRIDGE_TOKEN, "home_lat": HOME_LAT, "home_lon": HOME_LON,
            "geofence_radius_m": GEOFENCE_RADIUS_M, "max_alt_m": MAX_ALT_M}
