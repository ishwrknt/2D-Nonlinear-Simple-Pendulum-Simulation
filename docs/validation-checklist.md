# Validation record for version 0.2.0

- [x] Original Cartesian defects reproduced with saved numeric evidence.
- [x] Node checks: signs, conservative/damped/driven behaviour, rotations, rest, zero gravity, deterministic runs, reset, invalid inputs, coordinate agreement.
- [x] Full-run storage: 300,000 samples preserve the start/end and chronology; bounded plotting summaries preserve extrema. Browser run beyond 60 simulated seconds and CSV verify removal of the former cutoff.
- [x] DOP853 trajectories, independent elliptic periods, convergence, energy accounting, constraints and 120-second conservative benchmark.
- [x] Chromium: play/pause/one-step/reset, parameters, presets, graph/data selections, CSV, shared/invalid settings, drag, mobile layout and fit-all checkbox with full history.
- [x] Responsive desktop/mobile screenshots inspected.
- [x] TypeScript and production Vite build.
- [x] Engine-only timing separated from browser performance.
- [ ] Other browser engines and physical mobile devices.
- [ ] Classroom outcomes or validation against a measured real apparatus.

See validation/README.md for exact scope; checked items refer to local evidence, not to a completed remote CI run or deployment.
