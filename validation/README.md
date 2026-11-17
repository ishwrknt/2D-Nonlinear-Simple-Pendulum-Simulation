# Numerical validation — version 0.3.0

All 62 recorded cases passed `python validation/check.py`. This includes 48 trajectories (6 physical scenarios × 4 output steps × 2 solvers), 12 period measurements and 2 long conservative runs. The 16 Node tests and 9 Chromium tests add functional coverage; they are not 62 statistically independent experiments.

Reference: SciPy 1.15.3 DOP853 rtol=2e-12 atol=2e-14; elliptic integral. Python 3.12.12; Node v24.14.0.

## Benchmarks

Base: m=1 kg, L=0.75 m, g=9.81 m/s², θ0=0.9 rad, ω0=0. Δt=1/240 s unless varied. Free: b=c=A=0. Linear: b=0.4. Quadratic: c=0.1. Driven: b=0.08, A=0.5 N m, Ω=3.5 rad/s. Rotation: ω0=10 rad/s. Strong damping/forcing: m=0.1, L=0.2, b=0.8, c=0.2, A=2, Ω=8 (other values unchanged). Trajectories run 10 s at Δt=1/30,1/60,1/120,1/240 s.

The trajectory error is max sqrt((θ−θref)² + (ω−ωref)²/(g/L)); this is a dimensionally scaled state norm, not a percentage. At default Δt it must be below 2e−5; absolute energy-balance residual must be below 2e−5 J. Constraint and tangency checks use absolute 1e−12 thresholds in m² and m²/s respectively. Output constraints are checked after reconstruction from the projected state, not at intermediate RK stages.

Periods: θ0=0.05,0.3,0.9,1.5,2.4,3 rad, conservative release from rest, 40 s. Largest measured relative period error: **6.5788423e-05%**. Exact AGM prediction agrees with SciPy ellipk to relative 1e−12.

| Solver | Conservative energy range over 120 s (%) | Final E/E0 |
|---|---:|---:|
| angular | 3.66434191e-07 | 0.999999996394 |
| cartesian | 1.66185397e-06 | 0.999999983844 |

Free, linearly damped and driven smooth benchmarks show approximately fourth-order finest-pair convergence. Quadratic torque is not globally smooth; its observed order is reported rather than guaranteed. Rotation cases display finite-resolution orders above four; this is not a higher-order-method claim. Strong-damping cases use internal subdivisions and are excluded from the nominal-step order test. See `report.json` for all observed values.

Baseline `baseline/report.json` documents the original Cartesian energy ratio 0.026726 after 120 s, reversed angular velocity and force omission. That original solver is preserved for reproduction. The current solver is not asserted identical to earlier manuscript outputs.

## Performance

- angular: median 2.515 μs/output step over 5 measured trials of 50,000 steps after 2 warmups.
- cartesian: median 3.544 μs/output step over 5 measured trials of 50,000 steps after 2 warmups.

Machine: 12th Gen Intel(R) Core(TM) i7-12650H; linux x64. Engine-only Node timing excludes rendering and browser overhead; it is not a browser FPS benchmark or a portable performance guarantee.

## Reproduction and figures

Run commands in the root README. `runs.json` is generated; `report.json`, `baseline/report.json`, `benchmark.json` and the vector PDF/SVG figures are retained. `figures.py` uses measured outputs only. Figure 1 compares reference errors/convergence and period errors. Figure 2 shows the driven benchmark's work–energy residual. Figure 3 diagrams the recorded SMART correction workflow (a conceptual diagram, not a measured dataset). Screenshots document the revised interface, not educational outcomes.

Independent reference documentation: [SciPy DOP853](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.integrate.solve_ivp.html) and [ellipk parameter convention](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.special.ellipk.html).

Limits: finite benchmarks do not cover the full UI parameter space, indefinite integration, chaotic predictability, real-apparatus accuracy, other browser engines or educational effectiveness. The heuristic subdivisions are not tolerance-controlled adaptive integration.

## User-review correction: full-run plotting
The old 10,000-state ring discarded data after approximately 41.67 seconds at dt=1/240. It has been replaced by full raw recording and bounded hierarchical summaries for graph drawing. A 300,000-sample Node test checks full retention, endpoints, chronology and a planted extremum. A virtual-clock Chromium test runs beyond 60 simulated seconds at the default output step, checks that t=0 remains in the graph interval, and verifies the first and >10,000 rows of CSV. Fit-all is now a checked checkbox; unchecking enables the scrolling window. All 15 Node and 9 Chromium tests passed after this change. The engine itself and independent benchmark parameters are unchanged.

## Fluid extension
Eight additional 10-second preset trajectories are independently checked in fluid-report.json (four fluid scenarios × two solvers). These verify implementation of the approximate force model, not measurements of real fluids. fluid-comparison.pdf/svg/png shows actual simulated angle and normalised effective energy for air, water and illustrative oil with identical bob and release settings. See docs/fluid-experiments.md for exact inputs and missing physics.

## Advanced quiz validation
18 Node tests and 13 browser tests pass, plus all 62 dry and 8 fluid reference cases. See part2-physics-tests.log, part2-browser-tests.log, part2-reference.log and quiz-part2-preview.png. Browser execution used installed Google Chrome via the optional PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH setting; CI uses Playwright Chromium.
