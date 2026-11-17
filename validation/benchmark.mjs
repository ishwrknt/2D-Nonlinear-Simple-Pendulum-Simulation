import { performance } from "node:perf_hooks";
import os from "node:os";
import { writeFileSync } from "node:fs";
import { PendulumEngine } from "../src/physics.ts";
const p = {
  mass: 1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 2.75,
  dt: 1 / 240,
  initialAngle: 0.9,
};
const results = [];
for (const mode of ["angular", "cartesian"]) {
  const times = [];
  for (let trial = 0; trial < 7; trial++) {
    const e = new PendulumEngine(p);
    e.setMode(mode);
    const start = performance.now();
    for (let i = 0; i < 50000; i++) e.step();
    const elapsed = performance.now() - start;
    if (trial >= 2) times.push(elapsed);
  }
  const sorted = [...times].sort((a, b) => a - b);
  results.push({
    mode,
    steps_per_trial: 50000,
    warmup_trials: 2,
    measured_trials: 5,
    elapsed_ms: times,
    median_ms: sorted[2],
    median_us_per_step: (sorted[2] * 1000) / 50000,
  });
}
const report = {
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  cpu: os.cpus()[0].model,
  results,
  note: "Node engine-only throughput, no rendering or browser overhead. Machine-specific, not an animation FPS claim.",
};
writeFileSync(
  "validation/benchmark.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
