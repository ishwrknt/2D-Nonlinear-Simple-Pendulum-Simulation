# Nonlinear Pendulum Laboratory

Version 0.3.0: an interactive rigid-rod pendulum laboratory for students and teachers. The TypeScript/Canvas application includes independent angular and constrained Cartesian calculations, nonlinear restoring torque, linear/quadratic damping, periodic driving, energy accounting, classroom investigations, CSV data and shareable settings.

Public deployment: https://sastriosks.github.io/2D-Nonlinear-Simple-Pendulum-Simulation/ . The local revision differs from the public deployment until merged and deployed.

## Run locally

Requires Node.js 24 or later and npm. In this project folder:

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite. The application starts paused. Choose an investigation, predict the outcome and press Play. Step once advances one output step. Changing parameters resets the experiment. Damping, driving and initial angular speed are in an expandable panel.

## Test and build

```bash
npx playwright install chromium
npm test
python -m pip install -r validation/requirements.txt
npm run validate:physics
python validation/figures.py
python validation/fluid-figures.py
node validation/benchmark.mjs
```

On a clean Linux host, Playwright may require `npx playwright install --with-deps chromium`. Python 3.12 is used in CI; recorded local results identify the actual local Python version. Browser checks run against a production build. `npm test` runs Node checks, build and Chromium tests. Independent SciPy validation is a separate command. Large `validation/runs.json` data regenerate on demand and are ignored in Git. Numeric reports, figures and benchmark metadata are retained.

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

`dist/` is the static site with a relative base suitable for GitHub Pages. Serve it over HTTP; do not open index.html directly with a file URL. The Pages workflow runs automated checks before deploying on a future push to main. No deployment was performed during this revision.

## Reading the evidence

- [Model and numerical derivation](docs/physics-derivations.md)
- [Fluid investigations and model limits](docs/fluid-experiments.md)
- [Teacher activities](docs/teacher-guide.md)
- [Validation summary](validation/README.md), numeric `report.json` and figures
- [Publication checklist](docs/publication-readiness.md)
- [SMART correction workflow](docs/development-workflow.md)
- [Progress](PROGRESS.md), [handover](HANDOVER.md), [context](CONTEXT.md)

UI release angles use degrees; calculations and CSV use SI radians. The rod is fitted to view by default; turn fit off for fixed-scale length comparisons. The checked Fit all data box compresses the axis over the full run. Uncheck it to choose Last 10 s or Last 30 s. The former 10,000-state cutoff is removed: all original samples remain available for CSV until Reset or a parameter change. To keep plotting responsive, hierarchical summaries preserve endpoints and per-segment extrema of each plotted quantity. Dense plots show a reduced representation, not every oscillation in full detail; CSV contains every sample. Full raw storage grows with run length and is subject to available browser memory. The default is a conservative 10° release from rest, with damping and driving off.

## Provenance and limits

The original implementation is preserved at Git commit `a4d1d9c01010f41e0f842f516e5cb53ad2276750` and its solver is archived under `validation/baseline/`. Earlier root implementation briefs describe historical requirements and are not current validation evidence. The SMART correction session reused an explicitly identified prior local draft, then refined and independently checked it. SMART roles ran sequentially within the coding assistant; no separate model services or subagents were used.

Finite validation does not establish accuracy for every possible parameter choice or indefinitely long driven trajectories. The RK4 solver is not symplectic. The current model does not describe a slack string or finite-size bob. Teaching activities are proposed; learning gains have not been measured. See the publication checklist before making journal claims.

## Air, water and oil investigations
New presets compare the same immersed spherical bob in illustrative fluids; density and dynamic viscosity can be varied independently. The Fluid investigation data view reports buoyancy, bob density, effective gravity, Reynolds number and resisting torque. See the on-page experiment guide and downloadable CSV recording sheet. This is an approximate quasi-steady hydrodynamic extension; added mass and unsteady effects are omitted, so real-fluid apparatus validation remains necessary. The default stays the simplest conservative release.


## Expanded exploration controls
Numeric physical inputs now accept any finite value in their sign domain, including scientific notation, with no arbitrary upper bounds. Mass/length/radius/viscosity must be positive; gravity/passive damping/drive amplitude/frequency/fluid density nonnegative; angles and initial speed may be signed. Shared settings obey the same domains. Integration retains a numerical work guard and rejects overflow; this is not proof of accuracy at arbitrary extreme inputs. The output-step selector remains intentionally discrete.
Added Moon (illustrative g=1.62), long pendulum (3 m), strong damping (b=8), near-neutral buoyancy cases; renamed preset to Oil. Radius/length model note and long-rod fit reminder added.
Checks: 16 Node tests, 10 Chromium tests and build passed. Five added preset/expanded-input scenarios ran10s with both solvers; energy residual and coordinate angle agreement <1e-5. Tests cover 12m length, .02kg mass, b=3 and settings round-trip. No remote deployment.

## Student learning check
Open quiz.html or use Start the learning check at the end of the laboratory. Eight questions provide one-at-a-time feedback, explanations and paired simulations, followed by a score. See docs/learning-check.md.

## Part Two: advanced challenges (after Part One)
Open `quiz.html` from the laboratory. Complete the eight Part One questions, then continue directly to Part Two without leaving the quiz. Eight additional questions cover combined length/gravity scaling, mass-dependent damping, critical versus excessive damping, the rotation energy threshold, radius-dependent buoyancy stability, driven energy balance, nonlinear bottom speed and matched buoyancy with different drag. Each answer locks on submission and reveals feedback, a derivation, and two replayable simulations. A single final result shows the combined score out of 16 and both part scores. Restart returns to Part One.

The comparison now includes angular velocity, predicted conservative bottom speed, drive work and energy-balance residual. Pendulum panels accommodate motion above the pivot. Advanced content lives in `src/quiz-advanced.ts`. This remains self-study practice; scores are not stored or submitted.

## Compare multiple pendulums
Use **Compare pendulums** at the top of the laboratory. Your current physical settings become pendulum 1. **Add pendulum** copies the last setup; there is no fixed three-pendulum limit. Each card has independent physical inputs and presets, with advanced damping/drive and fluid controls collapsed. Play, pause, step and reset operate on all pendulums together at one shared output step. Editing, adding or removing resets every run to time zero.

The shared graph overlays angle, angular velocity, mechanical energy, phase space or position. Animations share one length scale. Comparison links preserve all settings; CSV includes every recorded sample and each pendulum’s parameters in SI units. Full history uses the existing extrema-preserving plot summaries. Browser memory and compute time constrain practical run sizes. Independent pendulums do not interact mechanically.

Validation: 18 physics/data tests and 16 browser tests passed, including synchronization, controlled mass/length comparisons, CSV, shared links, invalid-input handling and four-pendulum mobile layout. After mobile graph refinements, all three comparison browser tests passed again.

## Level-based learning certificates
The learning check now offers Classes 9–10, Classes 11–12, BSc and MSc pathways from a 93-question bank. Enter name, roll and class, complete two randomized eight-question parts, and score more than60% combined to unlock a printable certificate. An optional six-question harder challenge has a separate score. Progress resumes within the current tab. See docs/learning-check.md for certificate rules, data handling and validation.
