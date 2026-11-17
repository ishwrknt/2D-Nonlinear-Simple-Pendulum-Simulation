import type { Parameters } from "./types.ts";
export function displacedVolume(p: Parameters): number {
  return (4 * Math.PI * (p.bobRadius ?? 0.025) ** 3) / 3;
}
export function effectiveGravity(p: Parameters): number {
  return (
    p.gravity * (1 - ((p.fluidDensity ?? 0) * displacedVolume(p)) / p.mass)
  );
}
export function reynoldsNumber(p: Parameters, omega: number): number {
  return (
    ((p.fluidDensity ?? 0) *
      2 *
      (p.bobRadius ?? 0.025) *
      p.length *
      Math.abs(omega)) /
    (p.fluidViscosity ?? 0.001)
  );
}
/** Positive torque/omega coefficient for a fully immersed sphere in still fluid. */
export function fluidResistance(p: Parameters, omega: number): number {
  const density = p.fluidDensity ?? 0;
  if (density === 0) return 0;
  const r = p.bobRadius ?? 0.025,
    mu = p.fluidViscosity ?? 0.001,
    Re = reynoldsNumber(p, omega);
  if (Re <= 1000)
    return 6 * Math.PI * mu * r * p.length ** 2 * (1 + 0.15 * Re ** 0.687);
  return (
    0.5 * density * 0.44 * Math.PI * r * r * p.length ** 3 * Math.abs(omega)
  );
}
