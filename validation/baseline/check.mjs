import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PendulumEngine } from './physics.ts';
const p={mass:1,length:.75,gravity:9.81,linearDamping:0,quadraticDamping:0,driveAmplitude:0,driveOmega:2.75,dt:1/240,initialAngle:.9};
const e=new PendulumEngine(p);e.setMode('cartesian');const E0=e.getState().totalEnergy;
const first={...e.step()};const signedOmega=(first.y*first.vx-first.x*first.vy)/p.length**2;
assert(first.omega*signedOmega<0);
for(let i=1;i<120/p.dt;i++)e.step();
const ratio=e.getState().totalEnergy/E0;assert(ratio<.05);
const a=new PendulumEngine(p),b=new PendulumEngine({...p,linearDamping:.4,driveAmplitude:2});a.setMode('cartesian');b.setMode('cartesian');
for(let i=0;i<10/p.dt;i++){a.step();b.step();}
const {alpha:alphaA,...trajectoryA}=a.getState(),{alpha:alphaB,...trajectoryB}=b.getState();
assert.deepEqual(trajectoryA,trajectoryB); assert.notEqual(alphaA,alphaB);
const report={baseline:'a4d1d9c01010f41e0f842f516e5cb53ad2276750',energy_ratio_120s:ratio,reported_omega:first.omega,coordinate_omega:signedOmega,forces_ignored:true};
writeFileSync('validation/baseline/report.json',JSON.stringify(report,null,2)+'\n');console.log(report);
