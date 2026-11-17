import { effectiveGravity, fluidResistance } from "./fluid.ts";
import type {
  DerivedMetrics,
  Parameters,
  PendulumState,
  SimulationMode,
} from "./types";

export const ENGINE_VERSION = "0.3.0";
const TAU = 2 * Math.PI;
export function principalAngle(theta: number): number {
  return Math.atan2(Math.sin(theta), Math.cos(theta));
}
export function angularAcceleration(
  theta: number,
  omega: number,
  time: number,
  p: Parameters,
): number {
  return (
    (-effectiveGravity(p) / p.length) * Math.sin(theta) +
    torque(omega, time, p) / (p.mass * p.length ** 2)
  );
}
function torque(omega: number, time: number, p: Parameters): number {
  return (
    -p.linearDamping * omega -
    fluidResistance(p, omega) * omega -
    p.quadraticDamping * omega * Math.abs(omega) +
    p.driveAmplitude * Math.sin(p.driveOmega * time)
  );
}
function power(omega: number, time: number, p: Parameters): [number, number] {
  return [
    p.driveAmplitude * Math.sin(p.driveOmega * time) * omega,
    (p.linearDamping + fluidResistance(p, omega)) * omega ** 2 +
      p.quadraticDamping * Math.abs(omega) ** 3,
  ];
}
function validate(p: Parameters): void {
  if (
    !Number.isFinite(p.fluidDensity ?? 0) ||
    (p.fluidDensity ?? 0) < 0 ||
    !Number.isFinite(p.fluidViscosity ?? 0.001) ||
    (p.fluidViscosity ?? 0.001) <= 0 ||
    !Number.isFinite(p.bobRadius ?? 0.025) ||
    (p.bobRadius ?? 0.025) <= 0
  )
    throw Error(
      "Use nonnegative fluid density and positive viscosity and bob radius.",
    );
  const required: (keyof Parameters)[] = [
    "mass",
    "length",
    "gravity",
    "linearDamping",
    "quadraticDamping",
    "driveAmplitude",
    "driveOmega",
    "dt",
    "initialAngle",
  ];
  for (const name of required)
    if (!Number.isFinite(p[name])) throw new Error(`${name} must be finite.`);
  if (p.initialOmega !== undefined && !Number.isFinite(p.initialOmega))
    throw new Error("initialOmega must be finite.");
  if (p.mass <= 0 || p.length <= 0 || p.gravity < 0 || p.dt <= 0 || p.dt > 0.1)
    throw new Error(
      "Use positive mass/length, nonnegative gravity and a time step in (0, 0.1] s.",
    );
  if (
    p.linearDamping < 0 ||
    p.quadraticDamping < 0 ||
    p.driveAmplitude < 0 ||
    p.driveOmega < 0
  )
    throw new Error("Damping and drive settings must be nonnegative.");
}
/** Period for a conservative oscillation released from rest. AGM uses elliptic modulus sin(theta/2). */
export function exactReleasePeriod(
  angle: number,
  length: number,
  gravity: number,
): number | null {
  if (gravity <= 0 || Math.abs(angle) >= Math.PI || Math.abs(angle) < 1e-10)
    return null;
  let a = 1,
    b = Math.cos(Math.abs(angle) / 2);
  for (let i = 0; i < 30; i++) {
    const next = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = next;
    if (Math.abs(a - b) < 1e-15) break;
  }
  return (TAU * Math.sqrt(length / gravity)) / a;
}
function rk4(
  y: number[],
  t: number,
  h: number,
  f: (v: number[], t: number) => number[],
): number[] {
  const k1 = f(y, t);
  const k2 = f(
    y.map((v, i) => v + (h * k1[i]) / 2),
    t + h / 2,
  );
  const k3 = f(
    y.map((v, i) => v + (h * k2[i]) / 2),
    t + h / 2,
  );
  const k4 = f(
    y.map((v, i) => v + h * k3[i]),
    t + h,
  );
  return y.map((v, i) => v + (h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) / 6);
}

