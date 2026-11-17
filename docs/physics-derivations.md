# Model and numerical method — version 0.3.0

A point bob of mass m is attached to a massless rigid rod L at a fixed pivot in a vertical plane. The rod can support compression, so rotations are allowed; this does not model a string going slack. No measured apparatus or classroom learning outcomes are claimed.

Coordinates: x=L sin θ, y=L cos θ, y positive downward; positive θ moves towards the right from the lowest point. Thus vx=Lω cos θ, vy=−Lω sin θ and ω=(y vx−x vy)/L². Internally angles are continuous through rotations. The initial angular velocity may be nonzero.

## Angular equations

I=mL²; τ=−bω−cω|ω|+A sin(Ωt).

θ̇=ω; ω̇=−(g/L)sin θ+τ/I.

b has units N m s/rad, c has units N m s²/rad², A has units N m, Ω has units rad/s. Values of b and c cannot be compared as equal damping strengths without specifying ω.

## Independent Cartesian equations

Let r²=x²+y² and v²=vx²+vy². At each RK stage:

ω=(y vx−x vy)/r²; λ=(gy+v²)/r²; aτ=τ/(mL).

ẋ=vx; ẏ=vy; v̇x=−λx+aτ y/r; v̇y=g−λy−aτ x/r.

On the constraint surface these equations follow from r·a=−v². Gravity and all selected torques act in this formulation. After every internal step, position is projected onto radius L and radial velocity removed. Then the continuous angle is reconstructed using the smallest angle increment and ω with the sign above. This projected RK4 method is not RATTLE and is not claimed symplectic. State-dependent subdivision limits angular travel; equivalence to the angular equations is checked independently.

## Integration and accuracy

Both formulations use classical four-stage fourth-order Runge–Kutta. The output interval Δt is fixed. Internal step count is n=max(1,ceil(Δt R/0.15)), where R is the maximum of sqrt(g/L), |ω|, (b+2c|ω|)/I, sqrt(A/I), and Ω when A>0. R uses the state at the start of the output interval. Subdivision is deterministic and heuristic, not an adaptive error tolerance or stability proof. More than 1000 internal steps is rejected. UI bounds constrain ordinary use. Repeat with half Δt to test sensitivity. The nonsmooth second derivative of ω|ω| can affect asymptotic convergence at zero crossings.

## Work and energy

K=½mL²ω²; U=mgL(1−cos θ); E=K+U. U=0 at the lowest point.

Ẇdrive=A sin(Ωt)ω; Ėdissipated=bω²+c|ω|³.

Work and dissipated energy are integrated in the same RK stages as the mechanical state. The residual is E−E0−Wdrive+Edissipated (joules). Changes in mechanical energy under damping/driving are physical, and are not labelled numerical drift. For conservative validation the energy range is 100(Emax−Emin)/max(|E0|,mgL·1e−12,1e−12 J). A residual is a consistency check, not proof of trajectory accuracy.

## Periods and interpretation

For g>0, T0=2πsqrt(L/g). An undamped/undriven release from rest at 0<|θ0|<π has T=4sqrt(L/g)K(sin²(θ0/2)), using the elliptic parameter convention. The application evaluates this through an arithmetic–geometric mean; Python validation uses SciPy's independent elliptic-integral function.

Positive-going zero crossings are linearly interpolated between internal step endpoints. The most recent one to three complete intervals are averaged. A top crossing disables oscillation-period reporting until reset. For damped/driven motion the measurement is explicitly a recent crossing interval, not a guaranteed steady-state period. Near rest no useful measured period exists; T0 describes the small-oscillation limit. No finite-amplitude prediction is displayed for driven/damped motion, nonzero initial speed, equilibrium, or rotations.

## Display and data

Rendering is independent of output stepping. Page hiding pauses playback; slow frames can slow wall-clock playback while output steps remain fixed. Read simulated time for measurements. Fit-to-view enlarges the rod for visibility; disable it to compare lengths at fixed spatial scaling. Gravity and velocity arrows have distinct, capped visual scales, not a common physical unit. Graphs automatically fit visible samples and show their units. Full-run history retains all output states until Reset or a parameter change. For plotting, at most 512 hierarchical time buckets retain their first/last points and extrema for theta, omega, K, U, E, drive work, dissipation, x and y. When the bucket count exceeds 512, neighbouring buckets merge and the bucket width doubles. This bounds drawing work while keeping the full time span, endpoints and per-bucket extrema. It can omit fine oscillation structure in dense plots; it is not a substitute for raw-data analysis. Scrolling views use a binary search to select raw points in the requested interval. CSV contains every original output state and settings at full JavaScript numeric precision. Raw storage and export size grow with duration and are subject to browser memory; there is no fixed 40-second or 10,000-state cutoff.

## Optional fluid extension
The preceding dry equations apply when fluid density is zero. With a fluid enabled, use buoyancy-adjusted restoring torque and potential, plus Reynolds-dependent drag and corresponding dissipation. See [fluid model](fluid-experiments.md) for the complete equations, limitations and reference sources. A spherical bob is represented by its centre of mass; its radius controls displaced volume and drag area.
