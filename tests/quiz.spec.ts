import {test,expect} from '@playwright/test';
import {questions} from '../src/quiz-questions';
test('laboratory links to quiz; one answer at a time, feedback, simulations and final score',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:'Start the learning check →'}).click();await expect(page).toHaveURL(/quiz.html$/);await page.clock.install();
 for(let i=0;i<questions.length;i++){
  await expect(page.locator('legend')).toHaveText(questions[i].prompt);await expect(page.locator('#next-question')).toHaveCount(0);
  const choice=i===0?(questions[i].correct+1)%questions[i].options.length:questions[i].correct;
  await page.locator(`input[value="${choice}"]`).check();await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('#feedback-title')).toContainText(i===0?'Not quite':'Correct');await expect(page.locator('#answer-feedback')).toContainText(questions[i].options[questions[i].correct]);await expect(page.locator('input[value="0"]')).toBeDisabled();
  await page.click('#demo-play');await page.clock.runFor(600);await expect(page.locator('#demo-values')).not.toContainText('Simulated time: 0.00 s');await page.click('#demo-reset');await expect(page.locator('#demo-values')).toContainText('Simulated time: 0.00 s');await page.click('#next-question');
 }
 await expect(page.getByRole('heading',{name:'Your result: 7 / 8'})).toBeVisible();await page.click('#restart-quiz');await expect(page.locator('legend')).toHaveText(questions[0].prompt);await expect(page.locator('#answer-feedback')).toBeEmpty();
});
test('quiz mobile layout, unanswered submission and replay after completion',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto('/quiz.html');await page.clock.install();await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('#feedback-title')).toHaveCount(0);
 await page.locator('input[value="1"]').check();await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.click('#demo-play');await page.clock.runFor(12500);await expect(page.locator('#demo-play')).toBeDisabled();await page.click('#demo-reset');await expect(page.locator('#demo-play')).toBeEnabled();await page.click('#demo-play');await page.clock.runFor(500);await expect(page.locator('#demo-values')).not.toContainText('Simulated time: 0.00 s');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

import {advancedQuestions} from '../src/quiz-advanced';
test('advanced part: direct entry, complete feedback flow, simulations, score and restart',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('link',{name:'Part Two: Advanced challenges →',exact:true}).click();
 await expect(page).toHaveURL(/quiz.html\?part=2$/);await expect(page.locator('h1')).toHaveText('Part Two: Advanced challenges');
 await page.setViewportSize({width:390,height:844});await page.clock.install();
 for(const [i,q] of advancedQuestions.entries()){
  await expect(page.locator('legend')).toHaveText(q.prompt);
  await expect(page.locator('#next-question')).toHaveCount(0);
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('#feedback-title')).toHaveCount(0);
  await page.locator(`input[value="${i===0 ? (q.correct+1)%q.options.length:q.correct}"]`).check();
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('#feedback-title')).toContainText(i===0?'Not quite':'Correct');
  await expect(page.locator('#answer-feedback')).toContainText(q.explanation);
  await page.click('#demo-play');await page.clock.runFor(12500);await expect(page.locator('#demo-play')).toBeDisabled();
  await expect(page.locator('#demo-values')).not.toContainText('NaN');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.click('#demo-reset');await expect(page.locator('#demo-values')).toContainText('Simulated time: 0.00 s');await page.click('#next-question');
 }
 await expect(page.getByRole('heading',{name:'Your result: 7 / 8'})).toBeVisible();
 await page.click('#restart-quiz');await expect(page.locator('legend')).toHaveText(advancedQuestions[0].prompt);
 await expect(page.locator('#answer-feedback')).toBeEmpty();expect(errors).toEqual([]);
});
