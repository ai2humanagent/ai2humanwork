/* ------------------------------------------------------------------
 * In-browser port of the bridge flight model + safety gates.
 * Same contract as bridge/server.py: /command returns {ok,message,state}
 * or refuses with an HTTP-422-equivalent. No backend, no drone.
 * ------------------------------------------------------------------ */

// --- config (mirrors the bridge defaults) ---
const HOME = { lat: 40.7484, lon: -73.9857 }; // Empire State Building, NYC
const GEOFENCE_RADIUS_M = 500;
const MAX_ALT_M = 120;
const TAKEOFF_MIN_BATTERY = 50;

// --- state (mirrors bridge state machine) ---
const state = {
  online: true,
  flight_status: "on_dock", // on_dock | flying | returning
  battery_pct: 100,
  gps_fix: true,
  lat: HOME.lat,
  lon: HOME.lon,
  altitude_m: 0,
  dist_from_home_m: 0,
  geofence_ok: true,
  recording: false,
};

// --- geo helpers ---
const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;
function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// offset HOME by meters north/east → {lat,lon}
function offset(lat, lon, north_m, east_m) {
  const dLat = north_m / R;
  const dLon = east_m / (R * Math.cos(toRad(lat)));
  return { lat: lat + toDeg(dLat), lon: lon + toDeg(dLon) };
}
function bearingPoint(lat, lon, dist_m, bearing_deg) {
  const br = toRad(bearing_deg), la = toRad(lat), lo = toRad(lon), dr = dist_m / R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la),
    Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return { lat: toDeg(la2), lon: toDeg(lo2) };
}

// --- safety gate: returns {ok, code, message} ---
function checkSafety(action, p) {
  if (!state.online) return { ok: false, code: 503, message: "drone offline — refused" };
  const flies = ["takeoff", "goto", "orbit", "set_altitude"].includes(action);

  if (action === "takeoff") {
    if (!p.confirm) return { ok: false, code: 422, message: "take-off requires confirm:true" };
    if (state.battery_pct < TAKEOFF_MIN_BATTERY)
      return { ok: false, code: 422, message: `battery ${state.battery_pct}% < ${TAKEOFF_MIN_BATTERY}% minimum` };
  }
  // altitude ceiling
  const alt = p.alt_m;
  if (flies && alt != null && alt > MAX_ALT_M)
    return { ok: false, code: 422, message: `altitude ${alt} m exceeds ceiling ${MAX_ALT_M} m` };
  // geofence for target-bearing actions
  if (action === "goto" && p.lat != null) {
    const d = haversine(HOME, { lat: p.lat, lon: p.lon });
    if (d > GEOFENCE_RADIUS_M)
      return { ok: false, code: 422, message: `target ${Math.round(d)} m from home exceeds geofence ${GEOFENCE_RADIUS_M} m` };
  }
  if (action === "orbit") {
    const r = p.radius_m || 60;
    if (r > GEOFENCE_RADIUS_M)
      return { ok: false, code: 422, message: `orbit radius ${r} m exceeds geofence ${GEOFENCE_RADIUS_M} m` };
  }
  return { ok: true, code: 200, message: "accepted" };
}

// --- animation to a target point/altitude ---
let anim = null;
function flyTo(target, alt, status, done) {
  if (anim) cancelAnimationFrame(anim);
  const from = { lat: state.lat, lon: state.lon, alt: state.altitude_m };
  const dur = 2200, t0 = performance.now();
  state.flight_status = status;
  function frame(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // easeInOutQuad
    state.lat = from.lat + (target.lat - from.lat) * e;
    state.lon = from.lon + (target.lon - from.lon) * e;
    if (alt != null) state.altitude_m = Math.round(from.alt + (alt - from.alt) * e);
    recompute();
    render();
    if (k < 1) anim = requestAnimationFrame(frame);
    else if (done) done();
  }
  anim = requestAnimationFrame(frame);
}

function recompute() {
  state.dist_from_home_m = Math.round(haversine(HOME, { lat: state.lat, lon: state.lon }));
  state.geofence_ok = state.dist_from_home_m <= GEOFENCE_RADIUS_M;
}

