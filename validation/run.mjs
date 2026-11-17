import { PendulumEngine } from "../src/physics.ts";
import { writeFileSync } from "node:fs";
const base = {
  mass: 1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 2.75,
  dt: 1 / 240,
  initialAngle: 0.9,
  initialOmega: 0,
};
const cases = [];
for (const mode of ["angular", "cartesian"]) {
  for (const [name, changes] of Object.entries({
    free: {},
    linear: { linearDamping: 0.4 },
    quadratic: { quadraticDamping: 0.1 },
    driven: { linearDamping: 0.08, driveAmplitude: 0.5, driveOmega: 3.5 },
    rotation: { initialOmega: 10 },
    stiff: {
      mass: 0.1,
      length: 0.2,
      linearDamping: 0.8,
      quadraticDamping: 0.2,
      driveAmplitude: 2,
      driveOmega: 8,
    },
  })) {
    for (const dt of [1 / 30, 1 / 60, 1 / 120, 1 / 240]) {
      const p = { ...base, ...changes, dt },
        engine = new PendulumEngine(p);
      engine.setMode(mode);
      const states = [engine.getState()];
      for (let i = 0; i < Math.round(10 / dt); i++) states.push(engine.step());
      cases.push({
        name,
        mode,
        p,
        states,
        metrics: engine.getDerivedMetrics(),
      });
    }
  }
  for (const initialAngle of [0.05, 0.3, 0.9, 1.5, 2.4, 3]) {
    const p = { ...base, initialAngle },
      engine = new PendulumEngine(p);
    engine.setMode(mode);
    for (let i = 0; i < 40 / p.dt; i++) engine.step();
    cases.push({
      name: "period",
      mode,
      p,
      metrics: engine.getDerivedMetrics(),
    });
  }
  const engine = new PendulumEngine(base);
  engine.setMode(mode);
  for (let i = 0; i < 120 / base.dt; i++) engine.step();
  cases.push({
    name: "long",
    mode,
    p: base,
    state: engine.getState(),
    metrics: engine.getDerivedMetrics(),
  });
}
writeFileSync("validation/runs.json", JSON.stringify(cases));
