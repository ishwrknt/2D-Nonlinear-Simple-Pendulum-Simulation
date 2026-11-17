import { PendulumEngine } from "../src/physics.ts";
import { writeFileSync } from "node:fs";
const base = {
  mass: 0.1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 0,
  dt: 1 / 240,
  initialAngle: Math.PI / 6,
  initialOmega: 0,
  bobRadius: 0.025,
};
const runs = [];
for (const mode of ["angular", "cartesian"])
  for (const [name, props] of Object.entries({
    air: { fluidDensity: 1.2, fluidViscosity: 1.8e-5 },
    water: { fluidDensity: 1000, fluidViscosity: 0.001 },
    oil: { fluidDensity: 900, fluidViscosity: 0.1 },
    buoyant: { fluidDensity: 1000, fluidViscosity: 0.001, bobRadius: 0.035 },
  })) {
    const p = { ...base, ...props };
    const e = new PendulumEngine(p);
    e.setMode(mode);
    const states = [e.getState()];
    for (let i = 0; i < 2400; i++) states.push(e.step());
    runs.push({ name, mode, p, states, metrics: e.getDerivedMetrics() });
  }
writeFileSync("validation/fluid-runs.json", JSON.stringify(runs));
console.log("Eight fluid runs recorded.");