// --- the /command handler (returns bridge-shaped result) ---
function command(action, p = {}) {
  const gate = checkSafety(action, p);
  if (!gate.ok) return { ok: false, code: gate.code, message: gate.message, state: { ...state } };

  switch (action) {
    case "takeoff": {
      const alt = p.alt_m || 30;
      flyTo({ lat: HOME.lat, lon: HOME.lon }, alt, "flying");
      return ok(`taking off to ${alt} m hover`);
    }
    case "goto": {
      flyTo({ lat: p.lat, lon: p.lon }, p.alt_m ?? state.altitude_m, "flying");
      return ok("flying to target");
    }
    case "orbit": {
      const r = p.radius_m || 60, alt = p.alt_m ?? Math.max(state.altitude_m, 40);
      const pt = offset(HOME.lat, HOME.lon, r, 0);
      flyTo(pt, alt, "flying");
      return ok(`orbiting at ${r} m radius, ${alt} m`);
    }
    case "north": { // convenience → goto 200m north
      const pt = offset(HOME.lat, HOME.lon, 200, 0);
      flyTo(pt, state.altitude_m || 40, "flying");
      return ok("flying 200 m north");
    }
    case "set_altitude": {
      const alt = p.alt_m;
      flyTo({ lat: state.lat, lon: state.lon }, alt, state.flight_status === "on_dock" ? "flying" : state.flight_status);
      return ok(`changing altitude to ${alt} m`);
    }
    case "return_to_home": {
      flyTo({ lat: HOME.lat, lon: HOME.lon }, 0, "returning", () => {
        state.flight_status = "on_dock"; state.altitude_m = 0; recompute(); render();
      });
      return ok("returning to home and landing");
    }
    default:
      return { ok: false, code: 400, message: `unknown action ${action}`, state: { ...state } };
  }
  function ok(msg) { recompute(); return { ok: true, code: 200, message: msg, state: { ...state } }; }
}

/* ---------------- UI wiring ---------------- */

// map
const map = L.map("map", { zoomControl: true, attributionControl: false }).setView([HOME.lat, HOME.lon], 15);
L.tileLayer("https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 20 }).addTo(map);

// geofence ring + home
L.circle([HOME.lat, HOME.lon], {
  radius: GEOFENCE_RADIUS_M, color: "#2937f0", weight: 1.5,
  fillColor: "#2937f0", fillOpacity: 0.07, dashArray: "6 6",
}).addTo(map);
L.circleMarker([HOME.lat, HOME.lon], { radius: 6, color: "#12b76a", fillColor: "#12b76a", fillOpacity: 1 })
  .addTo(map).bindTooltip("🏠 Home / Dock", { permanent: false });

const droneIcon = L.divIcon({ className: "", html: '<div class="droneicon">🚁</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
const drone = L.marker([HOME.lat, HOME.lon], { icon: droneIcon }).addTo(map);
const trail = L.polyline([], { color: "#2937f0", weight: 2, opacity: 0.6 }).addTo(map);

// stats refs
const $ = (id) => document.getElementById(id);
function render() {
  drone.setLatLng([state.lat, state.lon]);
  if (state.flight_status !== "on_dock") trail.addLatLng([state.lat, state.lon]);
  if (state.flight_status === "on_dock") trail.setLatLngs([]);

  $("stStatus").textContent = state.flight_status.replace("_", " ");
  $("stStatus").className = "pill " + state.flight_status;
  $("stBatt").innerHTML = `${state.battery_pct}<small>%</small>`;
  const bb = $("battBar"); bb.style.width = state.battery_pct + "%";
  bb.style.background = state.battery_pct > 50 ? "var(--good)" : state.battery_pct > 20 ? "var(--warn)" : "var(--bad)";
  $("stAlt").innerHTML = `${state.altitude_m}<small> m</small>`;
  $("stDist").innerHTML = `${state.dist_from_home_m}<small> m</small>`;
  $("stGps").textContent = `${state.lat.toFixed(4)}, ${state.lon.toFixed(4)}`;
  const f = $("stFence");
  f.textContent = state.geofence_ok ? "OK" : "BREACH";
  f.className = "pill " + (state.geofence_ok ? "on_dock" : "returning");
}

// log
function log(kind, action, msg) {
  const row = document.createElement("div");
  row.className = "lrow " + kind;
  const t = new Date().toLocaleTimeString([], { hour12: false });
  row.innerHTML = `<span class="lt">${t}</span><span><b>${action}</b> — ${msg}</span>`;
  const box = $("log");
  box.prepend(row);
  while (box.children.length > 40) box.removeChild(box.lastChild);
}

// battery drain while flying
setInterval(() => {
  if (state.flight_status === "flying" || state.flight_status === "returning") {
    state.battery_pct = Math.max(0, state.battery_pct - 1);
    if (state.battery_pct <= 20 && state.flight_status === "flying") {
      log("evt", "auto-rth", `battery ${state.battery_pct}% → returning to home`);
      dispatch("rth");
    }
    render();
  }
}, 2500);

// button → command map
const MAP = {
  takeoff: ["takeoff", { confirm: true, alt_m: 30 }],
  orbit: ["orbit", { radius_m: 80, alt_m: 40 }],
  north: ["north", {}],
  climb: ["set_altitude", { alt_m: 100 }],
  far: ["goto", { lat: 40.90, lon: -73.98, alt_m: 60 }], // ~17 km → refused
  high: ["set_altitude", { alt_m: 200 }],               // → refused
  rth: ["return_to_home", {}],
};
function dispatch(key) {
  const [action, params] = MAP[key];
  const res = command(action, params);
  log(res.ok ? "ok" : "refused", action, res.ok ? res.message : `422 · ${res.message}`);
  render();
}
document.querySelectorAll(".btns button").forEach((b) => {
  b.addEventListener("click", () => dispatch(b.dataset.cmd));
});

// boot
recompute();
render();
log("evt", "bridge", "connected · simulator mode · no aircraft bound");
