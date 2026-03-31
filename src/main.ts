import "./styles.css";
import { RingBuffer1D, RingBuffer2D } from "./graph";
import { PendulumEngine } from "./physics";
import type { GraphMode, GraphTimeScaleMode, Parameters, PendulumState, SimulationMode, VisualToggles } from "./types";

const DEFAULT_PARAMS: Parameters = {
  mass: 1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0.08,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 2.75,
  dt: 1 / 240,
  initialAngle: 0.9,
};

const TIME_WINDOW = 12;
const MAX_RENDER_LENGTH = 1;
const MIN_RENDER_LENGTH = 0.2;
const BOB_TO_LENGTH_RATIO = 0.12;
const STEP_ADVANCE_SECONDS = 0.1;

interface RenderGeometry {
  pivotX: number;
  pivotY: number;
  pixelsPerMeter: number;
  bobRadius: number;
}

interface FixedRange {
  min: number;
  max: number;
}

interface FixedPhaseRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = `
  <div class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Deterministic • Symplectic-ish • Educational</p>
        <h1>2D Nonlinear Simple Pendulum Simulation</h1>
        <p class="lede">Canvas motion, force vectors, live energy accounting, selectable graphs, and fixed-step ring-buffer sampling.</p>
      </div>
      <div class="hero-badge">
        <span>Velocity Verlet</span>
        <span>10,000 samples</span>
        <span>Static deployable</span>
      </div>
    </header>
    <main class="layout">
      <section class="left-column">
        <div class="panel controls-panel">
          <h2>Controls</h2>
          <div class="control-grid">
            <label>
              Simulation mode
              <select id="mode-select">
                <option value="angular">Angular</option>
                <option value="cartesian">Cartesian</option>
              </select>
            </label>
            <label>
              Graph mode
              <select id="graph-select">
                <option value="theta">θ(t)</option>
                <option value="omega">ω(t)</option>
                <option value="energy">E(t)</option>
                <option value="phase">Phase space</option>
                <option value="x">x(t)</option>
                <option value="y">y(t)</option>
              </select>
            </label>
            <label>
              Length
              <input id="length-input" type="range" min="${MIN_RENDER_LENGTH}" max="${MAX_RENDER_LENGTH}" step="0.02" value="${DEFAULT_PARAMS.length}" />
              <span id="length-output"></span>
            </label>
            <label>
              Gravity
              <input id="gravity-input" type="range" min="1" max="20" step="0.1" value="${DEFAULT_PARAMS.gravity}" />
              <span id="gravity-output"></span>
            </label>
            <label>
              Linear damping b
              <input id="linear-input" type="range" min="0" max="0.8" step="0.01" value="${DEFAULT_PARAMS.linearDamping}" />
              <span id="linear-output"></span>
            </label>
            <label>
              Drive amplitude A
              <input id="drive-amplitude-input" type="range" min="0" max="4" step="0.05" value="${DEFAULT_PARAMS.driveAmplitude}" />
              <span id="drive-amplitude-output"></span>
            </label>
            <label>
              Drive ωd
              <input id="drive-omega-input" type="range" min="0" max="8" step="0.05" value="${DEFAULT_PARAMS.driveOmega}" />
              <span id="drive-omega-output"></span>
            </label>
            <label>
              Initial angle
              <input id="initial-angle-input" type="range" min="-3.0" max="3.0" step="0.01" value="${DEFAULT_PARAMS.initialAngle}" />
              <span id="initial-angle-output"></span>
            </label>
          </div>
          <div class="button-row">
            <button id="play-button" type="button">Play</button>
            <button id="pause-button" type="button">Pause</button>
            <button id="step-button" type="button">Step</button>
            <button id="reset-button" type="button">Reset</button>
          </div>
        </div>
      </section>
      <section class="center-column">
        <div class="canvas-panel panel">
          <div class="panel-head">
            <h2>Simulation Canvas</h2>
            <div class="canvas-toolbar">
              <div class="status-row">
                <span id="mode-chip" class="chip">Angular</span>
                <span id="run-chip" class="chip chip-live">Running</span>
              </div>
              <div class="canvas-toggles">
                <label><input id="toggle-forces" type="checkbox" checked /> Forces</label>
                <label><input id="toggle-energy" type="checkbox" checked /> Energy</label>
              </div>
            </div>
          </div>
          <canvas id="simulation-canvas" width="960" height="640"></canvas>
        </div>
      </section>
      <section class="right-column">
        <div class="panel graph-panel">
          <div class="panel-head">
            <div>
              <h2>Graph Panel</h2>
              <span id="graph-caption" class="caption"></span>
            </div>
            <label class="graph-scale-control">
              Time axis
              <select id="graph-time-scale-select">
                <option value="scroll">Scroll</option>
                <option value="compress">Compress to fit</option>
              </select>
            </label>
          </div>
          <canvas id="graph-canvas" width="960" height="420"></canvas>
        </div>
        <div id="data-panel" class="panel data-panel">
          <h2>Live Data</h2>
          <div id="instant-table"></div>
          <div id="derived-table"></div>
        </div>
      </section>
    </main>
  </div>
`;

