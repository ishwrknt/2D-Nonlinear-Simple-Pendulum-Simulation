# 1. Project Identity

**2D Nonlinear Simple Pendulum Simulation**
Deterministic, symplectic, educational
TypeScript + Canvas 2D + Vite
Standalone static deployable

---

# 2. Educational Visualization Requirements

The system must not only simulate but **explain**:

It must visually present:

1. Motion
2. Forces
3. Energy
4. Phase space
5. Governing equations
6. Instantaneous numerical values
7. Derived quantities (period, max angle, etc.)

All visual components must be toggleable.

---

# 3. Graph Subsystem — Complete Specification

## 3.1 Available Graph Modes (Selectable)

User can choose one at a time:

### (A) Angular Position vs Time

[
\theta(t)
]

Units: radians
Y-axis dynamic scaling

---

### (B) Angular Velocity vs Time

[
\omega(t)
]

Units: rad/s

---

### (C) Total Energy vs Time

[
E(t)
]

Units: Joules

Must visually distinguish:

* Constant energy (flat band)
* Damped decay
* Driven growth

---

### (D) Phase Space

[
(\theta, \omega)
]

* X-axis: θ (rad)
* Y-axis: ω (rad/s)
* Must support:

  * Closed orbit (undamped)
  * Spiral (damped)
  * Complex/chaotic regimes (driven)

---

### (E) Cartesian Position vs Time (Cartesian Mode Only)

[
x(t)
]
[
y(t)
]

Selectable between x or y.

---

## 3.2 Graph Sampling Policy

* Sample every physics step.
* Stored in fixed ring buffer (10,000 points).
* When full → overwrite oldest.
* Graph renders only visible window.
* No dynamic memory growth.

---

## 3.3 Graph Scaling Rules

* Auto-scale Y axis based on:

  * Visible data window
  * With 10% margin padding
* Time axis scrolls continuously.
* Phase space scales independently in both axes.

---

# 4. Data Table Panel (Persistent)

Displayed live beneath controls.

## 4.1 Instantaneous Quantities

| Quantity             | Symbol | Unit   |
| -------------------- | ------ | ------ |
| Angle                | θ      | rad    |
| Angular velocity     | ω      | rad/s  |
| Angular acceleration | α      | rad/s² |
| Total energy         | E      | J      |
| Kinetic energy       | T      | J      |
| Potential energy     | V      | J      |
| Time                 | t      | s      |

---

## 4.2 Derived Quantities (Auto-Computed)

| Derived                        | Method               |
| ------------------------------ | -------------------- |
| Maximum angle reached          | Track running max    |
| Estimated period               | Zero-cross detection |
| Natural frequency              | ( \sqrt{g/L} )       |
| Small-angle theoretical period | ( 2\pi\sqrt{L/g} )   |
| Energy drift (%)               | Relative oscillation |

Period estimation:

* Detect successive positive zero crossings.
* Average over last 3 cycles.

---

# 5. On-Screen Equation Display (Toggleable)

User can toggle equation panel.

## 5.1 Angular Mode Equation

[
\ddot{\theta}
=============

-\frac{g}{L}\sin\theta
-\frac{b}{mL^2}\dot{\theta}
-\frac{c}{mL^2}\dot{\theta}|\dot{\theta}|
+\frac{A}{mL^2}\sin(\omega_d t)
]

---

## 5.2 Energy Equation

[
E = \frac{1}{2} mL^2\omega^2 + mgL(1-\cos\theta)
]

---

## 5.3 Cartesian Constraint Equation (If Active)

[
x^2 + y^2 = L^2
]

Equations rendered as static formatted math (KaTeX or lightweight renderer).
No heavy math frameworks.

---

# 6. Vector Visualization

Vectors drawn from bob center.

Selectable toggles:

| Vector       | Expression                    |
| ------------ | ----------------------------- |
| Gravity      | ( mg ) downward               |
| Velocity     | ( L\omega ) tangential        |
| Tension      | Computed via radial balance   |
| Acceleration | Total tangential acceleration |

Scaling factor:

* Vectors scaled relative to length L.
* Prevent extreme scaling overflow.

---

# 7. Physics Core (Reconfirmed)

Angular:

[
\ddot{\theta}
=============

-\frac{g}{L}\sin\theta
-\frac{b}{mL^2}\omega
-\frac{c}{mL^2}\omega|\omega|
+\frac{A}{mL^2}\sin(\omega_d t)
]

Velocity Verlet mandatory.

Cartesian:

* Gravity only force.
* No explicit tension.
* Projection after full step.
* Velocity tangentialized.

Constraint tolerance:
[
< 10^{-6}
]

---

# 8. Interaction Rules (Finalized)

Dragging:

* Pause simulation.
* Reset time to zero.
* Clear graph buffers.
* Reset drive phase.
* Set ω = 0.
* Resume only when user presses play.

Parameter changes:

* Force reset.
* Clear history.
* Reset time.

Frame stepping:

* Executes exactly one physics step.
* Graph updates accordingly.

---

# 9. Layout Specification (PhET Inspired)

```
+------------------------------------------------+
|                 Simulation Canvas              |
|                                                |
+----------------------+-------------------------+
| Controls + Data      | Graph Panel             |
| + Equation Panel     | (Selectable)            |
+----------------------+-------------------------+
```

Responsive but desktop-first.

---

# 10. Graph Engine Architecture Update

```ts
interface GraphDataset {
  push(value: number, time: number): void
  clear(): void
}
```

Phase space dataset stores tuple (θ, ω).

Separate buffers for each graph type.

Switching graph:

* Does not clear data.
* Uses existing buffer.

Reset:

* Clears all buffers.

---

# 11. Performance Constraints (Updated)

* Graph rendering ≤ 2 ms per frame.
* Physics step ≤ 1 ms per step.
* No per-frame memory allocation in integrator.
* Total memory footprint stable over time.

---

# 12. Validation Extensions

Additional validation:

### Phase Space Closed Orbit

Undamped mode must show closed loop.

### Damped Spiral

Energy decay correlates with inward spiral.

### Driven Resonance

Amplitude increases near:
[
\omega_d \approx \sqrt{g/L}
]

---

# 13. Determinism Reinforced

Given same:

* Parameters
* Initial state
* Δt

Simulation must produce identical results across runs.

---

# 14. Final Deliverables (Expanded)

1. Simulation
2. Graph subsystem
3. Data table
4. Equation display
5. Documentation of physics derivations
6. Validation checklist
7. Determinism statement in README

---

# 15. What This Now Achieves

The document now:

* Fully specifies all graphs
* Defines sampling and scaling
* Specifies tables
* Defines equation display
* Clarifies vector visualization
* Aligns with educational goals
* Preserves numerical rigor
* Prevents ambiguity in implementation

