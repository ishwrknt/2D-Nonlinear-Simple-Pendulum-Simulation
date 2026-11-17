import './style.css';
import './compare.css';
import { PendulumEngine } from './physics';
import { History } from './history';
import { defaults, presets, fields, signed, allowed, domainMessage } from './settings';
import { effectiveGravity, reynoldsNumber } from './fluid';
import type { Parameters, PendulumState } from './types';

type Run = { id: number; params: Parameters; engine: PendulumEngine; history: History<PendulumState> };
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let nextId = 1, running = false, accumulator = 0, previous = 0, lastPaint = 0;
let dt = defaults.dt;
const runs: Run[] = [];
const palette = ['#087e70', '#ad4b25', '#385cb5', '#8a3ea0', '#776000', '#9e315b'];
const color = (id: number) => palette[(id - 1) % palette.length];
const dash = (id: number) => [[], [8,4], [3,3], [12,3,3,3]][Math.floor((id - 1) / palette.length) % 4];
function makeRun(params: Parameters): Run {
  const engine = new PendulumEngine({...params, dt});
  const history = new History<PendulumState>(s => [s.theta,s.omega,s.totalEnergy,s.x,s.y]);
  history.push(engine.getState());
  return {id:nextId++,params:engine.getParameters(),engine,history};
}
function parseParams(value: unknown): Parameters {
  if (!value || typeof value !== 'object') throw Error('Invalid setup');
  const p = {...defaults};
  for (const f of fields) {
    const v = (value as Record<string,unknown>)[f.key] ?? p[f.key];
    if (typeof v !== 'number' || !allowed(f.key,v)) throw Error('Invalid setup');
    p[f.key] = v;
  }
  return p;
}
let initialNotice = '';
try {
  const search = new URLSearchParams(location.search);
  const comparison = search.get('comparison');
  if (comparison) {
    const data = JSON.parse(comparison);
    if (!Array.isArray(data.pendulums) || !data.pendulums.length || ![1/60,1/120,1/240,1/480].includes(data.dt)) throw Error('Invalid setup');
    dt = data.dt;
    const settings = data.pendulums.map(parseParams);
    for (const p of settings) runs.push(makeRun(p));
  } else {
    const setup=search.has('setup')?JSON.parse(search.get('setup')!):defaults;
    if([1/60,1/120,1/240,1/480].includes(setup.dt))dt=setup.dt;
    runs.push(makeRun(parseParams(setup)));
  }
} catch {
  runs.length=0;nextId=1;dt=defaults.dt;runs.push(makeRun(defaults));
  initialNotice='The shared comparison was invalid. A default pendulum has been loaded.';
}
get('comparison-app').innerHTML = `<header><div><p class="eyebrow">Change one thing · compare the evidence</p><h1>Compare pendulums</h1><p>Add pendulums, change their settings, and watch their curves together.</p></div><a href="./">Back to laboratory</a></header><main>
<section class="card"><div class="comparison-controls"><button id="add-pendulum" class="primary">+ Add pendulum</button><button id="comparison-play">Play all</button><button id="comparison-step">Step once</button><button id="comparison-reset">Reset all</button><span id="comparison-time" role="status">Time: 0.00 s</span></div><p class="hint">New pendulums copy the last setup so you can change one variable. Editing, adding or removing pauses and resets every pendulum to the same starting time.</p><details><summary>Time step & sharing</summary><label for="comparison-dt">Shared output step (s)</label><select id="comparison-dt"><option value="${1/60}">1/60</option><option value="${1/120}">1/120</option><option value="${1/240}">1/240</option><option value="${1/480}">1/480</option></select><p class="hint">All pendulums use the same clock. Halve the step to check demanding settings.</p><button id="comparison-share">Copy comparison link</button><label for="comparison-link">Comparison link</label><input id="comparison-link" readonly></details><p id="comparison-notice" role="status"></p></section>
<section class="card" style="margin-top:20px"><h2>One graph, all pendulums</h2><div class="comparison-controls"><label for="comparison-plot">Plot</label><select id="comparison-plot"><option value="theta">Angle θ (rad)</option><option value="omega">Angular velocity ω (rad/s)</option><option value="totalEnergy">Mechanical energy E (J)</option><option value="phase">Phase: ω against θ</option><option value="x">Horizontal position x (m)</option><option value="y">Downward position y (m)</option></select><label class="comparison-fit"><input id="comparison-fit-all" type="checkbox" checked> Fit all data (compress axis)</label><label for="comparison-window">Scrolling window</label><select id="comparison-window" disabled><option value="10">Last 10 s</option><option value="30">Last 30 s</option></select><button id="comparison-export">Download comparison CSV</button></div><ul id="comparison-legend" class="comparison-legend"></ul><canvas id="comparison-graph" width="1000" height="420" aria-label="Overlaid pendulum traces on shared axes. Live numerical values and a downloadable CSV are provided below."></canvas><p id="comparison-caption" class="hint"></p><div id="comparison-values" class="comparison-table"></div></section>
<div id="pendulum-cards" class="comparison-grid"></div><p class="hint">Animations use the same length scale across all cards. Very short rods may look small next to long rods; numeric lengths are shown. Graphs use shared axes and retain the full run; identical motions overlap. More pendulums and longer runs need more computing time and memory.</p><p class="hint">Model: massless rigid rod, point-mass dynamics and optional fully immersed sphere drag. Fluid drag is approximate; walls, free surfaces, added mass and fluid memory are omitted. These pendulums are independent, not mechanically coupled.</p><p><a href="./quiz.html">Check your understanding: Part One, then Part Two →</a></p></main>`;
get<HTMLSelectElement>('comparison-dt').value=String(dt);
function notice(message: string) { get('comparison-notice').textContent=message; }
function pause() { running=false;accumulator=0;get('comparison-play').textContent='Play all'; }
function resetAll(message='All pendulums reset.'): void {
  pause();
  for (const r of runs) {
    r.params.dt=dt;r.engine=new PendulumEngine(r.params);r.history.clear();r.history.push(r.engine.getState());
  }
  notice(message);updateLink();draw();
}
function updateLink() {
  const url=new URL('./compare.html',location.href);
  url.searchParams.set('comparison',JSON.stringify({dt,pendulums:runs.map(r=>r.params)}));
  get<HTMLInputElement>('comparison-link').value=url.href;
}
function validInputs(): boolean {
  for (const input of document.querySelectorAll<HTMLInputElement>('#pendulum-cards input')) if(!input.reportValidity()) return false;
  return true;
}
function renderCards() {
  get('pendulum-cards').innerHTML=runs.map(r=>{
    const inputs=(list:typeof fields)=>list.map(f=>`<label for="p${r.id}-${f.key}">${f.label} (${f.unit})<input id="p${r.id}-${f.key}" data-case="${r.id}" data-field="${f.key}" type="number" step="any" ${signed.has(f.key)?'':'min="0"'} required value="${Number(((r.params[f.key]??0)*(f.degrees?180/Math.PI:1)).toPrecision(12))}"></label>`).join('');
    return `<article class="card pendulum-card" style="--case-color:${color(r.id)}" data-pendulum="${r.id}"><div class="panel-heading"><h2>Pendulum ${r.id}</h2><button data-remove="${r.id}" ${runs.length===1?'disabled':''} aria-label="Remove pendulum ${r.id}">Remove</button></div><canvas id="motion-${r.id}" width="300" height="260" aria-label="Motion of pendulum ${r.id}; its live values appear in the shared table."></canvas><label for="preset-${r.id}">Starting example</label><select id="preset-${r.id}" data-preset-case="${r.id}"><option value="">Custom settings</option>${Object.entries(presets).map(([id,p])=>`<option value="${id}">${p.title}</option>`).join('')}</select><div class="fields">${inputs(fields.slice(0,4))}</div><details><summary>Damping, driving & initial speed</summary><div class="fields">${inputs(fields.slice(4,9))}</div></details><details><summary>Fluid & bob size</summary><div class="fields">${inputs(fields.slice(9))}</div><p class="hint">Density 0 turns fluid effects off. Set both density and viscosity for an oil.</p></details><p id="warning-${r.id}" class="hint"></p></article>`;
  }).join('');
  get('comparison-legend').innerHTML=runs.map(r=>`<li style="--case-color:${color(r.id)}">Pendulum ${r.id}</li>`).join('');
}
get('pendulum-cards').addEventListener('change',event=>{
  const target=event.target as HTMLInputElement;
  if(target.dataset.field) {
    pause();
    const r=runs.find(r=>r.id===Number(target.dataset.case))!;
    const f=fields.find(f=>f.key===target.dataset.field)!;
    const value=target.valueAsNumber;
    if(!allowed(f.key,value)) { target.setCustomValidity(domainMessage(f.key));target.reportValidity();notice(`Pendulum ${r.id}: ${domainMessage(f.key)}`);return; }
    const params={...r.params,[f.key]:value*(f.degrees?Math.PI/180:1)};
    try {new PendulumEngine(params);} catch(error) {target.setCustomValidity(String(error));target.reportValidity();notice(String(error));return;}
    target.setCustomValidity('');r.params=params;
    get<HTMLSelectElement>(`preset-${r.id}`).value='';resetAll(`Pendulum ${r.id} updated; all pendulums reset.`);
  } else if(target.dataset.presetCase && presets[target.value]) {
    const r=runs.find(r=>r.id===Number(target.dataset.presetCase))!;
    r.params={...defaults,...presets[target.value].params,dt};renderCards();resetAll(`Example applied to pendulum ${r.id}; all pendulums reset.`);
  }
});
get('pendulum-cards').addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove]');
  if(!button || runs.length===1)return;
  runs.splice(runs.findIndex(r=>r.id===Number(button.dataset.remove)),1);renderCards();resetAll();
});
get('add-pendulum').addEventListener('click',()=>{
  if(!validInputs())return;
  runs.push(makeRun({...runs.at(-1)!.params}));renderCards();resetAll(`Pendulum ${runs.at(-1)!.id} added. Change one of its settings to compare.`);
});
get('comparison-play').addEventListener('click',()=>{
  if(running){pause();notice('Paused.');}else if(validInputs()){running=true;get('comparison-play').textContent='Pause all';notice('Running together.');}
});
get('comparison-reset').addEventListener('click',()=>{renderCards();resetAll();});
get('comparison-dt').addEventListener('change',()=>{dt=Number(get<HTMLSelectElement>('comparison-dt').value);resetAll();});
function advance(): boolean {
  try { for(const r of runs) r.history.push(r.engine.step());return true; }
  catch(error) {resetAll(`Calculation stopped and all runs reset: ${String(error)} Try a smaller time step or less extreme settings.`);return false;}
}
get('comparison-step').addEventListener('click',()=>{pause();if(validInputs())advance();draw();});
for(const id of ['comparison-plot','comparison-fit-all','comparison-window'])get(id).addEventListener('change',draw);
get('comparison-share').addEventListener('click',async()=>{
  if(!validInputs())return;
  updateLink();try {await navigator.clipboard.writeText(get<HTMLInputElement>('comparison-link').value);notice('Comparison link copied.');}catch{notice('Select and copy the comparison link shown above.');}
});
get('comparison-export').addEventListener('click',()=>{
  const parameterKeys=Object.keys(defaults) as (keyof Parameters)[];
  const stateKeys: (keyof PendulumState)[]=['time','theta','omega','x','y','totalEnergy','driveWork','dissipatedEnergy'];
  const lines=['# SI units: seconds, radians, metres, kilograms, joules; settings included for each pendulum.', ['pendulum',...stateKeys,...parameterKeys.map(k=>`setting_${k}`)].join(',')];
  for(const r of runs)for(const s of r.history.values())lines.push([r.id,...stateKeys.map(k=>s[k]),...parameterKeys.map(k=>r.params[k])].join(','));
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='pendulum-comparison.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function draw() {
  const time=runs[0].engine.getState().time;
  get('comparison-time').textContent=`Time: ${time.toFixed(2)} s`;
  const longest=Math.max(...runs.map(r=>r.params.length));
  for(const r of runs) {
    const s=r.engine.getState(),ctx=get<HTMLCanvasElement>(`motion-${r.id}`).getContext('2d')!;
    const length=90*(r.params.length/longest),x=150+length*Math.sin(s.theta),y=120+length*Math.cos(s.theta);
    ctx.clearRect(0,0,300,260);ctx.strokeStyle='#bccbc3';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(150,25);ctx.lineTo(150,215);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle=color(r.id);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(150,120);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle=color(r.id);ctx.beginPath();ctx.arc(x,y,8,0,2*Math.PI);ctx.fill();ctx.font='15px system-ui';ctx.textAlign='center';ctx.fillText(`L = ${r.params.length} m · θ = ${(s.theta*180/Math.PI).toFixed(1)}°`,150,245);
    const warnings=[];
    if((r.params.bobRadius??0.025)/r.params.length>0.1)warnings.push('Large bob relative to rod: the small-bob model may be inaccurate.');
    if((r.params.fluidDensity??0)>0 && effectiveGravity(r.params)<=0)warnings.push('No downward oscillation reference: buoyancy cancels or reverses restoring torque.');
    if(reynoldsNumber(r.params,s.omega)>200000)warnings.push('High Reynolds number: the drag correlation is outside its usual useful range.');
    get(`warning-${r.id}`).textContent=warnings.join(' ');
  }
  drawGraph();
  get('comparison-values').innerHTML=`<table><thead><tr><th>Pendulum</th><th>Time (s)</th><th>Angle (rad)</th><th>ω (rad/s)</th><th>Energy (J)</th><th>Undamped reference (s)</th></tr></thead><tbody>${runs.map(r=>{
    const s=r.engine.getState(),g=effectiveGravity(r.params);
    return `<tr><th>Pendulum ${r.id}</th><td>${s.time.toFixed(3)}</td><td>${s.theta.toFixed(4)}</td><td>${s.omega.toFixed(4)}</td><td>${s.totalEnergy.toFixed(4)}</td><td>${g>1e-12?(2*Math.PI*Math.sqrt(r.params.length/g)).toFixed(4):'Not applicable'}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function drawGraph() {
  const selection=get<HTMLSelectElement>('comparison-plot').value;
  const fitAll=get<HTMLInputElement>('comparison-fit-all').checked;
  const seconds=Number(get<HTMLSelectElement>('comparison-window').value);
  get<HTMLSelectElement>('comparison-window').disabled=fitAll;
  const last=runs[0].engine.getState().time;
  const start=fitAll?0:Math.max(0,last-seconds);
  const lines=runs.map(r=>({r,points:(fitAll?r.history.plotValues():r.history.window(start,s=>s.time)).map(s=>({x:selection==='phase'?s.theta:s.time,y:selection==='phase'?s.omega:s[selection as 'theta'|'omega'|'totalEnergy'|'x'|'y']}))}));
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const line of lines)for(const p of line.points){xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y);}
  if(selection!=='phase' && !fitAll){xmin=start;xmax=Math.max(last,start+1e-9);}
  if(xmin===xmax)xmax=xmin+1;
  const pad=Math.max((ymax-ymin)*.1,Math.max(Math.abs(ymin),Math.abs(ymax))*.001,1e-5);ymin-=pad;ymax+=pad;
  const canvas=get<HTMLCanvasElement>('comparison-graph');
  const width=Math.max(280,canvas.clientWidth),height=340,ratio=window.devicePixelRatio||1;
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
  canvas.style.height=`${height}px`;
  const ctx=canvas.getContext('2d')!;ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,width,height);ctx.font='13px system-ui';
  const left=72,right=width-20,bottom=height-60;
  const X=(x:number)=>left+(x-xmin)/(xmax-xmin)*(right-left),Y=(y:number)=>bottom-(y-ymin)/(ymax-ymin)*(bottom-40);
  const format=(n:number)=>Math.abs(n)>9999 || (Math.abs(n)<.001&&n!==0)?n.toExponential(1):n.toFixed(2);
  const ticks=width<500?2:4;
  for(let i=0;i<=ticks;i++){
    const y=ymin+(ymax-ymin)*i/ticks,x=xmin+(xmax-xmin)*i/ticks;
    ctx.strokeStyle='#e1e8e4';ctx.beginPath();ctx.moveTo(left,Y(y));ctx.lineTo(right,Y(y));ctx.stroke();
    ctx.fillStyle='#435e53';ctx.textAlign='right';ctx.fillText(format(y),left-8,Y(y)+5);ctx.textAlign='center';ctx.fillText(format(x),X(x),bottom+24);
  }
  lines.forEach(({r,points})=>{ctx.strokeStyle=color(r.id);ctx.lineWidth=2.5;ctx.setLineDash(dash(r.id));ctx.beginPath();points.forEach((p,i)=>{if(i===0)ctx.moveTo(X(p.x),Y(p.y));else ctx.lineTo(X(p.x),Y(p.y));});ctx.stroke();ctx.setLineDash([]);});
  ctx.fillStyle='#435e53';ctx.textAlign='left';ctx.fillText(get<HTMLSelectElement>('comparison-plot').selectedOptions[0].text,left,22);ctx.textAlign='center';ctx.fillText(selection==='phase'?'Angle θ (rad)':'Time (s)',(left+right)/2,height-8);
  canvas.dataset.startTime=String(start);canvas.dataset.endTime=String(last);
  get('comparison-caption').textContent=`${runs.length} pendulum${runs.length===1?'':'s'} on shared axes. ${fitAll?'Fit all data: axis compressed over the full run.':`Showing the last ${seconds} seconds (${start.toFixed(2)}–${last.toFixed(2)} s).`} Full run: ${runs[0].history.total.toLocaleString()} samples per pendulum, starting at 0 s. CSV includes every sample. Identical curves overlap; vary one setting to see the difference.`;
}
function frame(now:number) {
  const elapsed=previous?Math.min((now-previous)/1000,.1):0;previous=now;
  if(running){accumulator+=elapsed;let steps=0;const start=performance.now();while(accumulator>=dt && running && steps<120){if(!advance())break;accumulator-=dt;steps++;if(performance.now()-start>12)break;}
    if(accumulator>.25){accumulator=.25;notice('Playback is slower to keep controls responsive. Compare simulated time, not wall-clock time.');}
  }
  if(now-lastPaint>=50){draw();lastPaint=now;}requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
renderCards();updateLink();draw();notice(initialNotice);requestAnimationFrame(frame);