const simulationCanvas = must<HTMLCanvasElement>("#simulation-canvas");
const graphCanvas = must<HTMLCanvasElement>("#graph-canvas");
const simulationCtx = require2DContext(simulationCanvas);
const graphCtx = require2DContext(graphCanvas);

const engine = new PendulumEngine(DEFAULT_PARAMS);
const thetaGraph = new RingBuffer1D();
const omegaGraph = new RingBuffer1D();
const energyGraph = new RingBuffer1D();
const xGraph = new RingBuffer1D();
const yGraph = new RingBuffer1D();
const phaseGraph = new RingBuffer2D();

const modeSelect = must<HTMLInputElement | HTMLSelectElement>("#mode-select");
const graphSelect = must<HTMLInputElement | HTMLSelectElement>("#graph-select");
const graphTimeScaleSelect = must<HTMLInputElement | HTMLSelectElement>("#graph-time-scale-select");
const playButton = must<HTMLButtonElement>("#play-button");
const pauseButton = must<HTMLButtonElement>("#pause-button");
const stepButton = must<HTMLButtonElement>("#step-button");
const resetButton = must<HTMLButtonElement>("#reset-button");

const parameterInputs = {
  length: bindRange("length-input", "length-output", (value) => `${value.toFixed(2)} m`),
  gravity: bindRange("gravity-input", "gravity-output", (value) => `${value.toFixed(2)} m/s²`),
  linearDamping: bindRange("linear-input", "linear-output", (value) => value.toFixed(2)),
  driveAmplitude: bindRange("drive-amplitude-input", "drive-amplitude-output", (value) => `${value.toFixed(2)} N·m`),
  driveOmega: bindRange("drive-omega-input", "drive-omega-output", (value) => `${value.toFixed(2)} rad/s`),
  initialAngle: bindRange("initial-angle-input", "initial-angle-output", (value) => `${value.toFixed(2)} rad`),
};

const instantTable = must<HTMLDivElement>("#instant-table");
const derivedTable = must<HTMLDivElement>("#derived-table");
const dataPanel = must<HTMLDivElement>("#data-panel");
const graphCaption = must<HTMLSpanElement>("#graph-caption");
const modeChip = must<HTMLSpanElement>("#mode-chip");
const runChip = must<HTMLSpanElement>("#run-chip");

const toggles: VisualToggles = {
  showForces: true,
  showEnergy: true,
};

bindToggle("toggle-forces", (checked) => {
  toggles.showForces = checked;
});
bindToggle("toggle-energy", (checked) => {
  toggles.showEnergy = checked;
});

let running = true;
let accumulator = 0;
let previousTimestamp = 0;
let graphMode: GraphMode = "theta";
let graphTimeScaleMode: GraphTimeScaleMode = "scroll";
let simulationMode: SimulationMode = "angular";
let dragging = false;
let fixedRanges: Record<Exclude<GraphMode, "phase">, FixedRange>;
let fixedPhaseRange: FixedPhaseRange;

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }
  return node;
}

function require2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas 2D context unavailable.");
  }
  return context;
}

function bindRange(id: string, outputId: string, formatter: (value: number) => string) {
  const input = must<HTMLInputElement>(`#${id}`);
  const output = must<HTMLSpanElement>(`#${outputId}`);
  const update = () => {
    output.textContent = formatter(Number(input.value));
  };
  update();
  input.addEventListener("input", update);
  return input;
}

