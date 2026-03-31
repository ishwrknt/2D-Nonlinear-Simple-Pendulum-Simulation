# Physics Derivations

## Angular model

The simulator treats the bob as a point mass at radius `L`.

- Restoring torque: `τg = -mgL sin(θ)`
- Linear damping torque: `τb = -bω`
- Quadratic damping torque: `τc = -cω|ω|`
- Driving torque: `τd = A sin(ωd t)`

With moment of inertia `I = mL²`, the angular equation becomes:

`θ¨ = -(g/L) sin(θ) - (b / mL²) ω - (c / mL²) ω|ω| + (A / mL²) sin(ωd t)`

The update uses a kick-drift-kick style Velocity Verlet variant:

1. `ω_half = ωn + 0.5 α(θn, ωn, tn) Δt`
2. `θn+1 = θn + ω_half Δt`
3. `ωn+1 = ω_half + 0.5 α(θn+1, ω_half, tn+1) Δt`

This keeps the integration fixed-step and stable for the educational scenarios in the brief.

## Cartesian mode

Cartesian mode evolves bob position under gravity, then enforces the rod-length constraint.

1. Advance `x, y` with gravity only.
2. Project the point back to radius `L`.
3. Remove radial velocity by tangentializing the velocity vector.

That matches the brief requirement:

- gravity only force
- no explicit tension force in the integrator
- projection after the full step
- tangentialized velocity after projection

## Energies

- Kinetic energy: `T = 0.5 m v²`
- Potential energy: `V = mgL(1 - cos θ)`
- Total energy: `E = T + V`

The live energy drift metric is computed as:

`((Emax - Emin) / max(|E0|, ε)) * 100`

where `E0` is the reset-time energy baseline.

## Period estimation

The estimated period uses successive positive zero crossings of `θ`.

- Detect crossing when the previous sample is negative, the current sample is non-negative, and `ω > 0`.
- Average the last three full-cycle intervals when available.
