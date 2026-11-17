export type SimulationMode = "angular" | "cartesian";

export type GraphMode = "theta" | "omega" | "energy" | "phase" | "x" | "y";
export type GraphTimeScaleMode = "scroll" | "compress";

export interface Parameters {
  mass: number;
  length: number;
  gravity: number;
  linearDamping: number;
  quadraticDamping: number;
  driveAmplitude: number;
  driveOmega: number;
  dt: number;
  initialAngle: number;
  initialOmega?: number;
  fluidDensity?: number;
  fluidViscosity?: number;
  bobRadius?: number;
}

export interface PendulumState {
  time: number;
  theta: number;
  omega: number;
  alpha: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  maxAngle: number;
  driveWork: number;
  dissipatedEnergy: number;
}

export interface DerivedMetrics {
  maxAngleReached: number;
  estimatedPeriod: number | null;
  naturalFrequency: number;
  theoreticalPeriod: number;
  energyDriftPercent: number;
  exactPeriod: number | null;
  energyBalanceError: number;
  energyBalancePercent: number;
  initialEnergy: number;
  conservative: boolean;
  hasRotated: boolean;
}

export interface Sample {
  time: number;
  value: number;
}

export interface Sample2D {
  x: number;
  y: number;
  time: number;
}

export interface RingWindow1D {
  points: Sample[];
  min: number;
  max: number;
}

export interface RingWindow2D {
  points: Sample2D[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface VisualToggles {
  showForces: boolean;
  showEnergy: boolean;
}
