"""Actual numerical trajectories for the three comparison presets; not apparatus data."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
runs=json.loads(Path('validation/fluid-runs.json').read_text())
fig,axes=plt.subplots(1,2,figsize=(9,3.7),constrained_layout=True)
for name,label in [('air','Air: 1.2 kg/m³, 18 μPa s'),('water','Water: 1000 kg/m³, 1 mPa s'),('oil','Oil: 900 kg/m³, 0.10 Pa s')]:
 run=next(r for r in runs if r['name']==name and r['mode']=='angular');s=run['states'];times=[v['time'] for v in s]
 axes[0].plot(times,[v['theta']*180/np.pi for v in s],label=label)
 axes[1].plot(times,[v['totalEnergy']/s[0]['totalEnergy'] for v in s],label=name)
axes[0].set(xlabel='Simulated time (s)',ylabel='Angle (degrees)',title='Same sphere and release; illustrative fluids')
axes[1].set(xlabel='Simulated time (s)',ylabel='Effective energy E/E₀',title='Each case normalised to its own E₀')
for ax in axes:ax.legend(fontsize=7);ax.grid(alpha=.25)
fig.suptitle('Fully immersed sphere: quasi-steady model, no added mass',fontsize=10)
for ext in ['pdf','svg','png']:fig.savefig(Path('validation/figures')/f'fluid-comparison.{ext}',dpi=300)
