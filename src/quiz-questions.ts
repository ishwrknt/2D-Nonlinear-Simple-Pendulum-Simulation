import type { Parameters } from "./types";
export const quizBase: Parameters = {
  mass: 1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 0,
  dt: 1 / 240,
  initialAngle: Math.PI / 18,
  initialOmega: 0,
  fluidDensity: 0,
  fluidViscosity: 0.001,
  bobRadius: 0.025,
};
export interface Question {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  watch: string;
  cases: [
    { label: string; settings: Partial<Parameters> },
    { label: string; settings: Partial<Parameters> },
  ];
}
export const questions: Question[] = [
  {
    id: "mass",
    topic: "Mass and period",
    prompt:
      "Two ideal pendulums have the same length and 10° release angle, with no damping or drive. One bob has twice the mass. What happens to its period?",
    options: ["It doubles.", "It stays the same.", "It halves."],
    correct: 1,
    explanation:
      "The mass cancels from θ̈ = −(g/L)sin θ. For identical initial conditions, both angles follow the same motion. Their energies differ, but their periods do not. This conclusion assumes the conservative model; fluid and damping torques can introduce mass dependence.",
    watch:
      "The angle traces overlap and the two bobs stay in step. Compare the period references below.",
    cases: [
      { label: "Mass 1 kg", settings: {} },
      { label: "Mass 2 kg", settings: { mass: 2 } },
    ],
  },
  {
    id: "length",
    topic: "Length and period",
    prompt:
      "For small undamped oscillations, increasing the length from 0.75 m to 3 m changes the period by approximately what factor?",
    options: ["Two times longer.", "Four times longer.", "No change."],
    correct: 0,
    explanation:
      "T₀ = 2π√(L/g). Multiplying length by four multiplies period by √4 = 2. At the same release angle the finite-amplitude correction is also the same, so the period ratio is two for this ideal model.",
    watch:
      "The short pendulum completes roughly two swings while the long one completes one. Rods are fitted to separate panels; use their labels to compare actual lengths.",
    cases: [
      { label: "Length 0.75 m", settings: {} },
      { label: "Length 3 m", settings: { length: 3 } },
    ],
  },
  {
    id: "amplitude",
    topic: "Nonlinear motion",
    prompt:
      "The same undamped pendulum is released from 10° and then from 90°. Which release has the longer period?",
    options: [
      "The 10° release.",
      "Both periods are exactly equal.",
      "The 90° release.",
    ],
    correct: 2,
    explanation:
      "The small-angle approximation replaces sin θ by θ. At larger amplitudes this approximation fails: the exact finite-amplitude period increases with release angle. The 90° release takes longer to complete each oscillation.",
    watch:
      "The 90° trace gradually falls behind the 10° trace. This is a period difference, not damping; neither curve loses amplitude.",
    cases: [
      { label: "Release 10°", settings: {} },
      { label: "Release 90°", settings: { initialAngle: Math.PI / 2 } },
    ],
  },
  {
    id: "damping",
    topic: "Energy transfer",
    prompt:
      "With positive damping and no external drive, what happens to mechanical energy?",
    options: [
      "It gradually becomes dissipated energy.",
      "It stays constant while the amplitude shrinks.",
      "It increases every cycle.",
    ],
    correct: 0,
    explanation:
      "For linear damping, dE/dt = −bω² ≤ 0. Mechanical energy decreases and the model records the energy dissipated. In a real apparatus this can become thermal energy in the surroundings. A decrease in E is expected here; the consistency check is E + E_dissipated ≈ E₀.",
    watch:
      "Compare constant-amplitude motion with damping. In the damped run, E falls as dissipated energy rises.",
    cases: [
      { label: "No damping", settings: {} },
      { label: "Damping b = 0.4", settings: { linearDamping: 0.4 } },
    ],
  },
  {
    id: "density",
    topic: "Fluid density and buoyancy",
    prompt:
      "For the same fully immersed bob, increase fluid density while holding viscosity fixed. If the bob remains denser than the fluid, what happens to the undamped small-angle period reference?",
    options: [
      "It becomes shorter.",
      "It becomes longer.",
      "Density has no effect.",
    ],
    correct: 1,
    explanation:
      "Buoyancy increases with fluid density: F_B = ρVg. Thus g_eff = g(1 − ρV/m) decreases, and T₀ = 2π√(L/g_eff) increases while g_eff remains positive. Density also changes the drag, so a measured damped crossing interval need not equal this undamped reference.",
    watch:
      "The denser fluid has a smaller effective gravity and a longer reference period. Both traces also decay because the fluid model includes drag.",
    cases: [
      {
        label: "Density 800 kg/m³",
        settings: {
          mass: 0.1,
          fluidDensity: 800,
          fluidViscosity: 0.001,
          initialAngle: Math.PI / 6,
        },
      },
      {
        label: "Density 1200 kg/m³",
        settings: {
          mass: 0.1,
          fluidDensity: 1200,
          fluidViscosity: 0.001,
          initialAngle: Math.PI / 6,
        },
      },
    ],
  },
  {
    id: "viscosity",
    topic: "Design a controlled experiment",
    prompt:
      "Which comparison isolates the effect of viscosity in the fluid model?",
    options: [
      "Change the bob mass and the fluid together.",
      "Replace water with an unspecified oil using density alone.",
      "Keep bob, release and fluid density fixed; vary viscosity only.",
    ],
    correct: 2,
    explanation:
      "To isolate viscosity, hold the other inputs fixed. Then buoyancy and the undamped restoring-force reference remain unchanged. In the displayed cases, the higher viscosity produces stronger damping. An arbitrary water-to-oil replacement changes both density and viscosity and cannot isolate either effect.",
    watch:
      "Both references are equal because density is fixed at 900 kg/m³. Compare how quickly the peak angles decay at μ = 0.001 and 0.10 Pa s.",
    cases: [
      {
        label: "Viscosity 0.001 Pa s",
        settings: {
          mass: 0.1,
          fluidDensity: 900,
          fluidViscosity: 0.001,
          initialAngle: Math.PI / 6,
        },
      },
      {
        label: "Viscosity 0.10 Pa s",
        settings: {
          mass: 0.1,
          fluidDensity: 900,
          fluidViscosity: 0.1,
          initialAngle: Math.PI / 6,
        },
      },
    ],
  },
  {
    id: "neutral",
    topic: "Neutral buoyancy",
    prompt:
      "In this ideal fully immersed model, fluid density exactly equals bob density. The bob is released from rest away from the vertical. What happens, with no drive or extra torque?",
    options: [
      "It stays at its release angle.",
      "It oscillates as though no fluid were present.",
      "It immediately rises to the top.",
    ],
    correct: 0,
    explanation:
      "At neutral buoyancy, ρV = m, so the gravity and buoyancy torques cancel. Starting from rest gives no velocity-dependent drag either. The ideal bob remains at its initial angle. This does not model fluid currents, rod weight or a free surface.",
    watch:
      "The neutral-buoyancy bob stays at 30°. The denser comparison bob has a restoring torque and begins to move.",
    cases: [
      {
        label: "Neutral buoyancy",
        settings: {
          mass: 0.1,
          fluidDensity: 0.1 / ((4 * Math.PI * 0.025 ** 3) / 3),
          initialAngle: Math.PI / 6,
        },
      },
      {
        label: "Bob denser than fluid",
        settings: { mass: 0.1, fluidDensity: 1000, initialAngle: Math.PI / 6 },
      },
    ],
  },
  {
    id: "strong",
    topic: "Strong damping",
    prompt:
      "Can sufficiently strong passive damping prevent a pendulum released from a small angle from crossing the vertical?",
    options: [
      "No; every pendulum must complete a swing.",
      "Yes; it can approach equilibrium without overshoot.",
      "Only if gravity is zero.",
    ],
    correct: 1,
    explanation:
      "In the small-angle linear model, Iθ̈ + bθ̇ + mgLθ = 0. The critical damping is b_c = 2mL²√(g/L), about 4.07 N m s/rad for this setup. The b = 8 case is overdamped and approaches equilibrium without completing oscillations. Reporting a measured period would be inappropriate when no full cycles occur.",
    watch:
      "The weakly damped bob crosses the vertical. The strongly damped bob approaches it from the release side.",
    cases: [
      { label: "Weak damping b = 0.08", settings: { linearDamping: 0.08 } },
      { label: "Strong damping b = 8", settings: { linearDamping: 8 } },
    ],
  },
];
