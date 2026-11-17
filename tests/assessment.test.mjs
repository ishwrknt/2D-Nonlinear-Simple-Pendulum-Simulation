import { test } from "node:test";
import assert from "node:assert/strict";
import {
  questionBank,
  questionPools,
  levels,
  byQuestionId,
} from "../src/quiz-bank.ts";
import { quizBase } from "../src/quiz-questions.ts";
import { PendulumEngine } from "../src/physics.ts";
import {
  createAttempt,
  attemptQuestion,
  recordAnswer,
  advanceQuestion,
  partScore,
  certificateEligible,
  aboveCertificateThreshold,
  mandatoryComplete,
  startOptional,
  restoreAttempt,
  certificateMarkup,
  certificateDocument,
} from "../src/quiz-assessment.ts";
const student = {
  name: "Asha Student",
  roll: "17",
  className: "BSc Physics Year 2",
  level: "bsc",
};
const seeded = (seed) => () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
};
function answer(a, right = true) {
  const q = attemptQuestion(a, a.part, a.index);
  recordAnswer(a, right ? q.correct : (q.correct + 1) % q.options.length);
  advanceQuestion(a);
}
function finish(a, count = 16) {
  for (let i = 0; i < 16; i++) answer(a, i < count);
}
test("93 bank questions have unique IDs, clear keys and finite energy-consistent demonstrations", () => {
  assert.equal(questionBank.length, 93);
  assert.equal(byQuestionId.size, 93);
  for (const [pool, questions] of Object.entries(questionPools)) {
    assert.ok(questions.length >= 12, pool);
  }
  for (const q of questionBank) {
    assert.ok(q.prompt && q.explanation && q.watch, q.id);
    assert.equal(new Set(q.options).size, q.options.length, q.id);
    assert.ok(
      Number.isInteger(q.correct) &&
        q.correct >= 0 &&
        q.correct < q.options.length,
      q.id,
    );
    for (const c of q.cases) {
      const e = new PendulumEngine({ ...quizBase, ...c.settings });
      const n = Math.round(12 / e.getParameters().dt);
      for (let i = 0; i < n; i++) e.step();
      assert.ok(Number.isFinite(e.getState().theta), q.id);
      assert.ok(
        Math.abs(e.getDerivedMetrics().energyBalanceError) < 1e-4,
        q.id,
      );
    }
  }
});
test("every pathway samples correct pools, no duplicates and options preserve the correct answer", () => {
  for (const level of Object.keys(levels))
    for (let seed = 1; seed <= 15; seed++) {
      const a = createAttempt({ ...student, level }, {}, seeded(seed));
      assert.deepEqual(
        a.ids.map((p) => p.length),
        [8, 8, 6],
      );
      assert.equal(new Set(a.ids.flat()).size, 22);
      a.ids.forEach((ids, p) =>
        ids.forEach((id, i) => {
          assert.ok(
            questionPools[levels[level].pools[p]].some((q) => q.id === id),
          );
          const original = byQuestionId.get(id),
            shuffled = attemptQuestion(a, p, i);
          assert.equal(
            shuffled.options[shuffled.correct],
            original.options[original.correct],
          );
        }),
      );
      assert.deepEqual(restoreAttempt(JSON.parse(JSON.stringify(a))), a);
    }
});
test("new attempts change order and choices and avoid the previous draw when enough questions exist", () => {
  const a = createAttempt(student, {}, seeded(1)),
    recent = {};
  a.ids.forEach((ids, p) => (recent[`${student.level}:${p}`] = ids));
  const b = createAttempt(student, recent, seeded(2));
  for (let p = 0; p < 3; p++)
    assert.equal(a.ids[p].filter((id) => b.ids[p].includes(id)).length, 0);
  assert.notDeepEqual(a.ids, b.ids);
  assert.ok(a.orders.flat().some((order) => order.some((n, i) => n !== i)));
});
test("certificates require completed required parts and strictly greater than 60%, never optional marks", () => {
  assert.equal(aboveCertificateThreshold(6, 10), false);
  assert.equal(aboveCertificateThreshold(7, 10), true);
  const a = createAttempt(student, {}, seeded(3));
  assert.throws(() => startOptional(a));
  assert.equal(certificateMarkup(a), "");
  for (let i = 0; i < 8; i++) answer(a);
  assert.equal(a.part, 1);
  assert.equal(certificateEligible(a), false);
  for (let i = 8; i < 16; i++) answer(a, i < 10);
  assert.equal(partScore(a, 0) + partScore(a, 1), 10);
  assert.equal(mandatoryComplete(a), true);
  assert.equal(certificateEligible(a), true);
  const certificate = certificateMarkup(a);
  assert.ok(certificate.includes("62.5%"));
  assert.ok(certificate.includes("Asha Student"));
  startOptional(a);
  for (let i = 0; i < 6; i++) answer(a, false);
  assert.equal(partScore(a, 2), 0);
  assert.equal(certificateMarkup(a), certificate);
  const failed = createAttempt(student, {}, seeded(4));
  finish(failed, 9);
  assert.equal(certificateEligible(failed), false);
  assert.equal(certificateDocument(failed), "");
  startOptional(failed);
  for (let i = 0; i < 6; i++) answer(failed, true);
  assert.equal(certificateEligible(failed), false);
});
test("first answer locks, resume preserves order and score, invalid or skipped progress is rejected", () => {
  const a = createAttempt(student, {}, seeded(5));
  const q = attemptQuestion(a, 0, 0);
  recordAnswer(a, q.correct);
  assert.throws(() => recordAnswer(a, q.correct));
  assert.deepEqual(restoreAttempt(JSON.parse(JSON.stringify(a))), a);
  advanceQuestion(a);
  assert.equal(a.index, 1);
  const bad = structuredClone(a);
  bad.part = 1;
  assert.equal(restoreAttempt(bad), null);
  const badKey = structuredClone(a);
  badKey.orders[0][0] = [0, 0, 0, 0];
  assert.equal(restoreAttempt(badKey), null);
  const forged = structuredClone(a);
  forged.completedAt = new Date().toISOString();
  assert.equal(restoreAttempt(forged), null);
  finishRemaining(a);
  assert.equal(restoreAttempt(structuredClone(a)).completedAt, a.completedAt);
  function finishRemaining(a) {
    while (a.part === 0 || a.index < 8) answer(a);
  }
});
test("certificate escapes student input and validates required identity fields", () => {
  assert.throws(() => createAttempt({ ...student, name: "   " }));
  assert.throws(() => createAttempt({ ...student, roll: "" }));
  const a = createAttempt(
    {
      ...student,
      name: "<img src=x onerror=alert(1)>",
      className: "BSc <Physics> & Science",
    },
    {},
    seeded(9),
  );
  finish(a);
  const html = certificateDocument(a);
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<script"));
  assert.ok(html.includes("BSc &lt;Physics&gt; &amp; Science"));
});
