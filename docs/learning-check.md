# Learning check


## Learning check with simulated explanations
Added quiz.html, linked at the end of the laboratory. Eight multiple-choice questions: mass, length, nonlinear amplitude, damping/energy, fluid density, controlled viscosity experiment, neutral buoyancy and strong damping. One question at a time; explicit submission locks the answer, reveals correct/incorrect feedback and correct answer with explanation; each explanation has two engine-driven comparison animations, angle traces and numerical evidence, play/pause/replay. Next question follows explanation; final score and topic review; restart clears answers. No student identifiers or network submissions; reloading restarts. This is formative practice, not a validated summative exam or secure assessment.
Production build now includes index.html and quiz.html with relative asset paths. Tests: 17 Node tests including analytical properties of quiz demonstrations; 12 Chromium tests including full quiz score flow, incorrect/correct feedback, no-answer validation, replay after 12s, restart and mobile layout. Screenshot inspected: validation/quiz-preview.png.

Question content and answer keys are editable in src/quiz-questions.ts; presentation and demonstrations in src/quiz.ts. Answer keys are visible in delivered browser source, as appropriate for self-study. Teacher collection of student results is not implemented. Numerical demonstrations use the same documented model and limits as the laboratory. Do not interpret scores as evidence of learning gains without a separate educational study.

## Part Two: advanced challenges (after Part One)
Open `quiz.html` from the laboratory. Complete the eight Part One questions, then continue directly to Part Two without leaving the quiz. Eight additional questions cover combined length/gravity scaling, mass-dependent damping, critical versus excessive damping, the rotation energy threshold, radius-dependent buoyancy stability, driven energy balance, nonlinear bottom speed and matched buoyancy with different drag. Each answer locks on submission and reveals feedback, a derivation, and two replayable simulations. A single final result shows the combined score out of 16 and both part scores. Restart returns to Part One.

The comparison now includes angular velocity, predicted conservative bottom speed, drive work and energy-balance residual. Pendulum panels accommodate motion above the pivot. Advanced content lives in `src/quiz-advanced.ts`. This remains self-study practice; scores are not stored or submitted.

Advanced numerical checks run each comparison for 12 simulated seconds, test the period ratio and speed ratio analytically, check rotation versus oscillation, and bound the energy-balance residual. The browser test exercises every advanced answer and replay at mobile width, including a deliberately wrong answer and final score.
