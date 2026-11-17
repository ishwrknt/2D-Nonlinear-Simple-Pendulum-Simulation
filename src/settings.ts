import type { Parameters } from "./types";

export const defaults: Parameters = {
  mass: 1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 0,
  dt: 1 / 240,
  initialAngle: (10 * Math.PI) / 180,
  initialOmega: 0,
  fluidDensity: 0,
  fluidViscosity: 0.001,
  bobRadius: 0.025,
};
export const presets: Record<
  string,
  { title: string; question: string; params: Partial<Parameters> }
> = {
  small: {
    title: "Small oscillations",
    question:
      "Predict: will changing the mass change the period? Compare 10° oscillations at two masses while keeping length fixed.",
    params: { initialAngle: (10 * Math.PI) / 180 },
  },
  large: {
    title: "Large oscillations",
    question:
      "Predict: is the small-angle formula still accurate at 90°? Compare the measured period with both predictions.",
    params: { initialAngle: Math.PI / 2 },
  },
  damped: {
    title: "Losing energy",
    question:
      "Where does mechanical energy go? Compare E + energy dissipated with the initial energy. Then try quadratic damping.",
    params: { linearDamping: 0.08 },
  },
  driven: {
    title: "Adding energy",
    question:
      "Does a periodic push always add energy? Watch the sign of the accumulated drive work and compare two drive frequencies.",
    params: { linearDamping: 0.08, driveAmplitude: 0.5, driveOmega: 3.5 },
  },
  air: {
    title: "Swing in air",
    question:
      "Keep the same 0.1 kg, 2.5 cm radius bob: predict how water will change the swing compared with air. Export each run before switching.",
    params: {
      mass: 0.1,
      initialAngle: Math.PI / 6,
      fluidDensity: 1.2,
      fluidViscosity: 1.8e-5,
    },
  },
  water: {
    title: "Under water",
    question:
      "The same bob is fully immersed in water. Will buoyancy make it swing faster or slower? How does drag change the amplitude?",
    params: {
      mass: 0.1,
      initialAngle: Math.PI / 6,
      fluidDensity: 1000,
      fluidViscosity: 0.001,
    },
  },
  oil: {
    title: "Oil",
    question:
      "Replace water by an illustrative oil: density 900 kg/m³ and viscosity 0.10 Pa s. Which changes the restoring torque, and which changes dissipation? Vary one property at a time.",
    params: {
      mass: 0.1,
      initialAngle: Math.PI / 6,
      fluidDensity: 900,
      fluidViscosity: 0.1,
    },
  },
  floating: {
    title: "A buoyant bob",
    question:
      "A large light bob in water tends upward on a rigid rod. Predict what happens when its density crosses the fluid density. This is not a free-surface or slack-string simulation.",
    params: {
      mass: 0.1,
      bobRadius: 0.035,
      initialAngle: Math.PI / 6,
      fluidDensity: 1000,
      fluidViscosity: 0.001,
    },
  },
  moon: {
    title: "On the Moon",
    question:
      "Use the same 10° release and length as the default Earth case. Predict the period ratio using sqrt(gEarth/gMoon). The Moon setting is an illustrative 1.62 m/s².",
    params: { gravity: 1.62 },
  },
  long: {
    title: "Long pendulum",
    question:
      "Compare a 3 m pendulum with the default 0.75 m one. Predict the period ratio before running. Turn off Fit rod to view only when a fixed visual scale is useful.",
    params: { length: 3 },
  },
  strong: {
    title: "Strong damping",
    question:
      "At b = 8 N m s/rad, does the pendulum cross the vertical or approach it without overshoot? Compare with b = 0.08 while keeping the same release.",
    params: { linearDamping: 8 },
  },
  neutral: {
    title: "Near-neutral buoyancy",
    question:
      "This bob is slightly denser than water. How does a small density change affect effective gravity? Increase fluid density to the displayed bob density to approach neutral buoyancy.",
    params: {
      mass: 0.1,
      bobRadius: 0.0285,
      fluidDensity: 1000,
      fluidViscosity: 0.001,
      initialAngle: Math.PI / 6,
    },
  },
  rotation: {
    title: "Beyond oscillation",
    question:
      "With a rigid rod the bob can pass over the top. Why is an oscillation period no longer reported?",
    params: { initialAngle: 0, initialOmega: 9 },
  },
};
export const fields: {
  key: keyof Parameters;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  degrees?: boolean;
}[] = [
  {
    key: "initialAngle",
    label: "Release angle",
    unit: "°",
    min: -179,
    max: 179,
    step: 0.1,
    degrees: true,
  },
  { key: "length", label: "Length L", unit: "m", min: 0.2, max: 2, step: 0.01 },
  { key: "mass", label: "Bob mass m", unit: "kg", min: 0.1, max: 5, step: 0.1 },
  {
    key: "gravity",
    label: "Gravity g",
    unit: "m/s²",
    min: 0,
    max: 20,
    step: 0.01,
  },
  {
    key: "initialOmega",
    label: "Initial angular velocity",
    unit: "rad/s",
    min: -12,
    max: 12,
    step: 0.1,
  },
  {
    key: "linearDamping",
    label: "Linear damping b",
    unit: "N m s/rad",
    min: 0,
    max: 0.8,
    step: 0.01,
  },
  {
    key: "quadraticDamping",
    label: "Quadratic damping c",
    unit: "N m s²/rad²",
    min: 0,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "driveAmplitude",
    label: "Drive torque A",
    unit: "N m",
    min: 0,
    max: 4,
    step: 0.05,
  },
  {
    key: "driveOmega",
    label: "Drive frequency Ω",
    unit: "rad/s",
    min: 0,
    max: 8,
    step: 0.05,
  },
];
fields.push(
  {
    key: "fluidDensity",
    label: "Fluid density ρ",
    unit: "kg/m³",
    min: 0,
    max: 3000,
    step: 1,
  },
  {
    key: "fluidViscosity",
    label: "Dynamic viscosity μ",
    unit: "Pa s",
    min: 0.000001,
    max: 5,
    step: 0.001,
  },
  {
    key: "bobRadius",
    label: "Sphere radius r",
    unit: "m",
    min: 0.005,
    max: 0.08,
    step: 0.001,
  },
);
// Input domains express physical constraints, not preset exploration ranges.
export const positive = new Set(["mass", "length", "fluidViscosity", "bobRadius"]);
export const signed = new Set(["initialAngle", "initialOmega"]);
export function allowed(key: string, value: number): boolean {
  return (
    Number.isFinite(value) &&
    (signed.has(key) || (positive.has(key) ? value > 0 : value >= 0))
  );
}
export function domainMessage(key: string): string {
  return signed.has(key)
    ? "Enter a finite number."
    : positive.has(key)
      ? "Enter a finite number greater than zero."
      : "Enter a finite number greater than or equal to zero.";
}
