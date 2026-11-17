import type { DerivedMetrics, Parameters, PendulumState, SimulationMode } from "./types";

const TAU = Math.PI * 2;

function normalizeAngle(theta: number): number {
  let value = theta;
  while (value > Math.PI) {
    value -= TAU;
  }
  while (value < -Math.PI) {
    value += TAU;
  }
  return value;
}

function angularAcceleration(theta: number, omega: number, time: number, params: Parameters): number {
  const inertia = params.mass * params.length * params.length;
  const restoring = -(params.gravity / params.length) * Math.sin(theta);
  const linear = -(params.linearDamping / inertia) * omega;
  const quadratic = -(params.quadraticDamping / inertia) * omega * Math.abs(omega);
  const drive = (params.driveAmplitude / inertia) * Math.sin(params.driveOmega * time);
  return restoring + linear + quadratic + drive;
}

function stateFromAngular(theta: number, omega: number, time: number, params: Parameters, maxAngle: number): PendulumState {
  const x = params.length * Math.sin(theta);
  const y = params.length * Math.cos(theta);
  const tangentX = Math.cos(theta);
  const tangentY = -Math.sin(theta);
  const speed = params.length * omega;
  const vx = tangentX * speed;
  const vy = tangentY * speed;
  const alpha = angularAcceleration(theta, omega, time, params);
  const kineticEnergy = 0.5 * params.mass * params.length * params.length * omega * omega;
  const potentialEnergy = params.mass * params.gravity * params.length * (1 - Math.cos(theta));
  return {
    time,
    theta,
    omega,
    alpha,
    x,
    y,
    vx,
    vy,
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
    maxAngle,
  };
}

function stateFromCartesian(
  x: number,
  y: number,
  vx: number,
  vy: number,
  time: number,
  params: Parameters,
  maxAngle: number,
): PendulumState {
  const theta = normalizeAngle(Math.atan2(x, y));
  const omega = (x * vy - y * vx) / (params.length * params.length);
  const alpha = angularAcceleration(theta, omega, time, params);
  const kineticEnergy = 0.5 * params.mass * (vx * vx + vy * vy);
  const potentialEnergy = params.mass * params.gravity * params.length * (1 - Math.cos(theta));
  return {
    time,
    theta,
    omega,
    alpha,
    x,
    y,
    vx,
    vy,
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
    maxAngle,
  };
}

export class PendulumEngine {
  private mode: SimulationMode = "angular";
  private state: PendulumState;
  private params: Parameters;
  private maxAngle = 0;
  private initialEnergy = 0;
  private minEnergy = 0;
  private maxEnergy = 0;
  private lastTheta = 0;
  private readonly positiveCrossings: number[] = [];

  constructor(params: Parameters) {
    this.params = params;
    this.state = this.createInitialState();
    this.seedDerivedTrackers();
  }

  setMode(mode: SimulationMode): void {
    this.mode = mode;
    this.reset();
  }

  setParameters(params: Parameters): void {
    this.params = params;
    this.reset();
  }

  getParameters(): Parameters {
    return this.params;
  }

  getMode(): SimulationMode {
    return this.mode;
  }

  getState(): PendulumState {
    return this.state;
  }

  reset(): PendulumState {
    this.state = this.createInitialState();
    this.seedDerivedTrackers();
    return this.state;
  }

  overrideFromDrag(theta: number): PendulumState {
    const normalized = normalizeAngle(theta);
    this.maxAngle = Math.abs(normalized);
    this.state = stateFromAngular(normalized, 0, 0, this.params, this.maxAngle);
    this.seedDerivedTrackers();
    return this.state;
  }

  step(): PendulumState {
    const dt = this.params.dt;
    this.state = this.mode === "angular" ? this.stepAngular(dt) : this.stepCartesian(dt);
    this.maxAngle = Math.max(this.maxAngle, Math.abs(this.state.theta));
    this.state.maxAngle = this.maxAngle;
    this.trackDerivedSeries();
    return this.state;
  }

  getDerivedMetrics(): DerivedMetrics {
    const naturalFrequency = Math.sqrt(this.params.gravity / this.params.length);
    const theoreticalPeriod = TAU * Math.sqrt(this.params.length / this.params.gravity);
    const baseline = Math.max(Math.abs(this.initialEnergy), 1e-9);
    const energyDriftPercent = ((this.maxEnergy - this.minEnergy) / baseline) * 100;
    let estimatedPeriod: number | null = null;
    if (this.positiveCrossings.length >= 2) {
      const periods: number[] = [];
      for (let i = Math.max(1, this.positiveCrossings.length - 3); i < this.positiveCrossings.length; i += 1) {
        periods.push(this.positiveCrossings[i] - this.positiveCrossings[i - 1]);
      }
      estimatedPeriod = periods.reduce((sum, value) => sum + value, 0) / periods.length;
    }
    return {
      maxAngleReached: this.maxAngle,
      estimatedPeriod,
      naturalFrequency,
      theoreticalPeriod,
      energyDriftPercent,
    };
  }

  private createInitialState(): PendulumState {
    const theta = this.params.initialAngle;
    this.maxAngle = Math.abs(theta);
    return stateFromAngular(theta, 0, 0, this.params, this.maxAngle);
  }

  private seedDerivedTrackers(): void {
    this.initialEnergy = this.state.totalEnergy;
    this.minEnergy = this.state.totalEnergy;
    this.maxEnergy = this.state.totalEnergy;
    this.lastTheta = this.state.theta;
    this.positiveCrossings.length = 0;
  }

  private trackDerivedSeries(): void {
    this.minEnergy = Math.min(this.minEnergy, this.state.totalEnergy);
    this.maxEnergy = Math.max(this.maxEnergy, this.state.totalEnergy);
    if (this.lastTheta < 0 && this.state.theta >= 0 && this.state.omega > 0) {
      this.positiveCrossings.push(this.state.time);
      if (this.positiveCrossings.length > 4) {
        this.positiveCrossings.shift();
      }
    }
    this.lastTheta = this.state.theta;
  }

  private stepAngular(dt: number): PendulumState {
    const previous = this.state;
    const alpha0 = angularAcceleration(previous.theta, previous.omega, previous.time, this.params);
    const omegaHalf = previous.omega + 0.5 * alpha0 * dt;
    const theta = normalizeAngle(previous.theta + omegaHalf * dt);
    const nextTime = previous.time + dt;
    const alpha1 = angularAcceleration(theta, omegaHalf, nextTime, this.params);
    const omega = omegaHalf + 0.5 * alpha1 * dt;
    return stateFromAngular(theta, omega, nextTime, this.params, this.maxAngle);
  }

  private stepCartesian(dt: number): PendulumState {
    const previous = this.state;
    const gravityY = this.params.gravity;
    let x = previous.x + previous.vx * dt;
    let y = previous.y + previous.vy * dt + 0.5 * gravityY * dt * dt;
    let vx = previous.vx;
    let vy = previous.vy + gravityY * dt;

    const radius = Math.hypot(x, y) || this.params.length;
    const scale = this.params.length / radius;
    x *= scale;
    y *= scale;

    const radialVelocity = (x * vx + y * vy) / (this.params.length * this.params.length);
    vx -= radialVelocity * x;
    vy -= radialVelocity * y;

    const nextTime = previous.time + dt;
    return stateFromCartesian(x, y, vx, vy, nextTime, this.params, this.maxAngle);
  }
}
