import "./style.css";
import {
  effectiveGravity,
  displacedVolume,
  reynoldsNumber,
  fluidResistance,
} from "./fluid";
import { History } from "./history";
import { PendulumEngine, ENGINE_VERSION } from "./physics";
import type { PendulumState, SimulationMode } from "./types";

import { defaults, presets, fields, signed, allowed, domainMessage } from "./settings";

let params = { ...defaults };
let mode: SimulationMode = "angular";
let linkNotice = "";
try {
  const value = new URLSearchParams(location.search).get("setup");
  if (value) {
    const decoded = JSON.parse(value);
    for (const f of fields) {
      const v =
        decoded[f.key] ??
        (f.key === "fluidDensity" ||
        f.key === "fluidViscosity" ||
        f.key === "bobRadius"
          ? defaults[f.key]
          : undefined);
      const display = f.degrees ? (v * 180) / Math.PI : v;
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        !allowed(f.key, display)
      )
        throw Error("Invalid setting");
      params[f.key] = v;
    }
    if (![1 / 60, 1 / 120, 1 / 240, 1 / 480].includes(decoded.dt))
      throw Error("Invalid time step");
    params.dt = decoded.dt;
    if (!["angular", "cartesian"].includes(decoded.mode))
      throw Error("Invalid mode");
    new PendulumEngine(params);
    mode = decoded.mode;
    linkNotice = "Shared setup loaded. Press Play to begin.";
  }
} catch {
  params = { ...defaults };
  mode = "angular";
  linkNotice = "The shared settings were invalid; defaults have been restored.";
}
const app = document.querySelector<HTMLDivElement>("#app")!;
const inputMarkup = (f: (typeof fields)[number]) =>
  `<label for="${f.key}-input">${f.label} <span>${f.unit}</span></label><input id="${f.key}-input" type="number" ${signed.has(f.key) ? "" : 'min="0"'} step="any" inputmode="decimal">`;
