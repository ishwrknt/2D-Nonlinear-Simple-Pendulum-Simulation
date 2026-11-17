# Fluid investigations — version 0.3.0

The simplest default remains a conservative point-mass pendulum. Fluid presets add a controlled approximate model for a small spherical bob fully immersed in a large still fluid. They are teaching scenarios, not validated measurements of a water/oil apparatus.

## Input sets

All three comparison presets use m=0.10 kg, L=0.75 m, r=0.025 m, θ0=30°, ω0=0, g=9.81 m/s² and no additional b/c damping or driving.

| Scenario | Fluid density (kg/m³) | Dynamic viscosity (Pa s) |
|---|---:|---:|
| Air, illustrative | 1.2 | 0.000018 |
| Water, illustrative | 1000 | 0.001 |
| Oil, illustrative | 900 | 0.10 |

These are approximate, user-editable teaching inputs. No temperature, oil type, purity or measurement uncertainty is specified, so they must not be cited as precise material properties. Density alone is insufficient to specify fluid drag. Oil changes both inputs; students must isolate variables to explain the combined result.

The buoyant-bob preset increases radius to 0.035 m at the same mass, giving a bob density below water density. The rigid rod then allows motion towards the upper equilibrium; free-surface floating and slack-string behaviour are not modelled.

## Equations

For sphere volume V=4πr³/3, buoyancy is ρVg upward. The effective conservative body acceleration is g_eff=g(1−ρV/m). This uses Archimedes' fully immersed displaced-volume model. [OpenStax, Archimedes' principle](https://openstax.org/books/college-physics/pages/11-7-archimedes-principle).

The angular equation is

mL² θ̈ = −(m−ρV)gL sin θ − bω − cω|ω| − τfluid + A sin(Ωt).

The Cartesian model uses g_eff in both body acceleration and the radial constraint multiplier, and the same signed fluid resisting torque as the angular equation.

For centre speed v=L|ω|, sphere diameter 2r and dynamic viscosity μ, Re=ρ(2r)v/μ. The Schiller–Naumann approximation uses Cd=24(1+0.15Re^0.687)/Re up to Re=1000 and Cd=0.44 above that. The force magnitude is ½ρCdπr²v². At zero speed the implementation uses the finite form 6πμrv(1+0.15Re^0.687) to avoid division by zero. τfluid has magnitude L Fdrag and the sign of ω. [Altair AcuSolve sphere-drag model](https://2024.help.altair.com/2024.1/hwcfdsolvers/acusolve/topics/acusolve/training_manual/altair_acusolve_edem_coupling_r.htm).

The high-Re branch is not a universal sphere-drag law; a visible note identifies Re>200,000 as outside its usual useful range. Sphere drag varies with Reynolds number and can change substantially at high Re. [NASA Glenn, Drag of a Sphere](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-of-a-sphere/).

Effective potential is U=(m−ρV)gL(1−cos θ), including buoyancy. It can be negative if the lower equilibrium is unstable. Dissipation includes τfluid ω, always nonnegative. Work–energy residual and CSV therefore remain consistent with this extended model. For g_eff>0, 2πsqrt(L/g_eff) is an undamped small-angle reference, not an asserted measured period in viscous fluid. At g_eff≤0 there is no downward small-oscillation prediction. Finite-amplitude conservative predictions are hidden whenever a nonzero fluid is selected.

## Controlled classroom experiments

1. Hold μ=0.001 Pa s fixed; use ρ=800, 1000, 1200 kg/m³. Predict buoyancy/effective gravity. Compare intervals, decay and energy. Density changes both buoyancy and Reynolds-dependent drag.
2. Hold ρ=900 kg/m³ fixed; use μ=0.001, 0.01, 0.10 Pa s. Compare peak decay and settling. Buoyancy is held fixed.
3. Compare the water and oil presets, then use experiments 1 and 2 to separate the two changed variables.
4. Compare fluid density with bob density m/V. Test neutral buoyancy and the sign reversal of the restoring torque. At neutral buoyancy, a release from rest stays at rest in this ideal model; give it initial velocity to study decay without a restoring torque.

Use the downloadable [recording sheet](../public/fluid-experiment-sheet.csv); prediction/observation cells are blank. Export each run before changing settings. If no complete swings occur, report no measured interval. Define a threshold before recording a settling time. Repeat with half the time step and explain numerical sensitivity separately from physical effects.

## Limits and evidence

This is a quasi-steady isolated-sphere approximation. It omits added mass, fluid memory/history forces, walls, free surfaces, fluid motion, drag on the rod and finite-bob rotational inertia. Added-mass and unsteady effects may matter appreciably in water and oil, so reference-solver agreement establishes numerical implementation of the equations, not real-fluid predictive accuracy. A measured apparatus comparison and a more complete hydrodynamic model are required for quantitative experimental claims.

`validation/fluid-run.mjs` records eight 10-second trajectories (four presets × two solvers). `fluid-check.py` independently computes the drag force in Python and compares with DOP853. It checks trajectory error, work–energy balance and positive dissipation; see `fluid-report.json`. Analytical Node tests check buoyancy, neutral buoyancy, Stokes limit, opposite drag direction and reversal of restoring torque. Browser tests check fluid controls, editable independent variables and shared settings. The original dry benchmarks are rerun as regressions.
