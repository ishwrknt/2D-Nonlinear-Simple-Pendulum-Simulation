import { test } from "node:test";
import assert from "node:assert/strict";
import { PendulumEngine, exactReleasePeriod } from "../src/physics.ts";
const base = {
  mass: 1,
  length: 0.75,
  gravity: 9.81,
  linearDamping: 0,
  quadraticDamping: 0,
  driveAmplitude: 0,
  driveOmega: 2.75,
  dt: 1 / 240,
  initialAngle: 0.9,
  initialOmega: 0,
};
function run(mode, p = {}, seconds = 10) {
  const e = new PendulumEngine({ ...base, ...p });
  e.setMode(mode);
  for (let i = 0; i < Math.round(seconds / e.getParameters().dt); i++) e.step();
  return e;
}
for (const mode of ["angular", "cartesian"]) {
  test(`${mode}: rest and zero-gravity uniform rotation`, () => {
    const rest = run(mode, { initialAngle: 0 });
    assert.equal(rest.getState().totalEnergy, 0);
    assert.equal(rest.getDerivedMetrics().estimatedPeriod, null);
    const zero = run(mode, { gravity: 0, initialOmega: 2 }, 2);
    assert.ok(Math.abs(zero.getState().theta - 4.9) < 1e-6);
    assert.ok(Math.abs(zero.getState().omega - 2) < 1e-6);
  });
  test(`${mode}: deterministic and defensive state copies`, () => {
    const a = run(mode),
      b = run(mode);
    assert.deepEqual(a.getState(), b.getState());
    a.getState().theta = 9;
    a.getParameters().length = 9;
    assert.deepEqual(a.getState(), b.getState());
    assert.equal(a.getParameters().length, 0.75);
  });
  test(`${mode}: positive theta initially accelerates left; damping dissipates; forcing acts`, () => {
    const e = new PendulumEngine(base);
    e.setMode(mode);
    assert.ok(e.step().omega < 0);
    const damp = run(mode, { linearDamping: 0.4 });
    assert.ok(
      damp.getState().totalEnergy <
        damp.getDerivedMetrics().initialEnergy * 0.01,
    );
    assert.ok(damp.getState().dissipatedEnergy > 0);
    assert.notEqual(
      run(mode, { driveAmplitude: 2 }).getState().theta,
      run(mode).getState().theta,
    );
  });
  test(`${mode}: angle is continuous through rotations; no false period`, () => {
    const e = new PendulumEngine({ ...base, initialOmega: 10 });
    e.setMode(mode);
    let theta = e.getState().theta;
    for (let i = 0; i < 2400; i++) {
      const s = e.step();
      assert.ok(Math.abs(s.theta - theta) < 0.1);
      theta = s.theta;
    }
    assert.ok(theta > Math.PI * 2);
    assert.equal(e.getDerivedMetrics().estimatedPeriod, null);
  });
  test(`${mode}: dragging and reset agree`, () => {
    const e = run(mode);
    e.overrideFromDrag(-1.1);
    const s = e.getState();
    assert.equal(s.time, 0);
    assert.equal(s.omega, 0);
    assert.deepEqual(e.reset(), s);
  });
}
test("coordinate formulations agree over 40 s including all torques", () => {
  const p = {
    linearDamping: 0.08,
    quadraticDamping: 0.05,
    driveAmplitude: 0.5,
    driveOmega: 3.5,
  };
  const a = run("angular", p, 40),
    b = run("cartesian", p, 40);
  assert.ok(Math.abs(a.getState().theta - b.getState().theta) < 1e-6);
  assert.ok(Math.abs(a.getState().omega - b.getState().omega) < 1e-6);
});
test("invalid physical parameters fail early", () => {
  for (const p of [
    { mass: 0 },
    { length: -1 },
    { dt: 0 },
    { gravity: -1 },
    { linearDamping: -1 },
    { initialAngle: NaN },
    { driveAmplitude: Infinity },
  ])
    assert.throws(() => new PendulumEngine({ ...base, ...p }));
});
test("exact period uses correct finite-amplitude assumptions", () => {
  assert.equal(exactReleasePeriod(0, 0.75, 9.81), null);
  assert.equal(exactReleasePeriod(Math.PI, 0.75, 9.81), null);
  assert.equal(exactReleasePeriod(0.9, 0.75, 0), null);
  assert.ok(
    exactReleasePeriod(0.9, 0.75, 9.81) > 2 * Math.PI * Math.sqrt(0.75 / 9.81),
  );
});

test("full history preserves long runs and summaries retain extrema", async () => {
  const { History } = await import("../src/history.ts");
  const h = new History((v) => [v.y]);
  for (let i = 0; i < 300000; i++)
    h.push({ time: i / 240, y: i === 120000 ? 100 : Math.sin(i) });
  assert.equal(h.total, 300000);
  assert.equal(h.values()[0].time, 0);
  assert.equal(h.values().at(-1).time, 299999 / 240);
  const points = h.plotValues();
  assert.ok(points.length < 2200);
  assert.equal(points[0].time, 0);
  assert.equal(points.at(-1).time, 299999 / 240);
  assert.equal(Math.max(...points.map((v) => v.y)), 100);
  for (let i = 1; i < points.length; i++)
    assert.ok(points[i].time > points[i - 1].time);
  assert.equal(h.window(1000, (v) => v.time)[0].time, 1000);
  h.clear();
  assert.equal(h.total, 0);
  assert.equal(h.plotValues().length, 0);
});