app.innerHTML = `
<header><div><p class="eyebrow">A virtual physics laboratory</p><h1>Explore the pendulum</h1><p>Predict the motion. Change one thing. Explain what you observe.</p></div><nav><a id="compare-link" href="./compare.html" class="guide-link">Compare pendulums →</a> · <a href="#teacher-guide" class="guide-link">Teacher’s guide ↓</a></nav></header>
<main>
<section class="investigation" aria-labelledby="investigation-title"><div><h2 id="investigation-title">Start an investigation</h2><p id="question">How do length and release angle affect the period? Make a prediction before pressing Play.</p></div><div class="presets">${Object.entries(
  presets,
)
  .map(([id, p]) => `<button data-preset="${id}">${p.title}</button>`)
  .join("")}</div></section>
<div class="workspace"><aside class="card controls"><h2>Set up your experiment</h2><p class="hint">Changing a setting pauses and resets the run. Numeric inputs accept values beyond the presets, including scientific notation.</p><div class="fields">${fields.slice(0, 4).map(inputMarkup).join("")}</div>
<details><summary>Damping, driving & initial speed</summary><div class="fields">${fields.slice(4, 9).map(inputMarkup).join("")}</div><p class="hint">Damping coefficients describe torques, not forces. The drive torque is A sin(Ωt); Ω is in radians per second.</p></details>
<details id="fluid-controls"><summary>Air, water & oil experiments</summary><p class="hint">Density 0 switches the fluid model off. For a real fluid enter both density and dynamic viscosity; density alone cannot identify an oil.</p><div class="fields">${fields.slice(9).map(inputMarkup).join("")}</div><p class="hint">Sphere fully immersed in still fluid; buoyancy and approximate Reynolds-dependent drag. No free surface, added mass, fluid memory, container walls or rod drag. Named properties are illustrative inputs, not a material database.</p></details>
<details><summary>Numerical settings</summary><label for="mode-select">Coordinates used for calculation</label><select id="mode-select"><option value="angular">Angular equation</option><option value="cartesian">Constrained Cartesian equations</option></select><label for="dt-select">Output time step Δt (s)</label><select id="dt-select"><option value="0.016666666666666666">1/60</option><option value="0.008333333333333333">1/120</option><option value="0.004166666666666667">1/240</option><option value="0.0020833333333333333">1/480</option></select><p class="hint">Both methods use fourth-order Runge–Kutta with internal subdivision for fast motion or strong damping. Halve Δt to check numerical sensitivity.</p></details>
<button id="share-button" class="full">Copy setup link</button><label for="share-link" class="hint">Setup link (also available to copy manually)</label><input id="share-link" readonly type="text"><p id="notice" role="status"></p></aside>
<section class="card motion" aria-labelledby="motion-title"><div class="panel-heading"><h2 id="motion-title">Watch the motion</h2><span id="run-chip" class="badge">Paused</span></div>
<canvas id="simulation-canvas" width="800" height="600" aria-label="Pendulum motion. Use the release-angle input to set its position; live numerical values follow below.">Pendulum animation; live data are available below.</canvas>
<div class="transport"><button id="play-button" class="primary">Play</button><button id="step-button">Step once</button><button id="reset-button">Reset</button><label for="speed-select">Playback</label><select id="speed-select"><option value=".25">¼×</option><option value=".5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>
<div class="options"><label><input id="toggle-fit" type="checkbox" checked> Fit rod to view</label><label><input id="toggle-vectors" type="checkbox"> Show gravity & velocity</label><label><input id="toggle-reference" type="checkbox" checked> Show vertical reference</label></div><p class="hint">Drag the bob to release it from rest, or type a release angle. Fit-to-view changes magnification; turn it off to compare lengths visually. Vectors use separate visual scales. Playback changes viewing speed, not the physics time step.</p><p id="timing-note" class="hint"></p><p id="model-notice" class="hint" role="status"></p>
</section>
<section class="card analysis" aria-labelledby="graph-title"><h2 id="graph-title">Read the evidence</h2><div class="graph-controls"><label for="graph-select">Plot</label><select id="graph-select"><option value="theta">Angle θ (rad)</option><option value="omega">Angular velocity ω (rad/s)</option><option value="energy">Energy K, U, E (J)</option><option value="balance">Energy transfers (J)</option><option value="phase">Phase: ω against θ</option><option value="x">Horizontal position x (m)</option><option value="y">Downward position y (m)</option></select><label class="fit-all-control"><input id="fit-all-data" type="checkbox" checked> Fit all data (compress axis)</label><label for="window-select">Scrolling window</label><select id="window-select" disabled><option value="10">Last 10 s</option><option value="30">Last 30 s</option></select></div>
<canvas id="graph-canvas" width="800" height="460" aria-label="Selected graph with automatic axis scaling. Download CSV for the numerical data.">Download CSV for the plotted data.</canvas><p id="graph-caption" class="hint"></p><button id="export-button">Download CSV</button><p id="retention" class="hint"></p>
<label for="data-select">Live data view</label><select id="data-select"><option value="summary">Measurements & predictions</option><option value="motion">Motion in SI units</option><option value="energy">Energy accounting</option><option value="fluid">Fluid investigation</option></select><div id="live-data"></div></section></div>
<section class="card model" id="model"><h2>What model are we exploring?</h2><p>A point mass moves in a vertical plane on a massless, rigid rod of fixed length. The pivot is fixed. The default has no drag. Fluid experiments approximate a fully immersed spherical bob with buoyancy and Reynolds-dependent drag; optional b and c add extra damping torques. A rod can push as well as pull; a slack string is not modelled.</p><div class="equations"><p>mL² θ̈ = −(m − ρV)gL sin θ − bθ̇ − cθ̇|θ̇| − τfluid + A sin(Ωt)</p><p>K = ½mL²ω² &nbsp; U = (m − ρV)gL(1 − cos θ) &nbsp; E = K + U</p><p>E − E₀ = W<sub>drive</sub> − E<sub>dissipated</sub></p></div><p>Angle θ is measured from the downward vertical, positive toward the right. The graph retains continuous angle through rotations. Cartesian coordinates are x = L sin θ and y = L cos θ, with y positive downward; effective potential energy is zero at the lowest point. In a fluid, U includes buoyancy; it can be negative for a buoyant bob.</p><p>The small-angle prediction is T₀ = 2π√(L/g_eff), where g_eff = g(1 − ρV/m) and V = 4πr³/3. In a fluid this is an undamped reference, not a damped-period prediction. It is unavailable when g_eff ≤ 0. For an undamped, undriven release from rest with |θ₀| &lt; π, the finite-amplitude prediction is T = 4√(L/g) K(sin²(θ₀/2)), where K uses the elliptic parameter convention. Predictions are unavailable when their assumptions do not apply.</p></section>
<section class="card" id="fluid-experiments"><p class="eyebrow">Design your own experiment</p><h2>What changes when water is replaced by oil?</h2><p>Use the same sphere (mass 0.10 kg, radius 0.025 m), length 0.75 m and release angle 30°. Air, water and oil presets keep the bob and release identical. Preset fluid values are illustrative: oil properties depend on composition and temperature.</p><div class="lessons"><article><h3>1. Change density only</h3><p>Choose Under water. Hold μ = 0.001 Pa s fixed and test ρ = 800, 1000 and 1200 kg/m³. Predict effective gravity before each run. Record the undamped period reference, recent crossing intervals and energy after 5 s. Does density also change drag through Reynolds number?</p></article><article><h3>2. Change viscosity only</h3><p>Hold ρ = 900 kg/m³ fixed. Test μ = 0.001, 0.01 and 0.10 Pa s. Record the first three peak angles or the time the amplitude first falls below 5°. Buoyancy stays fixed. Is the more viscous case slower to oscillate, quicker to settle, or both?</p></article><article><h3>3. Replace water by oil</h3><p>Compare Under water and Oil. Both ρ and μ change, so this comparison alone cannot isolate either effect. Repeat the density-only and viscosity-only experiments to explain the combined result. Export CSV before switching settings; a new setting starts a fresh run.</p></article><article><h3>4. Can the bob rise?</h3><p>Choose A buoyant bob. Compare m/(4πr³/3) with ρ. Predict which direction the rod moves. Locate neutral buoyancy by setting fluid density equal to bob density. A rigid rod can push; this is not a bob floating at a free surface.</p></article></div><p><a href="./fluid-experiment-sheet.csv" download>Download the experiment recording sheet (CSV)</a></p><p><strong>Suggested record:</strong> fluid density; dynamic viscosity; bob density; effective gravity; crossing interval (if oscillations occur); peak-angle decay; energy dissipated. If the bob does not complete two crossings, report “no measured interval”, rather than inventing a period. Plan repeat runs and halve the time step to assess numerical sensitivity.</p><p class="hint">Model scope: a small sphere fully immersed in a large, still fluid. Drag is quasi-steady; added mass, oscillatory fluid memory, walls, rod drag and free-surface effects are omitted. Use the fluid scenarios for controlled model investigations; real-water/oil predictions require further experimental validation.</p></section>
<section class="card" id="teacher-guide"><p class="eyebrow">Predict → observe → explain → test again</p><h2>A lesson built around evidence</h2><div class="lessons"><article><h3>1. What sets the period?</h3><p>Choose Small oscillations. Record periods for three lengths, holding g and release angle fixed. Plot T² against L. Repeat at a different mass. Explain the pattern using the equation of motion.</p></article><article><h3>2. When does the approximation fail?</h3><p>Compare releases at 10°, 30°, 60° and 90°. Wait for two positive-going crossings. Calculate 100(T − T₀)/T₀. Decide what “small” means for a chosen percentage tolerance.</p></article><article><h3>3. Follow the energy</h3><p>Choose Losing energy and plot Energy transfers. Identify where mechanical energy goes. Repeat with b = 0 and c &gt; 0. Explain why equal damping coefficients do not imply equal torques.</p></article><article><h3>4. Check your evidence</h3><p>Repeat a run with half the time step and the other coordinate method. Compare exported data at matching times. Agreement supports a numerical calculation; it does not establish that the ideal model describes every real pendulum.</p></article></div><p>For a real pendulum, measure length from pivot to the bob’s centre, time several swings, and estimate measurement uncertainty. Discuss pivot friction, finite bob size and air resistance. These activities are teaching suggestions; learning gains have not been measured.</p><details><summary>Teacher notes and numerical limitations</summary><p>Measured period averages up to three intervals between linearly interpolated, positive-going zero crossings. For damped or driven motion it is a recent crossing interval, not a claim of a natural or steady-state period. After a top crossing, oscillation-period reporting is disabled until reset. Near equilibrium, use the theoretical small-angle limit rather than measuring negligible oscillations.</p><p>The solver is not symplectic and exact energy conservation is not guaranteed. The energy-balance residual tests E − E₀ − Wdrive + Edissipated. Numerical validation covers finite runs and specified parameter sets, not every possible trajectory. Sensitive driven motion can diverge over long times. The full run is retained until Reset or a setting change. Large graphs use extrema-preserving summaries; CSV exports include every original sample. Memory use grows with run length.</p><p>This revised implementation was developed with AI assistance and numerical checks. The original development history and this correction cycle should be described separately in any publication.</p></details></section>
<section class="card" style="margin-top:24px"><h2>Ready to check what you learned?</h2><p>Complete Part One, then continue to the harder Part Two. Answer one question at a time. Get feedback, read why the answer is correct, and explore a matching pair of simulations.</p><a href="./quiz.html" class="guide-link">Start the learning check →</a></section></main><footer>Nonlinear Pendulum Laboratory · version ${ENGINE_VERSION} · <a href="https://github.com/ishwrknt/2D-Nonlinear-Simple-Pendulum-Simulation">Source repository</a> · <a href="https://ishwrknt.github.io/2D-Nonlinear-Simple-Pendulum-Simulation/">Public simulation</a><p>Explore the laboratory, then try both learning-check parts.</p></footer>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const engine = new PendulumEngine(params);
engine.setMode(mode);
let running = false,
  accumulator = 0,
  lastFrame = 0,
  lastPaint = 0;
const history = new History<PendulumState>((s) => [
  s.theta,
  s.omega,
  s.kineticEnergy,
  s.potentialEnergy,
  s.totalEnergy,
  s.driveWork,
  s.dissipatedEnergy,
  s.x,
  s.y,
]);
function record(s: PendulumState) {
  history.push(s);
}
function chronological() {
  return history.values();
}
function syncInputs() {
  for (const f of fields)
    el<HTMLInputElement>(`${f.key}-input`).value = String(
      Number(
        ((params[f.key] ?? 0) * (f.degrees ? 180 / Math.PI : 1)).toPrecision(
          12,
        ),
      ),
    );
  el<HTMLSelectElement>("mode-select").value = mode;
  el<HTMLSelectElement>("dt-select").value = String(params.dt);
  updateLink();
}
function pause() {
  running = false;
  accumulator = 0;
  el("run-chip").textContent = "Paused";
  el("play-button").textContent = "Play";
}
function reset() {
  pause();
  try {
    new PendulumEngine(params);
  } catch (error) {
    params = engine.getParameters();
    syncInputs();
    el("notice").textContent = String(error);
    return false;
  }
  engine.setParameters(params);
  engine.setMode(mode);
  history.clear();
  record(engine.getState());
  el("timing-note").textContent = "";
  syncInputs();
  render();
  return true;
}
function updateLink() {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("setup", JSON.stringify({ ...params, mode }));
  url.hash = "";
  el<HTMLInputElement>("share-link").value = url.href;
  const comparison = new URL("./compare.html", location.href);
  comparison.searchParams.set("setup", JSON.stringify(params));
  el<HTMLAnchorElement>("compare-link").href = comparison.href;
}
function advance() {
  try {
    record(engine.step());
  } catch (error) {
    pause();
    el("notice").textContent = String(error);
  }
}
for (const f of fields)
  el<HTMLInputElement>(`${f.key}-input`).addEventListener("change", () => {
    const input = el<HTMLInputElement>(`${f.key}-input`);
    const v = Number(input.value);
    if (
      input.value.trim() === "" ||
      !Number.isFinite(v) ||
      !allowed(f.key, v)
    ) {
      input.setCustomValidity(domainMessage(f.key));
      input.reportValidity();
      pause();
      return;
    }
    input.setCustomValidity("");
    params[f.key] = v * (f.degrees ? Math.PI / 180 : 1);
    if (!reset()) return;
    el("notice").textContent = "Setting applied; the experiment has reset.";
  });
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-preset]"))
  b.addEventListener("click", () => {
    const p = presets[b.dataset.preset!];
    params = { ...defaults, ...p.params };
    el("question").textContent = p.question;
    for (const f of fields)
      el<HTMLInputElement>(`${f.key}-input`).setCustomValidity("");
    reset();
    el<HTMLDetailsElement>("fluid-controls").open =
      (params.fluidDensity ?? 0) > 0;
    el<HTMLSelectElement>("data-select").value =
      (params.fluidDensity ?? 0) > 0 ? "fluid" : "summary";
    render();
    el("notice").textContent = `${p.title} loaded.`;
  });
el("mode-select").addEventListener("change", () => {
  mode = el<HTMLSelectElement>("mode-select").value as SimulationMode;
  reset();
});
el("dt-select").addEventListener("change", () => {
  params.dt = Number(el<HTMLSelectElement>("dt-select").value);
  reset();
});
el("play-button").addEventListener("click", () => {
  if (running) pause();
  else {
    if (
      fields.some(
        (f) => !el<HTMLInputElement>(`${f.key}-input`).reportValidity(),
      )
    )
      return;
    running = true;
    el("run-chip").textContent = "Running";
    el("play-button").textContent = "Pause";
  }
  render();
});
el("step-button").addEventListener("click", () => {
  pause();
  advance();
  render();
});
el("reset-button").addEventListener("click", reset);
for (const id of [
  "graph-select",
  "window-select",
  "fit-all-data",
  "toggle-vectors",
  "toggle-reference",
  "toggle-fit",
  "data-select",
])
  el(id).addEventListener("change", render);
el("share-button").addEventListener("click", async () => {
  updateLink();
  try {
    await navigator.clipboard.writeText(
      el<HTMLInputElement>("share-link").value,
    );
    el("notice").textContent = "Setup link copied.";
  } catch {
    el<HTMLInputElement>("share-link").select();
    el("notice").textContent = "Select and copy the setup link above.";
  }
});
el("export-button").addEventListener("click", () => {
  const data = chronological();
  const keys: (keyof PendulumState)[] = [
    "time",
    "theta",
    "omega",
    "alpha",
    "x",
    "y",
    "vx",
    "vy",
    "kineticEnergy",
    "potentialEnergy",
    "totalEnergy",
    "driveWork",
    "dissipatedEnergy",
  ];
  const csv = [
    `# Nonlinear Pendulum Laboratory ${ENGINE_VERSION}`,
    `# mode=${mode}; parameters=${JSON.stringify(params)}`,
    `# retained=${data.length}; total=${history.total}; interval_s=${data[0].time}..${data.at(-1)!.time}`,
    `# SI units; theta rad; omega rad/s; alpha rad/s^2; x,y m (y downward); vx,vy m/s; energies and work J`,
    keys.join(","),
    ...data.map((s) => keys.map((k) => s[k]).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `pendulum-${mode}-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const canvas = el<HTMLCanvasElement>("simulation-canvas"),
  ctx = canvas.getContext("2d")!;
const graph = el<HTMLCanvasElement>("graph-canvas"),
  gc = graph.getContext("2d")!;
const pivot = { x: 400, y: 275 };
function bob(s: PendulumState) {
  const scale = el<HTMLInputElement>("toggle-fit").checked
    ? 225 / params.length
    : 225 / 2;
  return { x: pivot.x + s.x * scale, y: pivot.y + s.y * scale };
}
let dragging = false;
function drag(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width - pivot.x,
    y = ((event.clientY - rect.top) * canvas.height) / rect.height - pivot.y;
  if (Math.hypot(x, y) < 5) return;
  params.initialAngle =
    (Math.max(-179, Math.min(179, (Math.atan2(x, y) * 180) / Math.PI)) *
      Math.PI) /
    180;
  params.initialOmega = 0;
  reset();
}
canvas.addEventListener("pointerdown", (event) => {
  const r = canvas.getBoundingClientRect(),
    b = bob(engine.getState());
  if (
    Math.hypot(
      ((event.clientX - r.left) * 800) / r.width - b.x,
      ((event.clientY - r.top) * 600) / r.height - b.y,
    ) > 36
  )
    return;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  drag(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (dragging) drag(event);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(event, () => {
    dragging = false;
  });
function arrow(
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  label: string,
) {
  const length = Math.hypot(dx, dy);
  if (length < 1e-8) return;
  const limit = Math.min(1, 110 / length);
  dx *= limit;
  dy *= limit;
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(
    x + dx - 10 * Math.cos(angle - 0.4),
    y + dy - 10 * Math.sin(angle - 0.4),
  );
  ctx.lineTo(
    x + dx - 10 * Math.cos(angle + 0.4),
    y + dy - 10 * Math.sin(angle + 0.4),
  );
  ctx.fill();
  ctx.font = "18px system-ui";
  ctx.fillText(label, x + dx + 8, y + dy);
}
function renderMotion() {
  const s = engine.getState(),
    b = bob(s);
  ctx.clearRect(0, 0, 800, 600);
  ctx.fillStyle =
    (params.fluidDensity ?? 0) === 0
      ? "#f7faf8"
      : (params.fluidViscosity ?? 0) >= 0.05
        ? "#fbf1d9"
        : "#e7f3fa";
  ctx.fillRect(0, 0, 800, 600);
  ctx.strokeStyle = "#e0e8e4";
  ctx.lineWidth = 1;
  for (let x = 40; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 35; y < 600; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }
  if (el<HTMLInputElement>("toggle-reference").checked) {
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "#90a49a";
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(pivot.x, 560);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = "#334f46";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.fillStyle = "#253d35";
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 7, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#087e70";
  ctx.beginPath();
  ctx.arc(b.x, b.y, 18 + Math.sqrt(params.mass) * 3, 0, 2 * Math.PI);
  ctx.fill();
  if (el<HTMLInputElement>("toggle-vectors").checked) {
    arrow(b.x, b.y, 0, params.gravity * params.mass * 80, "#b34a29", "mg");
    if ((params.fluidDensity ?? 0) > 0)
      arrow(
        b.x,
        b.y,
        0,
        -(params.fluidDensity ?? 0) *
          displacedVolume(params) *
          params.gravity *
          80,
        "#7c4db4",
        "buoyancy",
      );
    arrow(b.x, b.y, s.vx * 35, s.vy * 35, "#3d60b3", "v");
  }
  ctx.fillStyle = "#253d35";
  ctx.font = "20px system-ui";
  ctx.fillText(`t = ${s.time.toFixed(3)} s`, 24, 34);
  ctx.fillText(`θ = ${((s.theta * 180) / Math.PI).toFixed(1)}°`, 24, 65);
  ctx.font = "16px system-ui";
  ctx.fillText(
    `${el<HTMLInputElement>("toggle-fit").checked ? "Rod fitted to view" : "Fixed spatial scale"} · L = ${params.length.toFixed(2)} m`,
    24,
    578,
  );
  canvas.dataset.bobX = String(b.x);
  canvas.dataset.bobY = String(b.y);
}
const fmt = (v: number | null, digits = 4) =>
  v === null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
function renderData() {
  const s = engine.getState(),
    d = engine.getDerivedMetrics();
  const periodValid =
    Math.abs(s.theta) + Math.abs(s.omega) > 1e-7 && !d.hasRotated;
  const summary = [
    ["Time (s)", fmt(s.time, 5)],
    ["Angle (rad)", fmt(s.theta)],
    ["Angular velocity (rad/s)", fmt(s.omega)],
    ["Mechanical energy E (J)", fmt(s.totalEnergy, 6)],
    [
      "Recent crossing interval (s)",
      fmt(periodValid ? d.estimatedPeriod : null, 5),
    ],
    ["Small-angle prediction T₀ (s)", fmt(d.theoreticalPeriod, 5)],
    ["Finite-amplitude prediction (s)", fmt(d.exactPeriod, 5)],
    ["Energy-balance residual (J)", d.energyBalanceError.toExponential(3)],
  ];
  const view = el<HTMLSelectElement>("data-select").value;
  const rows =
    view === "fluid"
      ? [
          ["Fluid density (kg/m³)", fmt(params.fluidDensity ?? 0, 2)],
          [
            "Dynamic viscosity (Pa s)",
            (params.fluidViscosity ?? 0.001).toPrecision(4),
          ],
          [
            "Bob density (kg/m³)",
            fmt(params.mass / displacedVolume(params), 2),
          ],
          ["Effective gravity (m/s²)", fmt(effectiveGravity(params))],
          [
            "Buoyancy (N)",
            fmt(
              (params.fluidDensity ?? 0) *
                displacedVolume(params) *
                params.gravity,
              5,
            ),
          ],
          ["Reynolds number", fmt(reynoldsNumber(params, s.omega), 2)],
          [
            "Fluid drag torque magnitude (N m)",
            fmt(fluidResistance(params, s.omega) * Math.abs(s.omega), 6),
          ],
        ]
      : view === "motion"
        ? [
            ["Time (s)", fmt(s.time, 5)],
            ["Angle (rad)", fmt(s.theta, 6)],
            ["Angular velocity (rad/s)", fmt(s.omega, 6)],
            ["Angular acceleration (rad/s²)", fmt(s.alpha, 6)],
            ["Horizontal position x (m)", fmt(s.x, 6)],
            ["Downward position y (m)", fmt(s.y, 6)],
            ["Horizontal velocity (m/s)", fmt(s.vx, 6)],
            ["Downward velocity (m/s)", fmt(s.vy, 6)],
          ]
        : view === "energy"
          ? [
              ["Time (s)", fmt(s.time, 5)],
              ["Kinetic energy K (J)", fmt(s.kineticEnergy, 6)],
              ["Potential energy U (J)", fmt(s.potentialEnergy, 6)],
              ["Mechanical energy E (J)", fmt(s.totalEnergy, 6)],
              ["Initial energy E₀ (J)", fmt(d.initialEnergy, 6)],
              ["Drive work (J)", fmt(s.driveWork, 6)],
              ["Energy dissipated (J)", fmt(s.dissipatedEnergy, 6)],
              [
                "Energy-balance residual (J)",
                d.energyBalanceError.toExponential(3),
              ],
            ]
          : summary;
  el("live-data").innerHTML =
    `<h3>${view === "fluid" ? "Fluid investigation" : view === "motion" ? "Motion" : view === "energy" ? "Energy accounting" : "Measurements & predictions"}</h3><table><tbody>${rows.map(([label, v]) => `<tr><th scope="row">${label}</th><td>${v}</td></tr>`).join("")}</tbody></table><p class="hint">${d.hasRotated ? "The bob passed the top; no oscillation period is reported." : !periodValid ? "Motion is negligible; a crossing interval is not meaningful." : d.estimatedPeriod === null ? "Wait for two positive-going zero crossings to measure an interval." : d.conservative ? "Crossing interval averaged over the last available complete oscillations." : "For damped or driven motion, crossing intervals need not be constant."} Finite-amplitude prediction requires a conservative release from rest.</p>${(params.fluidDensity ?? 0) > 0 ? `<p class="hint">Fluid model: still fluid and fully immersed sphere. ${effectiveGravity(params) <= 0 ? "Buoyancy cancels or reverses the restoring torque; no downward oscillation reference applies." : "Small-angle period is an undamped buoyancy-adjusted reference."} ${reynoldsNumber(params, s.omega) > 200000 ? "High Reynolds number: drag correlation is outside its usual useful range." : ""} Energy includes the buoyancy potential; dissipation includes fluid drag.</p>` : ""}`;
}
function renderGraph() {
  const all = chronological(),
    selection = el<HTMLSelectElement>("graph-select").value,
    windowValue = el<HTMLInputElement>("fit-all-data").checked
      ? "all"
      : el<HTMLSelectElement>("window-select").value;
  el<HTMLSelectElement>("window-select").disabled = windowValue === "all";
  const last = all.at(-1)!.time;
  const data =
    windowValue === "all"
      ? history.plotValues()
      : history.window(last - Number(windowValue), (s) => s.time);
  const series: { name: string; color: string; values: number[] }[] =
    selection === "energy"
      ? [
          {
            name: "K",
            color: "#b34a29",
            values: data.map((s) => s.kineticEnergy),
          },
          {
            name: "U",
            color: "#3d60b3",
            values: data.map((s) => s.potentialEnergy),
          },
          {
            name: "E",
            color: "#087e70",
            values: data.map((s) => s.totalEnergy),
          },
        ]
      : selection === "balance"
        ? [
            {
              name: "E",
              color: "#087e70",
              values: data.map((s) => s.totalEnergy),
            },
            {
              name: "Drive work",
              color: "#3d60b3",
              values: data.map((s) => s.driveWork),
            },
            {
              name: "Dissipated",
              color: "#b34a29",
              values: data.map((s) => s.dissipatedEnergy),
            },
          ]
        : [
            {
              name:
                selection === "phase"
                  ? "ω"
                  : selection === "theta"
                    ? "θ"
                    : selection === "omega"
                      ? "ω"
                      : selection,
              color: "#087e70",
              values: data.map(
                (s) =>
                  s[
                    selection === "phase"
                      ? "omega"
                      : (selection as "theta" | "omega" | "x" | "y")
                  ],
              ),
            },
          ];
  const xs = data.map((s) => (selection === "phase" ? s.theta : s.time));
  let xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  if (xmax - xmin < 1e-9) xmax = xmin + 1;
  let ymin = Infinity,
    ymax = -Infinity;
  for (const line of series)
    for (const v of line.values) {
      ymin = Math.min(ymin, v);
      ymax = Math.max(ymax, v);
    }
  const pad = Math.max(
    (ymax - ymin) * 0.12,
    Math.max(Math.abs(ymin), Math.abs(ymax)) * 0.001,
    1e-5,
  );
  ymin -= pad;
  ymax += pad;
  gc.clearRect(0, 0, 800, 460);
  gc.fillStyle = "#fff";
  gc.fillRect(0, 0, 800, 460);
  gc.font = "16px system-ui";
  const X = (v: number) => 100 + ((v - xmin) / (xmax - xmin)) * 665,
    Y = (v: number) => 390 - ((v - ymin) / (ymax - ymin)) * 330;
  for (let i = 0; i <= 4; i++) {
    const y = ymin + ((ymax - ymin) * i) / 4,
      x = xmin + ((xmax - xmin) * i) / 4;
    gc.strokeStyle = "#e1e8e4";
    gc.beginPath();
    gc.moveTo(100, Y(y));
    gc.lineTo(765, Y(y));
    gc.stroke();
    gc.fillStyle = "#435e53";
    gc.textAlign = "right";
    gc.fillText(
      Math.abs(y) < 0.001 && y !== 0 ? y.toExponential(1) : y.toFixed(2),
      90,
      Y(y) + 5,
    );
    gc.textAlign = "center";
    gc.fillText(x.toFixed(2), X(x), 416);
  }
  series.forEach((line, index) => {
    gc.strokeStyle = line.color;
    gc.lineWidth = 2.5;
    gc.setLineDash(index === 1 ? [8, 4] : index === 2 ? [3, 3] : []);
    gc.beginPath();
    line.values.forEach((v, i) => {
      if (i === 0) gc.moveTo(X(xs[i]), Y(v));
      else gc.lineTo(X(xs[i]), Y(v));
    });
    gc.stroke();
    gc.setLineDash([]);
    gc.fillStyle = line.color;
    gc.textAlign = "left";
    gc.fillText(line.name, 100 + index * 180, 28);
  });
  gc.fillStyle = "#435e53";
  gc.textAlign = "center";
  gc.fillText(selection === "phase" ? "Angle θ (rad)" : "Time (s)", 430, 450);
  const labels: Record<string, string> = {
    theta: "Angle θ (rad)",
    omega: "Angular velocity ω (rad/s)",
    energy: "Energy (J): solid K, dashed U, dotted E",
    balance:
      "Energy transfers (J): solid E, dashed drive work, dotted dissipation",
    phase: "Angular velocity ω (rad/s) against angle θ (rad)",
    x: "Horizontal position x (m)",
    y: "Downward position y (m)",
  };
  el("graph-caption").textContent =
    `${labels[selection]}. ${windowValue === "all" ? "Fit all data: axis compressed to include the full run. Large plots preserve extrema while reducing drawing points; CSV contains every sample." : `Showing the last ${windowValue} seconds.`} Axes scale automatically to the visible data; compare axis values when changing settings.`;
  el("retention").textContent =
    `${all.length.toLocaleString()} of ${history.total.toLocaleString()} samples recorded (${all[0].time.toFixed(3)}–${last.toFixed(3)} s). Full run preserved; CSV includes every sample. ${data.length.toLocaleString()} points used for this plot.`;
}
function render() {
  const warnings: string[] = [];
  if (
    (params.fluidDensity ?? 0) > 0 &&
    (params.bobRadius ?? 0.025) / params.length > 0.1
  )
    warnings.push(
      "Sphere radius is large relative to rod length: the small-bob approximation may be inaccurate.",
    );
  if (params.length > 2 && !el<HTMLInputElement>("toggle-fit").checked)
    warnings.push("Enable Fit rod to view to keep this long pendulum visible.");
  el("model-notice").textContent = warnings.join(" ");
  renderMotion();
  renderGraph();
  renderData();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) {
    pause();
    el("notice").textContent = "Paused while the page is hidden.";
  }
});
function frame(now: number) {
  const elapsed = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  if (running) {
    accumulator +=
      Math.min(elapsed, 0.1) *
      Number(el<HTMLSelectElement>("speed-select").value);
    let count = 0;
    while (accumulator >= params.dt && running && count < 120) {
      advance();
      accumulator -= params.dt;
      count++;
    }
    if (elapsed > 0.1 || accumulator > params.dt * 120) {
      el("timing-note").textContent =
        "Playback slowed to keep the calculation responsive. Read simulation time, not wall-clock time.";
      accumulator = Math.min(accumulator, params.dt * 120);
    }
  }
  if (now - lastPaint >= 50) {
    render();
    lastPaint = now;
  }
  requestAnimationFrame(frame);
}
reset();
if ((params.fluidDensity ?? 0) > 0) {
  el<HTMLDetailsElement>("fluid-controls").open = true;
  el<HTMLSelectElement>("data-select").value = "fluid";
  render();
}
el("notice").textContent = linkNotice;
requestAnimationFrame(frame);