function bindToggle(id: string, onChange: (checked: boolean) => void): void {
  const input = must<HTMLInputElement>(`#${id}`);
  input.addEventListener("change", () => {
    onChange(input.checked);
    syncPanels();
  });
}

function currentParameters(): Parameters {
  return {
    mass: DEFAULT_PARAMS.mass,
    length: Number(parameterInputs.length.value),
    gravity: Number(parameterInputs.gravity.value),
    linearDamping: Number(parameterInputs.linearDamping.value),
    quadraticDamping: DEFAULT_PARAMS.quadraticDamping,
    driveAmplitude: Number(parameterInputs.driveAmplitude.value),
    driveOmega: Number(parameterInputs.driveOmega.value),
    dt: DEFAULT_PARAMS.dt,
    initialAngle: Number(parameterInputs.initialAngle.value),
  };
}

function clearGraphs(): void {
  thetaGraph.clear();
  omegaGraph.clear();
  energyGraph.clear();
  xGraph.clear();
  yGraph.clear();
  phaseGraph.clear();
}

function pushStateToGraphs(state: PendulumState): void {
  thetaGraph.push(state.time, state.theta);
  omegaGraph.push(state.time, state.omega);
  energyGraph.push(state.time, state.totalEnergy);
  xGraph.push(state.time, state.x);
  yGraph.push(state.time, state.y);
  phaseGraph.push(state.time, state.theta, state.omega);
}

function symmetricRange(amplitude: number, minimumAmplitude: number): FixedRange {
  const span = Math.max(Math.abs(amplitude), minimumAmplitude);
  const padded = span * 1.1;
  return { min: -padded, max: padded };
}

function centeredRange(center: number, minimumPad: number): FixedRange {
  const pad = Math.max(Math.abs(center) * 0.1, minimumPad);
  return { min: center - pad, max: center + pad };
}

function computeFixedGraphRanges(state: PendulumState): void {
  const params = currentParameters();
  const thetaAmplitude = Math.max(Math.abs(state.theta), 0.25);
  const omegaAmplitude = Math.max(Math.sqrt(params.gravity / params.length) * thetaAmplitude, 0.5);
  const cartesianAmplitude = Math.max(params.length, 0.2);

  fixedRanges = {
    theta: symmetricRange(thetaAmplitude, 0.25),
    omega: symmetricRange(omegaAmplitude, 0.5),
    energy: centeredRange(state.totalEnergy, 0.2),
    x: symmetricRange(cartesianAmplitude, 0.2),
    y: symmetricRange(cartesianAmplitude, 0.2),
  };

  fixedPhaseRange = {
    minX: fixedRanges.theta.min,
    maxX: fixedRanges.theta.max,
    minY: fixedRanges.omega.min,
    maxY: fixedRanges.omega.max,
  };
}

function resetSimulation(): void {
  engine.setParameters(currentParameters());
  engine.setMode(simulationMode);
  const state = engine.getState();
  computeFixedGraphRanges(state);
  clearGraphs();
  pushStateToGraphs(state);
  accumulator = 0;
  previousTimestamp = 0;
  render(state);
}

function stepSimulation(): void {
  const state = engine.step();
  pushStateToGraphs(state);
  render(state);
}

function stepSimulationBy(seconds: number): void {
  const stepCount = Math.max(1, Math.round(seconds / currentParameters().dt));
  for (let i = 0; i < stepCount; i += 1) {
    stepSimulation();
  }
}

function applyParameterChange(): void {
  running = false;
  resetSimulation();
}

function syncPanels(): void {
  dataPanel.hidden = false;
}

function updateTables(state: PendulumState): void {
  const derived = engine.getDerivedMetrics();
  instantTable.innerHTML = createTable(
    ["Quantity", "Symbol", "Value", "Unit"],
    [
      ["Angle", "θ", state.theta.toFixed(4), "rad"],
      ["Angular velocity", "ω", state.omega.toFixed(4), "rad/s"],
      ["Time", "t", state.time.toFixed(4), "s"],
    ],
  );

  derivedTable.innerHTML = createTable(
    ["Derived", "Value", "Method"],
    [
      ["Estimated period", derived.estimatedPeriod === null ? "Pending" : `${derived.estimatedPeriod.toFixed(4)} s`, "Positive zero crossings"],
      ["Natural frequency", `${derived.naturalFrequency.toFixed(4)} rad/s`, "sqrt(g/L)"],
      ["Small-angle theoretical period", `${derived.theoreticalPeriod.toFixed(4)} s`, "2π sqrt(L/g)"],
    ],
  );
}

