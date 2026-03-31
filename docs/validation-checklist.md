# Validation Checklist

## Functional checks

- [ ] Play advances the simulation continuously with fixed-step graph updates.
- [ ] Pause freezes motion without clearing graph history.
- [ ] Step executes exactly one physics step and appends one new graph sample.
- [ ] Reset clears all graph buffers and restores the configured initial state.
- [ ] Dragging the bob pauses the simulation, zeros time, clears graph history, resets drive phase implicitly by resetting time, and leaves `ω = 0`.
- [ ] Parameter changes force a reset and clear graph history.

## Visualization checks

- [ ] Motion, force vectors, energy overlay, equations, instantaneous values, and derived values can each be hidden with toggles.
- [ ] Graph mode switching reuses retained buffers instead of clearing them.
- [ ] Time-series graphs auto-scale the visible Y range with margin padding.
- [ ] Phase space uses independent X and Y scaling.
- [ ] Cartesian `x(t)` and `y(t)` views are available only in Cartesian mode.

## Physics checks

- [ ] Undamped angular motion produces an approximately closed phase-space loop.
- [ ] Positive linear damping produces inward phase-space spirals and decaying energy.
- [ ] Driving near `sqrt(g/L)` increases amplitude relative to the undriven baseline.
- [ ] Cartesian mode keeps `x² + y²` close to `L²` after repeated stepping.

## Performance checks

- [ ] Sample storage remains capped at 10,000 points per graph.
- [ ] No unbounded history growth occurs during long runs.
- [ ] Build succeeds with `npm run build`.