export class PendulumEngine {
  private mode: SimulationMode = "angular";
  private params: Parameters;
  private state!: PendulumState;
  private initialEnergy = 0;
  private minEnergy = 0;
  private maxEnergy = 0;
  private releaseAngle = 0;
  private releaseOmega = 0;
  private crossedTop = false;
  private crossings: number[] = [];
  private count = 0;
  constructor(params: Parameters) {
    validate(params);
    this.params = { ...params };
    this.reset();
  }
  setMode(mode: SimulationMode): void {
    if (mode !== "angular" && mode !== "cartesian")
      throw new Error("Unknown simulation mode.");
    this.mode = mode;
    this.reset();
  }
  setParameters(params: Parameters): void {
    validate(params);
    this.params = { ...params };
    this.reset();
  }
  getParameters(): Parameters {
    return { ...this.params };
  }
  getMode(): SimulationMode {
    return this.mode;
  }
  getState(): PendulumState {
    return { ...this.state };
  }
  reset(): PendulumState {
    return this.start(this.params.initialAngle, this.params.initialOmega ?? 0);
  }
  overrideFromDrag(theta: number): PendulumState {
    if (!Number.isFinite(theta)) throw new Error("Angle must be finite.");
    this.params.initialAngle = principalAngle(theta);
    this.params.initialOmega = 0;
    return this.start(this.params.initialAngle, 0);
  }
  private start(theta: number, omega: number): PendulumState {
    this.releaseAngle = theta;
    this.releaseOmega = omega;
    this.count = 0;
    this.crossings = [];
    this.crossedTop = Math.abs(theta) >= Math.PI;
    this.state = this.makeState(theta, omega, 0, 0, 0, Math.abs(theta));
    if (!Object.values(this.state).every(Number.isFinite))
      throw Error(
        "These values exceed numerical precision; use less extreme settings.",
      );
    this.initialEnergy = this.state.totalEnergy;
    this.minEnergy = this.maxEnergy = this.initialEnergy;
    return this.getState();
  }
  private makeState(
    theta: number,
    omega: number,
    time: number,
    driveWork: number,
    dissipatedEnergy: number,
    maxAngle: number,
  ): PendulumState {
    const p = this.params,
      L = p.length;
    const kineticEnergy = 0.5 * p.mass * L ** 2 * omega ** 2;
    const potentialEnergy =
      p.mass * effectiveGravity(p) * L * (1 - Math.cos(theta));
    return {
      time,
      theta,
      omega,
      alpha: angularAcceleration(theta, omega, time, p),
      x: L * Math.sin(theta),
      y: L * Math.cos(theta),
      vx: L * omega * Math.cos(theta),
      vy: -L * omega * Math.sin(theta),
      kineticEnergy,
      potentialEnergy,
      totalEnergy: kineticEnergy + potentialEnergy,
      maxAngle,
      driveWork,
      dissipatedEnergy,
    };
  }
  step(): PendulumState {
    const p = this.params,
      old = this.state;
    const inertia = p.mass * p.length ** 2;
    const rate = Math.max(
      Math.sqrt(Math.abs(effectiveGravity(p)) / p.length),
      Math.abs(old.omega),
      (p.linearDamping +
        2 * p.quadraticDamping * Math.abs(old.omega) +
        2 * fluidResistance(p, old.omega)) /
        inertia,
      Math.sqrt(p.driveAmplitude / inertia),
      p.driveAmplitude > 0 ? p.driveOmega : 0,
    );
    // Deterministic subdivision bounds angular travel and explicit-damping stiffness.
    const n = Math.max(1, Math.ceil((p.dt * rate) / 0.15));
    if (!Number.isFinite(n) || n > 1000)
      throw new Error(
        "Parameters require too many internal steps; reduce the time step or forcing.",
      );
    let s = old;
    for (let j = 0; j < n; j++) {
      const h = p.dt / n,
        t = old.time + j * h;
      let theta: number, omega: number, wd: number, loss: number;
      if (this.mode === "angular") {
        [theta, omega, wd, loss] = rk4(
          [s.theta, s.omega, s.driveWork, s.dissipatedEnergy],
          t,
          h,
          (v, time) => [
            v[1],
            angularAcceleration(v[0], v[1], time, p),
            ...power(v[1], time, p),
          ],
        );
      } else {
        const v = rk4(
          [s.x, s.y, s.vx, s.vy, s.driveWork, s.dissipatedEnergy],
          t,
          h,
          (v, time) => {
            const [x, y, vx, vy] = v,
              r2 = x * x + y * y,
              r = Math.sqrt(r2);
            const w = (y * vx - x * vy) / r2;
            const lambda = (effectiveGravity(p) * y + vx * vx + vy * vy) / r2;
            const tangentialAcceleration =
              torque(w, time, p) / (p.mass * p.length);
            return [
              vx,
              vy,
              -lambda * x + (tangentialAcceleration * y) / r,
              effectiveGravity(p) -
                lambda * y -
                (tangentialAcceleration * x) / r,
              ...power(w, time, p),
            ];
          },
        );
        const r = Math.hypot(v[0], v[1]),
          x = (v[0] * p.length) / r,
          y = (v[1] * p.length) / r;
        const radial = (x * v[2] + y * v[3]) / p.length ** 2;
        const vx = v[2] - radial * x,
          vy = v[3] - radial * y;
        theta =
          s.theta + principalAngle(Math.atan2(x, y) - principalAngle(s.theta));
        omega = (y * vx - x * vy) / p.length ** 2;
        wd = v[4];
        loss = v[5];
      }
      if (![theta, omega, wd, loss].every(Number.isFinite))
        throw new Error("Numerical overflow; reset and use milder parameters.");
      const next = this.makeState(
        theta,
        omega,
        t + h,
        wd,
        loss,
        Math.max(s.maxAngle, Math.abs(theta)),
      );
      if (Math.abs(theta) >= Math.PI) {
        this.crossedTop = true;
        this.crossings = [];
      }
      if (!this.crossedTop && s.theta < 0 && theta >= 0 && omega > 0) {
        this.crossings.push(t + (h * -s.theta) / (theta - s.theta));
        if (this.crossings.length > 4) this.crossings.shift();
      }
      this.minEnergy = Math.min(this.minEnergy, next.totalEnergy);
      this.maxEnergy = Math.max(this.maxEnergy, next.totalEnergy);
      s = next;
    }
    s.time = ++this.count * p.dt;
    this.state = s;
    return this.getState();
  }
  getDerivedMetrics(): DerivedMetrics {
    const p = this.params,
      s = this.state;
    const conservative =
      p.linearDamping === 0 &&
      p.quadraticDamping === 0 &&
      p.driveAmplitude === 0 &&
      (p.fluidDensity ?? 0) === 0;
    const baseline = Math.max(
      Math.abs(this.initialEnergy),
      p.mass * p.gravity * p.length * 1e-12,
      1e-12,
    );
    const period =
      this.crossings.length > 1
        ? (this.crossings.at(-1)! - this.crossings[0]) /
          (this.crossings.length - 1)
        : null;
    return {
      maxAngleReached: s.maxAngle,
      estimatedPeriod: this.crossedTop ? null : period,
      naturalFrequency: Math.sqrt(Math.max(0, effectiveGravity(p)) / p.length),
      theoreticalPeriod:
        effectiveGravity(p) > 0
          ? TAU * Math.sqrt(p.length / effectiveGravity(p))
          : Infinity,
      exactPeriod:
        conservative && this.releaseOmega === 0
          ? exactReleasePeriod(this.releaseAngle, p.length, effectiveGravity(p))
          : null,
      energyDriftPercent: ((this.maxEnergy - this.minEnergy) / baseline) * 100,
      energyBalanceError:
        s.totalEnergy - this.initialEnergy - s.driveWork + s.dissipatedEnergy,
      energyBalancePercent:
        ((s.totalEnergy -
          this.initialEnergy -
          s.driveWork +
          s.dissipatedEnergy) /
          baseline) *
        100,
      initialEnergy: this.initialEnergy,
      conservative,
      hasRotated: this.crossedTop,
    };
  }
}
