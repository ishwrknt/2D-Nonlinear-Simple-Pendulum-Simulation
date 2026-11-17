import "./style.css";
import "./quiz.css";
import { PendulumEngine } from "./physics";
import { effectiveGravity } from "./fluid";
import { questions as foundationQuestions, quizBase } from "./quiz-questions";
import { advancedQuestions } from "./quiz-advanced";
const advanced = new URLSearchParams(location.search).get("part") === "2";
const questions = advanced ? advancedQuestions : foundationQuestions;
const partTitle = advanced ? "Part Two: Advanced challenges" : "Part One: Foundations";
document.title = `${partTitle} · Pendulum learning check`;
const app = document.querySelector<HTMLDivElement>("#quiz-app")!;
const answers: (number | null)[] = questions.map(() => null);
let index = 0,
  engines: PendulumEngine[] = [],
  traces: { time: number; angles: number[] }[] = [],
  playing = false,
  previous = 0,
  accumulator = 0;
const colors = ["#087e70", "#ad4b25"];
const get = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
function shell(content: string) {
  app.innerHTML = `<header><div><p class="eyebrow">Predict · check · explore</p><h1>${partTitle}</h1><p>${questions.length} questions, one at a time. Answer, read the explanation, then test it in motion.</p></div><nav><a href="./">Back to laboratory</a> · <a href="./quiz.html${advanced ? "" : "?part=2"}">${advanced ? "Part One: Foundations" : "Part Two: Advanced challenges"}</a></nav></header><main class="quiz-main">${content}</main>`;
}
function renderQuestion() {
  playing = false;
  engines = [];
  traces = [];
  const q = questions[index];
  shell(
    `<section class="card"><p class="eyebrow">Question ${index + 1} of ${questions.length} · ${q.topic}</p><progress max="${questions.length}" value="${index}" aria-label="Questions completed"></progress><form id="answer-form"><fieldset><legend>${q.prompt}</legend>${q.options.map((text, i) => `<label class="answer-option"><input type="radio" name="answer" value="${i}" required> <span>${text}</span></label>`).join("")}</fieldset><button class="primary" type="submit">Check answer</button></form><div id="answer-feedback" aria-live="polite"></div></section><p class="hint">This is a practice learning check, not a validated examination. Answers stay in this page and are not sent to a teacher or server. Reloading starts again.</p>`,
  );
  get<HTMLFormElement>("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (answers[index] !== null) return;
    const data = new FormData(get<HTMLFormElement>("answer-form"));
    const choice = Number(data.get("answer"));
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length)
      return;
    answers[index] = choice;
    get<HTMLFieldSetElement>("answer-form")
      .querySelectorAll("input,button")
      .forEach((node) => ((node as HTMLInputElement).disabled = true));
    showExplanation();
  });
}
function showExplanation() {
  const q = questions[index],
    correct = answers[index] === q.correct;
  get("answer-feedback").innerHTML =
    `<div class="feedback ${correct ? "correct" : "incorrect"}"><h2 id="feedback-title" tabindex="-1">${correct ? "Correct" : "Not quite — review the explanation"}</h2><p><strong>Your answer:</strong> ${q.options[answers[index]!]}</p><p><strong>Correct answer:</strong> ${q.options[q.correct]}</p><p>${q.explanation}</p></div><section aria-labelledby="demo-heading"><h2 id="demo-heading">See why: compare the two simulations</h2><p>${q.watch}</p><canvas id="quiz-canvas" width="900" height="570" aria-label="Two pendulum animations and their angle-versus-time traces; numerical evidence is shown below."></canvas><div class="transport"><button id="demo-play">Play comparison</button><button id="demo-reset">Replay from start</button></div><p class="hint">Both panels fit their rods to the same display size. Colours and numbered labels identify each case. Angle traces use a shared scale. The comparison stops at 12 simulated seconds.</p><div id="demo-values"></div><p class="hint">These are numerical model demonstrations. Fluid examples omit added mass, unsteady fluid effects, walls and free surfaces; they are not measured real-fluid results.</p></section><button id="next-question" class="primary">${index === questions.length - 1 ? "See my result" : "Next question"}</button>`;
  startDemo();
  get("demo-play").addEventListener("click", () => {
    playing = !playing;
    get("demo-play").textContent = playing
      ? "Pause comparison"
      : "Play comparison";
  });
  get("demo-reset").addEventListener("click", startDemo);
  get("next-question").addEventListener("click", () => {
    playing = false;
    if (index === questions.length - 1) showResult();
    else {
      index++;
      renderQuestion();
    }
    window.scrollTo(0, 0);
  });
  get("feedback-title").focus();
}
function startDemo() {
  playing = false;
  accumulator = 0;
  engines = questions[index].cases.map(
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
    q = questions[index];
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
                  e.getDerivedMetrics().conservative && g > 0 && !e.getParameters().initialOmega
                    ? Math.sqrt(2*g/e.getParameters().length*(1-Math.cos(e.getParameters().initialAngle))) : NaN,
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
function showResult() {
  engines = [];
  const score = answers.filter((a, i) => a === questions[i].correct).length;
  shell(
    `<section class="card"><h2>Your result: ${score} / ${questions.length}</h2><p>${score === questions.length ? "All answers were correct. Try designing a new experiment in the laboratory." : "Use the topics below to guide your next experiments. You can restart the practice to check your understanding again."}</p><ol>${questions.map((q, i) => `<li>${q.topic}: <strong>${answers[i] === q.correct ? "Correct" : "Review"}</strong></li>`).join("")}</ol><p><a class="guide-link" href="./quiz.html${advanced ? "" : "?part=2"}">${advanced ? "Revisit Part One" : "Continue to Part Two: Advanced challenges →"}</a></p><button id="restart-quiz">Start again</button> <a href="./">Explore the laboratory</a></section>`,
  );
  get("restart-quiz").addEventListener("click", () => {
    answers.fill(null);
    index = 0;
    renderQuestion();
  });
}
function frame(now: number) {
  const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
  previous = now;
  if (playing && engines.length) {
    accumulator += delta;
    while (accumulator >= quizBase.dt) {
      engines.forEach((e) => e.step());
      accumulator -= quizBase.dt;
      traces.push({
        time: engines[0].getState().time,
        angles: engines.map((e) => e.getState().theta),
      });
      if (engines[0].getState().time >= 12) {
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
renderQuestion();
requestAnimationFrame(frame);