function createTable(headers: string[], rows: string[][]): string {
  const head = headers.map((header) => `<th>${header}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function render(state: PendulumState): void {
  updateTables(state);
  syncPanels();
  modeChip.textContent = simulationMode === "angular" ? "Angular" : "Cartesian";
  runChip.textContent = running ? "Running" : "Paused";
  runChip.classList.toggle("chip-live", running);
  drawSimulation(state);
  drawGraph();
}

function drawSimulation(state: PendulumState): void {
  const ctx = simulationCtx;
  const { width, height } = simulationCanvas;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f8f1e7");
  gradient.addColorStop(1, "#d9ebea");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const geometry = getRenderGeometry(width, height, currentParameters().length);
  const bobX = geometry.pivotX + state.x * geometry.pixelsPerMeter;
  const bobY = geometry.pivotY + state.y * geometry.pixelsPerMeter;
  simulationCanvas.dataset.bobX = bobX.toFixed(2);
  simulationCanvas.dataset.bobY = bobY.toFixed(2);

  ctx.strokeStyle = "#244a57";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(geometry.pivotX - 44, geometry.pivotY);
  ctx.lineTo(geometry.pivotX + 44, geometry.pivotY);
  ctx.stroke();

  ctx.strokeStyle = "#17313c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(geometry.pivotX, geometry.pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  ctx.fillStyle = "#bb5a3c";
  ctx.beginPath();
  ctx.arc(bobX, bobY, geometry.bobRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#17313c";
  ctx.beginPath();
  ctx.arc(geometry.pivotX, geometry.pivotY, 8, 0, Math.PI * 2);
  ctx.fill();

  if (toggles.showForces) {
    const tangentX = Math.cos(state.theta);
    const tangentY = -Math.sin(state.theta);
    const radialX = Math.sin(state.theta);
    const radialY = Math.cos(state.theta);
    const velocityScale = clamp(Math.hypot(state.vx, state.vy) * 0.45, 20, 140);
    const gravityScale = clamp(currentParameters().gravity * 5, 20, 120);
    const accelerationScale = clamp(Math.abs(state.alpha * currentParameters().length) * 18, 20, 130);
    const tensionMagnitude =
      currentParameters().mass *
      (currentParameters().length * state.omega * state.omega + currentParameters().gravity * Math.cos(state.theta));
    const tensionScale = clamp((Math.abs(tensionMagnitude) / Math.max(currentParameters().mass, 0.1)) * 8, 20, 140);

    drawArrow(ctx, bobX, bobY, bobX, bobY + gravityScale, "#264653", "mg");
    drawArrow(
      ctx,
      bobX,
      bobY,
      bobX + tangentX * velocityScale * Math.sign(state.omega || 1),
      bobY + tangentY * velocityScale * Math.sign(state.omega || 1),
      "#2a9d8f",
      "v",
    );
    drawArrow(ctx, bobX, bobY, bobX - radialX * tensionScale, bobY - radialY * tensionScale, "#6d597a", "T");
    drawArrow(
      ctx,
      bobX,
      bobY,
      bobX + tangentX * accelerationScale * Math.sign(state.alpha || 1),
      bobY + tangentY * accelerationScale * Math.sign(state.alpha || 1),
      "#e76f51",
      "a",
    );
  }

  if (toggles.showEnergy) {
    drawEnergyBars(ctx, state, width);
  }

  ctx.fillStyle = "#17313c";
  ctx.font = "600 14px Space Grotesk, sans-serif";
  ctx.fillText("Drag the bob to reposition. Dragging pauses, zeroes time, clears history, and keeps ω = 0.", 24, height - 26);
}

function drawEnergyBars(ctx: CanvasRenderingContext2D, state: PendulumState, width: number): void {
  const panelX = width - 190;
  const panelY = 26;
  const panelWidth = 150;
  const panelHeight = 124;
  const total = Math.max(state.totalEnergy, 1e-6);
  const kineticRatio = clamp(state.kineticEnergy / total, 0, 1);
  const potentialRatio = clamp(state.potentialEnergy / total, 0, 1);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(36,74,87,0.2)";
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  ctx.fillStyle = "#17313c";
  ctx.font = "600 14px Space Grotesk, sans-serif";
  ctx.fillText("Energy", panelX + 16, panelY + 22);

  const barHeight = 70;
  const kineticHeight = barHeight * kineticRatio;
  const potentialHeight = barHeight * potentialRatio;

  ctx.fillStyle = "#2a9d8f";
  ctx.fillRect(panelX + 20, panelY + 90 - kineticHeight, 38, kineticHeight);
  ctx.fillStyle = "#e9c46a";
  ctx.fillRect(panelX + 86, panelY + 90 - potentialHeight, 38, potentialHeight);
  ctx.fillStyle = "#17313c";
  ctx.font = "500 12px IBM Plex Mono, monospace";
  ctx.fillText("T", panelX + 34, panelY + 108);
  ctx.fillText("V", panelX + 100, panelY + 108);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  label: string,
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = 10;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.font = "500 12px IBM Plex Mono, monospace";
  ctx.fillText(label, toX + 6, toY + 4);
}

function drawGraph(): void {
  const ctx = graphCtx;
  const { width, height } = graphCanvas;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#17313c");
  gradient.addColorStop(1, "#0c161d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const margin = { left: 72, right: 28, top: 24, bottom: 54 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const latestTime = Math.max(
    thetaGraph.latestTime(),
    omegaGraph.latestTime(),
    energyGraph.latestTime(),
    xGraph.latestTime(),
    yGraph.latestTime(),
  );
  const showCompressedTimeAxis = graphTimeScaleMode === "compress";
  const compressTimeAxis = showCompressedTimeAxis && latestTime > TIME_WINDOW;
  const startTime = compressTimeAxis ? 0 : Math.max(0, latestTime - TIME_WINDOW);
  const timeSpan = showCompressedTimeAxis ? Math.max(TIME_WINDOW, latestTime) : TIME_WINDOW;

  drawAxes(ctx, width, height, margin, graphMode);

  if (graphMode === "phase") {
    const window = phaseGraph.visibleWindow(startTime);
    graphCaption.textContent = "θ vs ω with fixed reset-time scaling.";
    if (window.points.length < 2) {
      return;
    }
    ctx.strokeStyle = "#72efdd";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    window.points.forEach((point, index) => {
      const x = margin.left + ((point.x - fixedPhaseRange.minX) / (fixedPhaseRange.maxX - fixedPhaseRange.minX || 1)) * innerWidth;
      const y = margin.top + innerHeight - ((point.y - fixedPhaseRange.minY) / (fixedPhaseRange.maxY - fixedPhaseRange.minY || 1)) * innerHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    annotatePhaseAxes(ctx, width, height, fixedPhaseRange);
    return;
  }

  if (graphMode === "energy" && !toggles.showEnergy) {
    drawGraphMessage(ctx, width, height, "Energy graph hidden by toggle.");
    return;
  }

  const buffer = select1DBuffer();
  const window = buffer.visibleWindow(startTime);
  const fixedRange = fixedRanges[graphMode];
  graphCaption.textContent = `${graphLabel(graphMode)}${showCompressedTimeAxis ? " • compressed time axis" : ""}`;
  if (window.points.length < 2) {
    return;
  }

  ctx.strokeStyle = graphColor(graphMode);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  window.points.forEach((point, index) => {
    const x = margin.left + ((point.time - startTime) / (timeSpan || 1)) * innerWidth;
    const y = margin.top + innerHeight - ((point.value - fixedRange.min) / (fixedRange.max - fixedRange.min || 1)) * innerHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "#d7efe8";
  ctx.font = "500 12px IBM Plex Mono, monospace";
  ctx.fillText(`${fixedRange.min.toFixed(2)}`, 12, height - margin.bottom + 4);
  ctx.fillText(`${fixedRange.max.toFixed(2)}`, 12, margin.top + 8);
  ctx.fillText(`${startTime.toFixed(1)} s`, margin.left, height - 14);
  ctx.fillText(`${(startTime + timeSpan).toFixed(1)} s`, width - margin.right - 44, height - 14);
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  width: number,
  canvasHeight: number,
  margin: { left: number; right: number; top: number; bottom: number },
  mode: GraphMode,
): void {
  ctx.strokeStyle = "rgba(215,239,232,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, canvasHeight - margin.bottom);
  ctx.lineTo(width - margin.right, canvasHeight - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = "#d7efe8";
  ctx.font = "500 12px IBM Plex Mono, monospace";
  ctx.fillText(mode === "phase" ? "ω (rad/s)" : graphAxisLabel(mode), 18, margin.top + 12);
  ctx.fillText(mode === "phase" ? "θ (rad)" : "t (s)", width - margin.right - 40, canvasHeight - 16);
}

function annotatePhaseAxes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  window: { minX: number; maxX: number; minY: number; maxY: number },
): void {
  ctx.fillStyle = "#d7efe8";
  ctx.font = "500 12px IBM Plex Mono, monospace";
  ctx.fillText(`${window.minY.toFixed(2)}`, 12, height - 52);
  ctx.fillText(`${window.maxY.toFixed(2)}`, 12, 38);
  ctx.fillText(`${window.minX.toFixed(2)}`, 74, height - 14);
  ctx.fillText(`${window.maxX.toFixed(2)}`, width - 64, height - 14);
}

function drawGraphMessage(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
  ctx.fillStyle = "#d7efe8";
  ctx.font = "600 18px Space Grotesk, sans-serif";
  ctx.fillText(text, width * 0.5 - ctx.measureText(text).width * 0.5, height * 0.5);
}

function select1DBuffer(): RingBuffer1D {
  switch (graphMode) {
    case "theta":
      return thetaGraph;
    case "omega":
      return omegaGraph;
    case "energy":
      return energyGraph;
    case "x":
      return xGraph;
    case "y":
      return yGraph;
    default:
      return thetaGraph;
  }
}

function graphLabel(mode: GraphMode): string {
  switch (mode) {
    case "theta":
      return "Angular position vs time";
    case "omega":
      return "Angular velocity vs time";
    case "energy":
      return "Total energy vs time";
    case "phase":
      return "Phase space trajectory";
    case "x":
      return "Cartesian x vs time";
    case "y":
      return "Cartesian y vs time";
  }
}

function graphAxisLabel(mode: GraphMode): string {
  switch (mode) {
    case "theta":
      return "θ (rad)";
    case "omega":
      return "ω (rad/s)";
    case "energy":
      return "E (J)";
    case "x":
      return "x (m)";
    case "y":
      return "y (m)";
    case "phase":
      return "ω (rad/s)";
  }
}

function graphColor(mode: GraphMode): string {
  switch (mode) {
    case "theta":
      return "#f4a261";
    case "omega":
      return "#72efdd";
    case "energy":
      return "#e9c46a";
    case "x":
      return "#ffafcc";
    case "y":
      return "#a0c4ff";
    case "phase":
      return "#72efdd";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRenderGeometry(canvasWidth: number, canvasHeight: number, currentLength: number): RenderGeometry {
  const sideMargin = 88;
  const topMargin = 70;
  const bottomMargin = 78;
  const normalizedLength = clamp(currentLength, MIN_RENDER_LENGTH, MAX_RENDER_LENGTH);
  const normalizedBobRadiusMeters = normalizedLength * BOB_TO_LENGTH_RATIO;
  const horizontalScale = (canvasWidth * 0.5 - sideMargin) / (MAX_RENDER_LENGTH + normalizedBobRadiusMeters);
  const verticalScale = (canvasHeight - topMargin - bottomMargin) / (MAX_RENDER_LENGTH + normalizedBobRadiusMeters);
  const pixelsPerMeter = Math.min(horizontalScale, verticalScale);
  const bobRadius = clamp(normalizedBobRadiusMeters * pixelsPerMeter, 12, 34);
  const maxReach = MAX_RENDER_LENGTH * pixelsPerMeter + bobRadius;
  const pivotY = topMargin + Math.max(0, (canvasHeight - topMargin - bottomMargin - maxReach) * 0.2);

  return {
    pivotX: canvasWidth * 0.5,
    pivotY,
    pixelsPerMeter,
    bobRadius,
  };
}

function animationFrame(timestamp: number): void {
  if (!previousTimestamp) {
    previousTimestamp = timestamp;
  }
  const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.05);
  previousTimestamp = timestamp;

  if (running) {
    accumulator += deltaSeconds;
    while (accumulator >= currentParameters().dt) {
      stepSimulation();
      accumulator -= currentParameters().dt;
    }
  } else {
    render(engine.getState());
  }

  requestAnimationFrame(animationFrame);
}

modeSelect.addEventListener("change", () => {
  simulationMode = modeSelect.value as SimulationMode;
  if (simulationMode === "angular" && (graphMode === "x" || graphMode === "y")) {
    graphMode = "theta";
    graphSelect.value = "theta";
  }
  applyParameterChange();
});

graphSelect.addEventListener("change", () => {
  const nextMode = graphSelect.value as GraphMode;
  if ((nextMode === "x" || nextMode === "y") && simulationMode !== "cartesian") {
    graphSelect.value = graphMode;
    return;
  }
  graphMode = nextMode;
  render(engine.getState());
});

graphTimeScaleSelect.addEventListener("change", () => {
  graphTimeScaleMode = graphTimeScaleSelect.value as GraphTimeScaleMode;
  render(engine.getState());
});

Object.values(parameterInputs).forEach((input) => {
  input.addEventListener("change", applyParameterChange);
});

playButton.addEventListener("click", () => {
  accumulator = 0;
  previousTimestamp = 0;
  running = true;
});

pauseButton.addEventListener("click", () => {
  running = false;
  accumulator = 0;
  previousTimestamp = 0;
});

stepButton.addEventListener("click", () => {
  running = false;
  accumulator = 0;
  previousTimestamp = 0;
  stepSimulationBy(STEP_ADVANCE_SECONDS);
});

resetButton.addEventListener("click", () => {
  running = false;
  resetSimulation();
});

simulationCanvas.addEventListener("pointerdown", (event) => {
  const rect = simulationCanvas.getBoundingClientRect();
  const canvasX = ((event.clientX - rect.left) / rect.width) * simulationCanvas.width;
  const canvasY = ((event.clientY - rect.top) / rect.height) * simulationCanvas.height;
  const state = engine.getState();
  const geometry = getRenderGeometry(simulationCanvas.width, simulationCanvas.height, currentParameters().length);
  const bobX = geometry.pivotX + state.x * geometry.pixelsPerMeter;
  const bobY = geometry.pivotY + state.y * geometry.pixelsPerMeter;
  if (Math.hypot(canvasX - bobX, canvasY - bobY) <= geometry.bobRadius + 10) {
    dragging = true;
    running = false;
    simulationCanvas.setPointerCapture(event.pointerId);
  }
});

simulationCanvas.addEventListener("pointermove", (event) => {
  if (!dragging) {
    return;
  }
  const rect = simulationCanvas.getBoundingClientRect();
  const canvasX = ((event.clientX - rect.left) / rect.width) * simulationCanvas.width;
  const canvasY = ((event.clientY - rect.top) / rect.height) * simulationCanvas.height;
  const geometry = getRenderGeometry(simulationCanvas.width, simulationCanvas.height, currentParameters().length);
  const dx = canvasX - geometry.pivotX;
  const dy = canvasY - geometry.pivotY;
  const theta = Math.atan2(dx, Math.max(dy, 1));
  parameterInputs.initialAngle.value = theta.toFixed(2);
  parameterInputs.initialAngle.dispatchEvent(new Event("input"));
  clearGraphs();
  const state = engine.overrideFromDrag(theta);
  computeFixedGraphRanges(state);
  pushStateToGraphs(state);
  accumulator = 0;
  previousTimestamp = 0;
  render(state);
});

simulationCanvas.addEventListener("pointerup", (event) => {
  dragging = false;
  simulationCanvas.releasePointerCapture(event.pointerId);
});

simulationCanvas.addEventListener("pointerleave", () => {
  dragging = false;
});

syncPanels();
resetSimulation();
requestAnimationFrame(animationFrame);
