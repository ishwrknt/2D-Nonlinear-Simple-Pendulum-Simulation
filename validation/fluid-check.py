"""Independent force-law implementation and DOP853 comparison for fluid presets."""
import json
from pathlib import Path
import numpy as np
from scipy.integrate import solve_ivp
runs=json.loads(Path('validation/fluid-runs.json').read_text());results=[]
for run in runs:
 p=run['p'];m,L,g,r,rho,mu=[p[k] for k in ['mass','length','gravity','bobRadius','fluidDensity','fluidViscosity']]
 volume=4*np.pi*r**3/3;geff=g*(1-rho*volume/m)
 def rhs(t,v):
  theta,omega,loss=v;speed=abs(omega)*L;Re=rho*speed*2*r/mu
  # Independent force implementation; finite Stokes limit at rest.
  if Re<=1000:force=6*np.pi*mu*r*speed*(1+.15*Re**.687)
  else:force=.5*rho*.44*np.pi*r*r*speed*speed
  resisting=force*L*np.sign(omega)
  return [omega,-geff/L*np.sin(theta)-resisting/(m*L*L),resisting*omega]
 states=run['states'];times=np.array([s['time'] for s in states]);ref=solve_ivp(rhs,(0,times[-1]),[p['initialAngle'],0,0],t_eval=times,method='DOP853',rtol=2e-12,atol=2e-14,max_step=.01)
 assert ref.success
 actual=np.array([[s['theta'],s['omega'],s['dissipatedEnergy']] for s in states]).T
 error=float(np.max(np.abs(actual[:2]-ref.y[:2])))
 balance=float(max(abs(s['totalEnergy']-states[0]['totalEnergy']+s['dissipatedEnergy']) for s in states))
 assert error<2e-4,(run['name'],run['mode'],error)
 assert balance<2e-6,(run['name'],run['mode'],balance)
 assert all(states[i]['dissipatedEnergy']>=states[i-1]['dissipatedEnergy']-1e-12 for i in range(1,len(states)))
 results.append({'case':run['name'],'mode':run['mode'],'effective_gravity_m_s2':geff,'maximum_state_component_error':error,'maximum_balance_residual_J':balance,'energy_dissipated_10s_J':states[-1]['dissipatedEnergy']})
Path('validation/fluid-report.json').write_text(json.dumps({'scope':'Numerical agreement with same approximate hydrodynamic model, not real-fluid experimental validation.','reference':'Independent Python forces; SciPy DOP853, rtol2e-12 atol2e-14 max_step0.01 s','results':results},indent=2)+'\n')
print(json.dumps(results,indent=2))
