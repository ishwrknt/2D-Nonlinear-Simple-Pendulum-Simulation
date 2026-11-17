"""Regenerate vector figures exclusively from recorded numeric validation outputs."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.size':10,'svg.fonttype':'none'})
r=json.loads(Path('validation/report.json').read_text())['results']
out=Path('validation/figures');out.mkdir(exist_ok=True)
fig,axes=plt.subplots(1,2,figsize=(9,3.8),constrained_layout=True)
for mode,marker in [('angular','o'),('cartesian','s')]:
 for case,style in [('free','-'),('linear','--'),('driven',':')]:
  rows=[x for x in r if x['mode']==mode and x['case']==case]
  axes[0].loglog([x['dt'] for x in rows],[x['state_error'] for x in rows],marker+style,label=f'{mode}, {case}')
 rows=[x for x in r if x['mode']==mode and x['case']=='period']
 axes[1].semilogy([x['angle_rad'] for x in rows],[x['period_error_percent'] for x in rows],marker+'-',label=mode)
axes[0].set(xlabel='Output step Δt (s)',ylabel='Maximum scaled trajectory error',title='10 s against independent DOP853')
axes[1].set(xlabel='Release angle (rad)',ylabel='Period error (%)',title='40 s, Δt = 1/240 s')
for ax in axes:ax.grid(True,alpha=.25);ax.legend(fontsize=8)
for ext in ['pdf','svg','png']:fig.savefig(out/f'validation.{ext}',dpi=300)
fig,ax=plt.subplots(figsize=(6,3.5),constrained_layout=True)
raw=json.loads(Path('validation/runs.json').read_text())
for mode in ['angular','cartesian']:
 run=next(x for x in raw if x['name']=='driven' and x['mode']==mode and x['p']['dt']==1/240)
 initial=run['metrics']['initialEnergy'];s=run['states'];ax.plot([v['time'] for v in s],[v['totalEnergy']-initial-v['driveWork']+v['dissipatedEnergy'] for v in s],label=mode)
ax.set(xlabel='Time (s)',ylabel='Energy-balance residual (J)',title='Driven/damped benchmark, Δt = 1/240 s');ax.legend();ax.grid(True,alpha=.25)
for ext in ['pdf','svg','png']:fig.savefig(out/f'energy-balance.{ext}',dpi=300)
print('Six validation figure files generated.')

# Workflow is a documented process diagram, not measured research data.
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
fig,ax=plt.subplots(figsize=(8,7),constrained_layout=True)
ax.set(xlim=(-1.65,1.65),ylim=(-1.55,1.6),aspect='equal');ax.axis('off')
names=[('Drishti','Inspect project'),('Bodhi','Evidence & gaps'),('Tarka','Testable criteria'),('Yukti','Plan & diagnose'),('Karma','Implement & refine'),('Satya','Check outputs'),('Siddhi','Evidence & metrics')]
angles=np.pi/2-np.arange(7)*2*np.pi/7
points=np.column_stack([1.15*np.cos(angles),1.15*np.sin(angles)])
for i,((name,desc),(x,y)) in enumerate(zip(names,points)):
 color=['#dfebe3','#e8edf9','#e8edf9','#e8edf9','#fff0dc','#e1f0ef','#e1f0ef'][i]
 ax.add_patch(FancyBboxPatch((x-.39,y-.15),.78,.30,boxstyle='round,pad=.025',facecolor=color,edgecolor='#536a5e'))
 ax.text(x,y+.04,name,ha='center',va='center',weight='bold',fontsize=11)
 ax.text(x,y-.08,desc,ha='center',va='center',fontsize=7.8)

for i,point in enumerate(points):
 end=points[(i+1)%7];vec=end-point
 cut=min(.425/max(abs(vec[0]),1e-12),.185/max(abs(vec[1]),1e-12))
 start=point+vec*cut;finish=end-vec*cut
 ax.add_patch(FancyArrowPatch(start,finish,arrowstyle='-|>',mutation_scale=14,color='#536a5e'))
ax.text(0,0.09,'Human approval of plan',ha='center',weight='bold',fontsize=11)
ax.text(0,-.08,'Human review of release',ha='center',fontsize=10)
ax.text(0,-.28,'Failed validation → diagnose → retry',ha='center',fontsize=8.5)
ax.set_title('SMART correction cycle for this revision',fontsize=14,pad=15)
fig.text(.5,.02,'Sequential roles in one coding assistant; earlier draft reuse is disclosed.',ha='center',fontsize=9)
for ext in ['pdf','svg','png']:fig.savefig(out/f'smart-workflow.{ext}',dpi=300)
