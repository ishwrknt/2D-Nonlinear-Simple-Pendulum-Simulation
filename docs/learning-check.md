# Learning pathways and completion certificates

Students enter name, roll number, class/programme/year and one of four pathways. The selected pathway controls conceptual depth; it is not an automatically inferred school curriculum or accredited syllabus.

| Pathway | Required Part One | Required Part Two | Optional Part Three |
|---|---|---|---|
| School, Classes 9–10 | Foundation | Applied | Undergraduate challenge |
| School, Classes 11–12 | Applied | Undergraduate | Graduate challenge |
| BSc / undergraduate | Undergraduate | Graduate | Research challenge |
| MSc / postgraduate | Graduate | Research | Capstone challenge |

The 93-question bank contains 16 foundation, 16 applied, 16 undergraduate, 16 graduate, 17 research and 12 capstone questions. Names indicate increasing difficulty within this laboratory, not externally certified curriculum equivalence. Teachers should review question suitability for their actual students. Questions progress from observing motion and fair experiments to equations, energy thresholds, stability, asymptotics, uncertainty and critical interpretation of numerical evidence.

## Sequence and learning feedback

Part One selects 8 questions; Part Two selects 8 from the next pool. Parts must be completed sequentially within the same attempt. Each first submitted answer is locked and scored; feedback explains the correct answer and supplies two numerical demonstrations with play/pause/replay, shared angle plots and numerical evidence. Students can explore the explanation before proceeding. Simulations illustrate the relevant model; they are not proofs of statistical, asymptotic or experimental claims.

After both required parts, the result reports each score and the combined score. Part Three selects 6 harder questions and is optional for every student regardless of the required score. Its score remains separate. Students can return to the required result/certificate during the optional part without losing their position.

## Certificate rule

A certificate is generated automatically after both required parts are answered, if `(correct / 16) × 100 > 60`. Thus 10/16 (62.5%) qualifies and 9/16 (56.25%) does not. The comparison is strictly greater than 60%, not greater than or equal. The two parts' combined score is used, not a separate pass requirement for each part. Optional marks neither award nor revoke the certificate.

The certificate includes student name, roll, class/programme, pathway, both scores, combined percentage, completion date and a local attempt reference. The default issuer heading is “Nonlinear Pendulum Laboratory”; no institution, teacher signature or accreditation is invented. Print / Save certificate as PDF uses the browser print dialog; the second button downloads a printable HTML certificate. The on-page certificate is generated automatically; saving/printing requires the student's action. A new attempt should be started after saving any earned certificate.

## Randomization, resuming and student data

Questions and answer choices are independently shuffled; the correct key is remapped. Sampling prioritizes questions absent from the preceding draw for that level/part. There are no duplicate question IDs within an attempt. Repetition over many attempts is possible. This promotes varied practice but is not a secure examination: source answers and local scores can be inspected or changed in a browser.

The active identity, selected questions, shuffled choices, answers and progress are stored in sessionStorage in the current browser tab. Reloading resumes valid progress, including feedback for an already submitted answer. Browsers may preserve tab sessions when restoring windows. Finish / clear student details removes the active student attempt; a new student's submitted form replaces it. localStorage contains only recent question IDs indexed by level/part, to reduce repeats. No student details or answers are sent to a teacher/server. Downloaded certificates remain on the student's device.

## Implementation and checks

- `src/quiz-bank.ts`: content pools, levels and sampling counts; reuses existing questions and advanced demonstrations.
- `src/quiz-assessment.ts`: shuffling, state transitions, strict score eligibility, validated restoration, escaped certificate HTML.
- `src/quiz.ts`: student form, one-question feedback, demonstrations, result and certificate actions.
- `tests/assessment.test.mjs`: all 93 question IDs/keys and 186 numerical demonstrations, pathway sampling, correct-answer remapping, recent-draw avoidance, sequence, cutoff, optional independence, restored-state validation and HTML escaping.
- `tests/quiz.spec.ts`: complete all four pathways, earn/download a certificate, fail optional work without losing the certificate, fail required work despite full optional marks, reload recovery, clear identity and mobile replay.

`npm run test:physics` passed 24 tests. Production build passed. `npm run test:e2e` passed 19 Chromium tests, covering the existing laboratory/comparison pages and the new pathways. The certificate PDF was inspected as one A4 landscape page. Evidence is in validation/assessment-browser-tests.log, assessment-build.log and assessment-node-tests.log. Tests now own port 4186 with strict port binding and refuse to reuse unrelated servers.

This is a formative self-study assessment. Certificate scores do not establish measured learning gains or assessment validity. Classroom pilots, content review and an appropriate research design remain necessary before making such claims in a paper.
