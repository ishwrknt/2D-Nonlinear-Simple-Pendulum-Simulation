import "./style.css";
import "./quiz.css";
import { PendulumEngine } from "./physics";
import { effectiveGravity } from "./fluid";
import { quizBase } from "./quiz-questions";
import {
  levels,
  questionPools,
  REQUIRED_PER_PART,
  OPTIONAL_COUNT,
  type Level,
} from "./quiz-bank";
import {
  createAttempt,
  restoreAttempt,
  attemptQuestion,
  partScore,
  mandatoryComplete,
  certificateEligible,
  recordAnswer,
  advanceQuestion,
  startOptional,
  certificateMarkup,
  certificateDocument,
  escapeHtml as safe,
  type Attempt,
  type Student,
  type Recent,
} from "./quiz-assessment";
document.title = "Pendulum learning pathways and certificates";
const app = document.querySelector<HTMLDivElement>("#quiz-app")!;
const SESSION_KEY = "pendulum-learning-attempt-v1";
const RECENT_KEY = "pendulum-learning-recent-v1";
let attempt: Attempt | null = null;
let storageNotice = "";
try {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) {
    attempt = restoreAttempt(JSON.parse(saved));
    if (!attempt)
      storageNotice =
        "The saved attempt could not be restored. Please start a new attempt.";
  }
} catch {
  storageNotice =
    "Progress cannot be saved in this browser tab. Keep this page open until you finish.";
}
let engines: PendulumEngine[] = [],
  traces: { time: number; angles: number[] }[] = [],
  playing = false,
  previous = 0,
  accumulator = 0;