test("missing required parameters are rejected", () => {
  const p = { ...base };
  delete p.mass;
  assert.throws(() => new PendulumEngine(p));
});

test("fluid buoyancy, Stokes limit and drag direction have the expected analytical limits", async () => {
  const { effectiveGravity, displacedVolume, fluidResistance } =
    await import("../src/fluid.ts");
  const p = {
    ...base,
    mass: 0.1,
    bobRadius: 0.025,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
  };
  assert.ok(effectiveGravity(p) < p.gravity && effectiveGravity(p) > 0);
  assert.ok(
    Math.abs(
      fluidResistance(p, 0) -
        6 * Math.PI * p.fluidViscosity * p.bobRadius * p.length ** 2,
    ) < 1e-15,
  );
  assert.equal(fluidResistance(p, -1), fluidResistance(p, 1));
  const neutral = { ...p, fluidDensity: p.mass / displacedVolume(p) };
  assert.ok(Math.abs(effectiveGravity(neutral)) < 1e-12);
  const buoyant = { ...p, bobRadius: 0.035 };
  assert.ok(effectiveGravity(buoyant) < 0);
  for (const mode of ["angular", "cartesian"]) {
    const e = new PendulumEngine({ ...buoyant, initialAngle: 0.3 });
    e.setMode(mode);
    assert.ok(e.step().omega > 0);
    assert.equal(e.getDerivedMetrics().exactPeriod, null);
    assert.equal(e.getDerivedMetrics().theoreticalPeriod, Infinity);
  }
  assert.throws(() => new PendulumEngine({ ...p, fluidViscosity: 0 }));
});

test('quiz demonstrations support their mass, length, amplitude, neutral and damping answers',async()=>{
 const {questions,quizBase}=await import('../src/quiz-questions.ts');
 const engines=id=>questions.find(q=>q.id===id).cases.map(c=>new PendulumEngine({...quizBase,...c.settings}));
 const mass=engines('mass');for(let i=0;i<2400;i++)mass.forEach(e=>e.step());assert.equal(mass[0].getState().theta,mass[1].getState().theta);
 const length=engines('length');assert.ok(Math.abs(length[1].getDerivedMetrics().theoreticalPeriod/length[0].getDerivedMetrics().theoreticalPeriod-2)<1e-12);
 const amp=engines('amplitude');assert.ok(amp[1].getDerivedMetrics().exactPeriod>amp[0].getDerivedMetrics().exactPeriod);
 const neutral=engines('neutral');for(let i=0;i<2880;i++)neutral.forEach(e=>e.step());assert.ok(Math.abs(neutral[0].getState().theta-quizBase.initialAngle*3)<1e-10);
 const strong=engines('strong');let weakCrossed=false;for(let i=0;i<2880;i++){strong.forEach(e=>e.step());assert.ok(strong[1].getState().theta>0);if(strong[0].getState().theta<0)weakCrossed=true;}assert.ok(weakCrossed);
 for(const id of ['density','viscosity']){const pair=engines(id);const periods=pair.map(e=>e.getDerivedMetrics().theoreticalPeriod);if(id==='density')assert.ok(periods[1]>periods[0]);else assert.equal(periods[0],periods[1]);}
});

test('advanced explanations agree with simulated thresholds, decay, scaling and energy',async()=>{
 const {advancedQuestions}=await import('../src/quiz-advanced.ts');
 const {quizBase}=await import('../src/quiz-questions.ts');
 const pairs=new Map(advancedQuestions.map(q=>[q.id,q.cases.map(c=>new PendulumEngine({...quizBase,...c.settings}))]));
 const pair=id=>pairs.get(id);
 assert.ok(Math.abs(pair('combined')[1].getDerivedMetrics().exactPeriod/pair('combined')[0].getDerivedMetrics().exactPeriod-4)<1e-12);
 assert.equal(pair('matched-fluid')[0].getDerivedMetrics().theoreticalPeriod,pair('matched-fluid')[1].getDerivedMetrics().theoreticalPeriod);
 const peakSpeeds=[0,0];
 for(let i=0;i<2880;i++){
  for(const [id,engines] of pairs) for(const [j,e] of engines.entries()){
   const s=e.step();assert.ok(Number.isFinite(s.theta),id);
   assert.ok(Math.abs(e.getDerivedMetrics().energyBalanceError)<1e-5,id);
   if(id==='bottom-speed')peakSpeeds[j]=Math.max(peakSpeeds[j],Math.abs(s.omega));
   if(id==='critical')assert.ok(s.theta>=-1e-12);
   if(id==='radius-buoyancy' && i===0)assert.equal(Math.sign(s.omega),j===0?-1:1);
  }
  if(i===479)assert.ok(pair('critical')[0].getState().theta<pair('critical')[1].getState().theta/10);
 }
 assert.equal(pair('rotation')[0].getDerivedMetrics().hasRotated,false);
 assert.equal(pair('rotation')[1].getDerivedMetrics().hasRotated,true);
 assert.ok(Math.abs(peakSpeeds[1]/peakSpeeds[0]-Math.sqrt(3))<1e-4);
 assert.ok(pair('mass-damping')[1].getState().totalEnergy/2>pair('mass-damping')[0].getState().totalEnergy*2);
 assert.ok(Math.abs(pair('matched-fluid')[0].getState().theta-pair('matched-fluid')[1].getState().theta)>1e-4);
 assert.ok(pair('driven-balance')[1].getState().driveWork>0);
});
