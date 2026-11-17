import {
  byQuestionId,
  levels,
  questionPools,
  REQUIRED_PER_PART,
  OPTIONAL_COUNT,
  type Level,
} from "./quiz-bank.ts";
import type { Question } from "./quiz-questions.ts";
export interface Student {
  name: string;
  roll: string;
  className: string;
  level: Level;
}
export interface Attempt {
  version: 1;
  id: string;
  student: Student;
  startedAt: string;
  completedAt: string | null;
  ids: string[][];
  orders: number[][][];
  answers: (number | null)[][];
  part: number;
  index: number;
}
export type Recent = Record<string, string[]>;
export function shuffle<T>(
  values: readonly T[],
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function normalizeStudent(value: Student): Student {
  if (!value || !Object.hasOwn(levels, value.level))
    throw Error("Choose a learning level.");
  const result = { ...value };
  for (const key of ["name", "roll", "className"] as const) {
    if (typeof result[key] !== "string")
      throw Error("Enter your name, roll number and class.");
    result[key] = result[key].trim().replace(/\s+/g, " ");
    if (!result[key] || result[key].length > 120)
      throw Error("Use 1–120 characters for each student detail.");
  }
  return result;
}
export function createAttempt(
  student: Student,
  recent: Recent = {},
  random?: () => number,
): Attempt {
  student = normalizeStudent(student);
  const ids = levels[student.level].pools.map((pool, part) => {
    const previous = new Set(recent[`${student.level}:${part}`] ?? []);
    const available = questionPools[pool];
    const selected = [
      ...shuffle(
        available.filter((q) => !previous.has(q.id)),
        random,
      ),
      ...shuffle(
        available.filter((q) => previous.has(q.id)),
        random,
      ),
    ].slice(0, part === 2 ? OPTIONAL_COUNT : REQUIRED_PER_PART);
    return shuffle(selected, random).map((q) => q.id);
  });
  return {
    version: 1,
    id: crypto.randomUUID(),
    student,
    startedAt: new Date().toISOString(),
    completedAt: null,
    ids,
    orders: ids.map((part) =>
      part.map((id) =>
        shuffle(
          byQuestionId.get(id)!.options.map((_, i) => i),
          random,
        ),
      ),
    ),
    answers: ids.map((part) => part.map(() => null)),
    part: 0,
    index: 0,
  };
}
export function attemptQuestion(
  attempt: Attempt,
  part: number,
  index: number,
): Question {
  const q = byQuestionId.get(attempt.ids[part][index])!,
    order = attempt.orders[part][index];
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correct: order.indexOf(q.correct),
  };
}
export function partScore(attempt: Attempt, part: number): number {
  return attempt.answers[part].filter(
    (a, i) => a !== null && a === attemptQuestion(attempt, part, i).correct,
  ).length;
}
export function mandatoryComplete(attempt: Attempt): boolean {
  return attempt.answers
    .slice(0, 2)
    .every((part) => part.every((a) => a !== null));
}
export function aboveCertificateThreshold(
  correct: number,
  total: number,
): boolean {
  return total > 0 && correct * 100 > total * 60;
}
export function certificateEligible(attempt: Attempt): boolean {
  return (
    mandatoryComplete(attempt) &&
    aboveCertificateThreshold(
      partScore(attempt, 0) + partScore(attempt, 1),
      attempt.ids[0].length + attempt.ids[1].length,
    )
  );
}
export function recordAnswer(attempt: Attempt, choice: number): void {
  const { part, index } = attempt;
  if (
    index >= attempt.ids[part].length ||
    attempt.answers[part][index] !== null
  )
    throw Error("This answer is already submitted.");
  if (part > 0 && !attempt.answers[part - 1].every((a) => a !== null))
    throw Error("Complete the previous part first.");
  const q = attemptQuestion(attempt, part, index);
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length)
    throw Error("Select one answer.");
  attempt.answers[part][index] = choice;
  if (mandatoryComplete(attempt) && !attempt.completedAt)
    attempt.completedAt = new Date().toISOString();
}
export function advanceQuestion(attempt: Attempt): void {
  if (
    attempt.answers[attempt.part][attempt.index] === null ||
    attempt.index >= attempt.ids[attempt.part].length
  )
    throw Error("Answer this question first.");
  attempt.index++;
  if (attempt.part === 0 && attempt.index === attempt.ids[0].length) {
    attempt.part = 1;
    attempt.index = 0;
  }
}
export function startOptional(attempt: Attempt): void {
  if (!mandatoryComplete(attempt))
    throw Error("Complete both required parts first.");
  if (attempt.part !== 2) {
    attempt.part = 2;
    attempt.index = 0;
  }
}
export function restoreAttempt(value: unknown): Attempt | null {
  try {
    const a = value as Attempt;
    if (
      !a ||
      a.version !== 1 ||
      typeof a.id !== "string" ||
      !/^[a-f0-9-]{36}$/.test(a.id)
    )
      return null;
    a.student = normalizeStudent(a.student);
    if (
      typeof a.startedAt !== "string" ||
      !Number.isFinite(Date.parse(a.startedAt))
    )
      return null;
    if (
      !Number.isInteger(a.part) ||
      a.part < 0 ||
      a.part > 2 ||
      !Number.isInteger(a.index) ||
      a.index < 0
    )
      return null;
    if (
      !Array.isArray(a.ids) ||
      a.ids.length !== 3 ||
      !Array.isArray(a.orders) ||
      a.orders.length !== 3 ||
      !Array.isArray(a.answers) ||
      a.answers.length !== 3
    )
      return null;
    const used = new Set<string>();
    for (let part = 0; part < 3; part++) {
      const count = part === 2 ? OPTIONAL_COUNT : REQUIRED_PER_PART;
      const permitted = new Set(
        questionPools[levels[a.student.level].pools[part]].map((q) => q.id),
      );
      if (
        a.ids[part].length !== count ||
        a.orders[part].length !== count ||
        a.answers[part].length !== count
      )
        return null;
      for (let i = 0; i < count; i++) {
        const id = a.ids[part][i];
        if (!permitted.has(id) || used.has(id)) return null;
        used.add(id);
        const q = byQuestionId.get(id)!,
          order = a.orders[part][i],
          answer = a.answers[part][i];
        if (
          !Array.isArray(order) ||
          order.length !== q.options.length ||
          new Set(order).size !== order.length ||
          order.some(
            (n) => !Number.isInteger(n) || n < 0 || n >= q.options.length,
          )
        )
          return null;
        if (
          answer !== null &&
          (!Number.isInteger(answer) || answer < 0 || answer >= order.length)
        )
          return null;
        if (
          (part < a.part || (part === a.part && i < a.index)) &&
          answer === null
        )
          return null;
        if (
          (part > a.part || (part === a.part && i > a.index)) &&
          answer !== null
        )
          return null;
      }
    }
    if (
      a.index > a.ids[a.part].length ||
      (a.part === 0 && a.index === a.ids[0].length)
    )
      return null;
    if (mandatoryComplete(a)) {
      if (
        typeof a.completedAt !== "string" ||
        !Number.isFinite(Date.parse(a.completedAt))
      )
        return null;
    } else if (a.completedAt !== null) return null;
    return a;
  } catch {
    return null;
  }
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function certificateMarkup(attempt: Attempt): string {
  if (!certificateEligible(attempt)) return "";
  const total = attempt.ids[0].length + attempt.ids[1].length,
    score = partScore(attempt, 0) + partScore(attempt, 1),
    student = attempt.student;
  const date = new Date(attempt.completedAt!).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `<section id="student-certificate" class="certificate" aria-labelledby="certificate-title"><p class="certificate-brand">Nonlinear Pendulum Laboratory</p><h2 id="certificate-title">Learning Completion Certificate</h2><p>This certifies that</p><p class="certificate-name">${escapeHtml(student.name)}</p><p>Roll number: <strong>${escapeHtml(student.roll)}</strong><br>Class / programme: <strong>${escapeHtml(student.className)}</strong></p><p>completed Part One and Part Two consecutively in the</p><p class="certificate-level">${escapeHtml(levels[student.level].label)} learning pathway</p><p class="certificate-score">${score} / ${total} · ${((score / total) * 100).toFixed(1)}%</p><p>Part One: ${partScore(attempt, 0)} / ${attempt.ids[0].length} &nbsp; · &nbsp; Part Two: ${partScore(attempt, 1)} / ${attempt.ids[1].length}</p><p>Completed: ${escapeHtml(date)}</p><p class="certificate-note">Awarded for completion with a combined score above 60%.<br>A self-study learning record; not a proctored examination or an accredited qualification.</p><p class="certificate-reference">Local reference: ${escapeHtml(attempt.id)}</p></section>`;
}
export const certificateStyles = `body{font-family:Georgia,serif;color:#203c32;background:#fff;margin:24px}.certificate{border:4px double #087e70;padding:36px;text-align:center;max-width:900px;margin:24px auto;overflow-wrap:anywhere}.certificate-brand{letter-spacing:.12em;text-transform:uppercase;font:14px system-ui}.certificate h2{font-size:30px}.certificate-name{font-size:36px;font-weight:bold;margin:24px 0}.certificate-level{font-size:20px}.certificate-score{font-size:28px;font-weight:bold}.certificate-note,.certificate-reference{font:12px/1.6 system-ui}.certificate-reference{color:#536a5e}@page{size:A4 landscape;margin:12mm}@media print{body{margin:0}.certificate{margin:0;padding:18px;max-width:none;break-inside:avoid}}`;
export function certificateDocument(attempt: Attempt): string {
  const markup = certificateMarkup(attempt);
  if (!markup) return "";
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Learning completion certificate</title><style>${certificateStyles}</style></head><body>${markup}</body></html>`;
}