const colors = ["#087e70", "#ad4b25"];
const get = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const current = () => attemptQuestion(attempt!, attempt!.part, attempt!.index);
const partNames = [
  "Part One: Build your understanding",
  "Part Two: Apply and connect",
  "Part Three: Optional expert challenge",
];
function persist() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(attempt));
  } catch {
    storageNotice =
      "Progress cannot be saved in this browser tab. Keep this page open until you finish.";
  }
}
function shell(
  content: string,
  title = attempt ? partNames[attempt.part] : "Your pendulum learning pathway",
) {
  app.innerHTML = `<header><div><p class="eyebrow">Predict · check · explore</p><h1>${title}</h1><p>Two required parts, one question at a time. An optional harder challenge follows.</p>${attempt ? `<p class="learner-summary">${safe(attempt.student.name)} · ${safe(attempt.student.className)} · ${safe(levels[attempt.student.level].label)}</p>` : ""}</div><nav><a href="./">Back to laboratory</a>${attempt ? ' · <button id="new-student" type="button">New student</button>' : ""}</nav></header><main class="quiz-main">${storageNotice ? `<p role="status">${safe(storageNotice)}</p>` : ""}${content}</main>`;
  document
    .getElementById("new-student")
    ?.addEventListener("click", () => showRegistration());
}
function stopDemo() {
  playing = false;
  engines = [];
  traces = [];
  accumulator = 0;
}
function showRegistration(prefill?: Student) {
  stopDemo();
  shell(
    `<section class="card"><h2>Start with your details</h2><p>Choose the level closest to your course. The question content and challenge difficulty change with your level.</p><form id="student-form"><div class="student-fields"><label for="student-name">Student name<input id="student-name" name="name" autocomplete="name" maxlength="120" required value="${safe(prefill?.name ?? "")}"></label><label for="student-roll">Roll number<input id="student-roll" name="roll" maxlength="120" required value="${safe(prefill?.roll ?? "")}"></label><label for="student-class">Class / programme and year<input id="student-class" name="className" placeholder="e.g. Class 10 A, BSc Physics Year 2" maxlength="120" required value="${safe(prefill?.className ?? "")}"></label><label for="student-level">Learning level<select id="student-level" name="level" required><option value="">Choose your level</option>${Object.entries(
      levels,
    )
      .map(
        ([id, l]) =>
          `<option value="${id}" ${prefill?.level === id ? "selected" : ""}>${l.label}</option>`,
      )
      .join(
        "",
      )}</select></label></div><p id="level-description" class="hint"></p><p><strong>Certificate:</strong> complete both required parts in order and score <strong>more than 60%</strong> overall. With 16 questions, at least 10 correct answers qualify. Part Three is optional and has a separate score.</p><p>Each part uses a random selection from its level’s bank. Questions and choices are shuffled. Every answer unlocks feedback, reasoning and a simulation to explore.</p><button class="primary" type="submit">Start Part One</button><p id="student-error" role="alert"></p></form>${attempt ? '<button id="resume-attempt">Return to current attempt</button>' : ""}<p class="hint">Your details and progress stay in this browser tab; they are not sent to a teacher or server. Reloading can resume this tab’s saved attempt. The browser may preserve a tab session when restoring windows. Only recent question IDs are remembered between attempts to reduce repetition.</p><p class="hint">This is self-study practice. The certificate records learning activity and score; it is not a proctored or accredited qualification.</p></section>`,
    "Your pendulum learning pathway",
  );
  const levelDescription = () => {
    const level = get<HTMLSelectElement>("student-level").value as Level;
    get("level-description").textContent = levels[level]
      ? `${levels[level].description}. Parts One and Two: ${REQUIRED_PER_PART} questions selected from ${questionPools[levels[level].pools[0]].length} and ${questionPools[levels[level].pools[1]].length}. Optional challenge: ${OPTIONAL_COUNT} questions.`
      : "";
  };
  levelDescription();
  get("student-level").addEventListener("change", levelDescription);
  document
    .getElementById("resume-attempt")
    ?.addEventListener("click", renderQuestion);
  get<HTMLFormElement>("student-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      let recent: Recent = {};
      try {
        const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "{}");
        if (saved && typeof saved === "object")
          for (const [key, values] of Object.entries(saved))
            if (
              Array.isArray(values) &&
              values.every((v) => typeof v === "string")
            )
              recent[key] = values;
      } catch {
        /* No stored history is required. */
      }
      attempt = createAttempt(
        {
          name: get<HTMLInputElement>("student-name").value,
          roll: get<HTMLInputElement>("student-roll").value,
          className: get<HTMLInputElement>("student-class").value,
          level: get<HTMLSelectElement>("student-level").value as Level,
        },
        recent,
      );
      attempt.ids.forEach(
        (ids, p) => (recent[`${attempt!.student.level}:${p}`] = ids),
      );
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
      } catch {
        /* Question shuffling still works. */
      }
      persist();
      renderQuestion();
      window.scrollTo(0, 0);
    } catch (error) {
      get("student-error").textContent = String(error);
    }
  });
}
function renderQuestion() {
  stopDemo();
  if (!attempt) {
    showRegistration();
    return;
  }
  const a = attempt;
  if (a.index >= a.ids[a.part].length) {
    showResult(a.part === 2);
    return;
  }
  const q = current(),
    count = a.ids[a.part].length;
  shell(
    `<section class="card"><p class="eyebrow">Question ${a.index + 1} of ${count} · ${safe(q.topic)}</p><p class="hint">${a.part === 2 ? "Optional challenge: this score does not change your certificate." : `Required part ${a.part + 1} of 2. Your first submitted answer counts.`}</p><progress max="${count}" value="${a.index}" aria-label="Questions completed in this part"></progress><form id="answer-form"><fieldset><legend>${safe(q.prompt)}</legend>${q.options.map((text, i) => `<label class="answer-option"><input type="radio" name="answer" value="${i}" required> <span>${safe(text)}</span></label>`).join("")}</fieldset><button class="primary" type="submit">Check answer</button></form><div id="answer-feedback" aria-live="polite"></div></section>${a.part === 2 ? '<p><button id="required-result">View required result and certificate</button></p>' : ""}<p class="hint">Take time to predict, explain, and explore. You can replay each comparison before continuing. A new attempt draws a fresh selection; some questions may reappear later.</p>`,
  );
  if (a.part === 2)
    get("required-result").addEventListener("click", () => showResult(false));
  get<HTMLFormElement>("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (a.answers[a.part][a.index] !== null) return;
    const selected = new FormData(get<HTMLFormElement>("answer-form")).get(
      "answer",
    );
    if (selected === null) return;
    recordAnswer(a, Number(selected));
    persist();
    lockAnswer();
    showExplanation();
  });
  if (a.answers[a.part][a.index] !== null) {
    lockAnswer();
    showExplanation();
  }
}
function lockAnswer() {
  const choice = attempt!.answers[attempt!.part][attempt!.index];
  get<HTMLFormElement>("answer-form")
    .querySelectorAll<HTMLInputElement>("input")
    .forEach((input) => {
      input.checked = Number(input.value) === choice;
      input.disabled = true;
    });
  get<HTMLButtonElement>("answer-form").querySelector<HTMLButtonElement>(
    "button",
  )!.disabled = true;
}
function showExplanation() {
  const a = attempt!,
    q = current(),
    choice = a.answers[a.part][a.index]!,
    correct = choice === q.correct;
  const last = a.index === a.ids[a.part].length - 1;
  get("answer-feedback").innerHTML =
    `<div class="feedback ${correct ? "correct" : "incorrect"}"><h2 id="feedback-title" tabindex="-1">${correct ? "Correct" : "Not quite — review the explanation"}</h2><p><strong>Your answer:</strong> ${safe(q.options[choice])}</p><p><strong>Correct answer:</strong> ${safe(q.options[q.correct])}</p><p>${safe(q.explanation)}</p></div><section aria-labelledby="demo-heading"><h2 id="demo-heading">See why: compare the two simulations</h2><p>${safe(q.watch)}</p><canvas id="quiz-canvas" width="900" height="570" aria-label="Two pendulum animations with angle traces; numerical evidence follows below."></canvas><div class="transport"><button id="demo-play">Play comparison</button><button id="demo-reset">Replay from start</button></div><p class="hint">Rods are fitted separately to each panel. Angle traces share a scale. The comparison ends at 12 simulated seconds; a finite run does not establish an unlimited-time claim.</p><div id="demo-values"></div><p class="hint">Numerical demonstrations use the documented ideal model. Fluid examples omit added mass, unsteady effects, walls and free surfaces. Measurement-uncertainty questions use deterministic simulations to illustrate the underlying relation, not synthetic experimental observations.</p></section><button id="next-question" class="primary">${last ? (a.part === 0 ? "Complete Part One · continue to Part Two" : a.part === 1 ? "Complete Part Two · see result" : "Complete optional challenge") : "Next question"}</button>`;
  startDemo();
  get("demo-play").addEventListener("click", () => {
    playing = !playing;
    get("demo-play").textContent = playing
      ? "Pause comparison"
      : "Play comparison";
  });
  get("demo-reset").addEventListener("click", startDemo);
  get("next-question").addEventListener("click", () => {
    advanceQuestion(a);
    persist();
    renderQuestion();
    window.scrollTo(0, 0);
  });
  get("feedback-title").focus();
}
function startDemo() {
  playing = false;
  accumulator = 0;
  engines = current().cases.map(
    (c) => new PendulumEngine({ ...quizBase, ...c.settings }),
  );
  traces = [{ time: 0, angles: engines.map((e) => e.getState().theta) }];
  get("demo-play").textContent = "Play comparison";
  get<HTMLButtonElement>("demo-play").disabled = false;
  drawDemo();
}
function drawDemo() {
  const canvas = get<HTMLCanvasElement>("quiz-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!,
    q = current();
  ctx.clearRect(0, 0, 900, 570);
  ctx.fillStyle = "#f7faf8";
  ctx.fillRect(0, 0, 900, 570);
  ctx.font = "20px system-ui";
  ctx.textAlign = "center";
  engines.forEach((e, i) => {
    const s = e.getState(),
      px = 225 + 450 * i,
      py = 165,
      bx = px + 105 * Math.sin(s.theta),
      by = py + 105 * Math.cos(s.theta);
    ctx.fillStyle = colors[i];
    ctx.fillText(`${i + 1}. ${q.cases[i].label}`, px, 30);
    ctx.strokeStyle = "#aabbb2";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + 105);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = "17px system-ui";
    ctx.fillText(`θ = ${((s.theta * 180) / Math.PI).toFixed(2)}°`, px, 295);
    ctx.font = "20px system-ui";
  });
  const last = traces.at(-1)!.time,
    maxTime = Math.max(1, last);
  let extent = 0.2;
  for (const t of traces)
    for (const angle of t.angles)
      extent = Math.max(extent, Math.abs(angle) * 1.1);
  const X = (t: number) => 65 + (t / maxTime) * 790,
    Y = (a: number) => 425 - (a / extent) * 90;
  ctx.strokeStyle = "#bdcbc2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(65, 335);
  ctx.lineTo(65, 515);
  ctx.lineTo(855, 515);
  ctx.moveTo(65, 425);
  ctx.lineTo(855, 425);
  ctx.stroke();
  ctx.fillStyle = "#334f46";
  ctx.font = "16px system-ui";
  ctx.fillText("Angle (degrees)", 125, 320);
  ctx.fillText(((extent * 180) / Math.PI).toFixed(1), 32, 340);
  ctx.fillText("0", 32, 430);
  ctx.fillText(((-extent * 180) / Math.PI).toFixed(1), 32, 515);
  ctx.fillText("0", 65, 540);
  ctx.fillText(maxTime.toFixed(1), 850, 540);
  ctx.fillText("Simulated time (s)", 450, 555);
  engines.forEach((_, i) => {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2.5;
    ctx.setLineDash(i ? [7, 4] : []);
    ctx.beginPath();
    traces.forEach((p, j) => {
      if (j === 0) ctx.moveTo(X(p.time), Y(p.angles[i]));
      else ctx.lineTo(X(p.time), Y(p.angles[i]));
    });
    ctx.stroke();
    ctx.setLineDash([]);
  });
  get("demo-values").innerHTML =
    `<p>Simulated time: <strong>${last.toFixed(2)} s</strong></p><div class="quiz-table"><table><thead><tr><th>Quantity</th>${q.cases.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>${[
      "Angle (°)",
      "Angular speed (rad/s)",
      "Predicted bottom speed, conservative release (rad/s)",
      "Energy E (J)",
      "Dissipated energy (J)",
      "Drive work (J)",
      "Energy-balance residual (J)",
      "Undamped small-angle reference (s)",
    ]
      .map(
        (label, row) =>
          `<tr><th scope="row">${label}</th>${engines
            .map((e) => {
              const s = e.getState(),
                g = effectiveGravity(e.getParameters()),
                v = [
                  (s.theta * 180) / Math.PI,
                  s.omega,
                  e.getDerivedMetrics().conservative &&
                  g > 0 &&
                  !e.getParameters().initialOmega
                    ? Math.sqrt(
                        ((2 * g) / e.getParameters().length) *
                          (1 - Math.cos(e.getParameters().initialAngle)),
                      )
                    : NaN,
                  s.totalEnergy,
                  s.dissipatedEnergy,
                  s.driveWork,
                  e.getDerivedMetrics().energyBalanceError,
                  g > 1e-12
                    ? 2 * Math.PI * Math.sqrt(e.getParameters().length / g)
                    : NaN,
                ][row];
              return `<td>${Number.isFinite(v) ? (row === 6 ? v.toExponential(2) : v.toFixed(4)) : "Not applicable"}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;
}
function showResult(optionalResult = false) {
  stopDemo();
  if (!attempt || !mandatoryComplete(attempt)) {
    renderQuestion();
    return;
  }
  const a = attempt,
    score = partScore(a, 0) + partScore(a, 1),
    total = a.ids[0].length + a.ids[1].length;
  const eligible = certificateEligible(a),
    optionalDone = a.answers[2].every((answer) => answer !== null);
  const reviewParts = optionalResult ? [0, 1, 2] : [0, 1];
  shell(
    `<section class="card"><h2>Your result: ${score} / ${total} (${((score / total) * 100).toFixed(1)}%)</h2><p>Part One: ${partScore(a, 0)} / ${a.ids[0].length} · Part Two: ${partScore(a, 1)} / ${a.ids[1].length}</p><p>${eligible ? "Both required parts are complete, and your score is above 60%. Your certificate has been generated below." : "Both required parts are complete. A certificate requires more than 60% overall (at least 10 of 16). Review the explanations and try a new selection when you are ready."}</p>${optionalDone ? `<p><strong>Optional Part Three:</strong> ${partScore(a, 2)} / ${a.ids[2].length}. This separate score does not affect the certificate.</p>` : ""}<h3>Topics to revisit</h3>${reviewParts
      .map(
        (part) =>
          `<details ${part === a.part ? "open" : ""}><summary>Part ${part + 1} review</summary><ol>${a.ids[
            part
          ]
            .map((_, i) => {
              const q = attemptQuestion(a, part, i),
                correct = a.answers[part][i] === q.correct;
              return `<li><strong>${safe(q.topic)}: ${correct ? "Correct" : "Review"}</strong><p>${safe(q.prompt)}</p><p>Correct answer: ${safe(q.options[q.correct])}</p><p>${safe(q.explanation)}</p></li>`;
            })
            .join("")}</ol></details>`,
      )
      .join(
        "",
      )}</section>${eligible ? certificateMarkup(a) + '<div class="certificate-actions"><button id="print-certificate" class="primary">Print / Save certificate as PDF</button><button id="download-certificate">Download printable certificate</button></div>' : ""}<section class="card" style="margin-top:24px"><h2>Keep exploring</h2><p>The optional Part Three is harder than both required parts at your chosen level. It is available regardless of your required score and does not change certificate eligibility.</p><button id="optional-start" class="primary">${optionalDone ? "Review optional Part Three" : a.part === 2 ? "Continue optional Part Three" : "Start optional Part Three"}</button><p><button id="retry-quiz">New randomized attempt at this level</button> <button id="clear-student">Finish / clear student details</button> <a href="./compare.html">Explore the laboratory</a></p><p class="hint">Save an earned certificate before starting another attempt. A new attempt replaces this tab’s saved progress and requires completing both parts again.</p></section>`,
    optionalResult
      ? "Optional challenge completed"
      : "Required pathway completed",
  );
  get("optional-start").addEventListener("click", () => {
    if (optionalDone) {
      showResult(true);
      return;
    }
    startOptional(a);
    persist();
    renderQuestion();
    window.scrollTo(0, 0);
  });
  get("retry-quiz").addEventListener("click", () =>
    showRegistration(a.student),
  );
  get("clear-student").addEventListener("click", () => {
    attempt = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    showRegistration();
  });
  if (eligible) {
    get("print-certificate").addEventListener("click", () => window.print());
    get("download-certificate").addEventListener("click", () => {
      const document = certificateDocument(a);
      if (!document) return;
      const url = URL.createObjectURL(
        new Blob([document], { type: "text/html;charset=utf-8" }),
      );
      const link = window.document.createElement("a");
      link.href = url;
      link.download = "pendulum-learning-certificate.html";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
}
function frame(now: number) {
  const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
  previous = now;
  if (playing && engines.length) {
    accumulator += delta;
    const demoDt = Math.max(
      quizBase.dt,
      ...engines.map((e) => e.getParameters().dt),
    );
    while (accumulator >= demoDt) {
      const target = traces.at(-1)!.time + demoDt;
      engines.forEach((e) => {
        while (e.getState().time < target - 1e-9) e.step();
      });
      accumulator -= demoDt;
      traces.push({
        time: target,
        angles: engines.map((e) => e.getState().theta),
      });
      if (target >= 12 - 1e-9) {
        playing = false;
        get("demo-play").textContent = "Finished — use Replay";
        get<HTMLButtonElement>("demo-play").disabled = true;
        break;
      }
    }
    drawDemo();
  }
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    playing = false;
    accumulator = 0;
    if (document.getElementById("demo-play"))
      get("demo-play").textContent = "Play comparison";
  }
});
if (attempt) renderQuestion();
else showRegistration();
requestAnimationFrame(frame);
