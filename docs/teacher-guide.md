# Teacher guide

The laboratory supports a predict–observe–explain–repeat lesson. Start paused, state the idealisation, and change one parameter at a time. Ask students to write predictions before using a preset.

1. **Period and length.** Use a 10° release with zero damping/drive; compare several lengths and masses. Wait for two positive-going crossings, export data, and plot T² against L. Explain the cancellation of mass in the conservative equation.
2. **Large amplitudes.** Compare 10°, 30°, 60° and 90°. Record T0, exact finite-amplitude T and measured crossing interval. Define an acceptable small-angle error and determine where it is exceeded.
3. **Energy transfer.** Compare conservative, linearly damped and quadratically damped motion. Plot K, U, E; then E, drive work and dissipation. Explain the signed work of the drive and positive energy dissipation. Evaluate the residual E−E0−W+Ediss rather than interpreting decreasing E as numerical failure.
4. **Driving.** Keep damping fixed and compare frequencies. Near sqrt(g/L) is only a small-amplitude guide: nonlinear frequency shifts and transients matter. Avoid claiming every near-resonant drive always increases amplitude.
5. **Numerical evidence.** Compare solvers at matching simulated times and repeat with half the time step. CSV units remain SI even though the release-angle control uses degrees. Different graphs may use different automatic ranges.
6. **Real apparatus.** Measure pivot-to-centre length, average several swings, record uncertainty and discuss finite bob size, pivot friction and drag. A rigid-rod model does not include string slackening.

Presets are starting points, not experiments with established learning outcomes. Classroom evaluation and student feedback are still needed to support claims of educational effectiveness. Controls are keyboard accessible; numeric inputs provide an alternative to dragging the bob. CSV allows analysis outside the canvas interface.

## New fluid investigations
Use Air, Under water, Oil and A buoyant bob presets. The [fluid experiment guide](fluid-experiments.md) supplies independent-variable studies, buoyancy/drag equations, illustrative fluid inputs and a blank recording sheet. Hold the sphere and release fixed when comparing fluids; vary density and viscosity separately before interpreting replacement of water by oil.
