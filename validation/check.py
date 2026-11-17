"""Independent DOP853, elliptic-period and energy-balance verification."""
import json, platform
from pathlib import Path
import numpy as np
import scipy
from scipy.integrate import solve_ivp
from scipy.special import ellipk
runs=json.loads(Path('validation/runs.json').read_text())
results=[]
for r in runs:
 p=r['p']; m,L,g=p['mass'],p['length'],p['gravity']; metrics=r['metrics']
 result={'case':r['name'],'mode':r['mode'],'dt':p['dt']}
 if 'states' in r:
  s=r['states']; t=np.array([v['time'] for v in s]); I=m*L*L
  def rhs(t,y):
   th,w,_,_=y
   drive=p['driveAmplitude']*np.sin(p['driveOmega']*t)
   loss=p['linearDamping']*w*w+p['quadraticDamping']*abs(w)**3
   return [w,-g/L*np.sin(th)+(drive-p['linearDamping']*w-p['quadraticDamping']*w*abs(w))/I,drive*w,loss]
  ref=solve_ivp(rhs,(0,t[-1]),[p['initialAngle'],p['initialOmega'],0,0],method='DOP853',rtol=2e-12,atol=2e-14,t_eval=t)
  assert ref.success
  actual=np.array([[v['theta'],v['omega'],v['driveWork'],v['dissipatedEnergy']] for v in s]).T
  err=np.max(np.sqrt((actual[0]-ref.y[0])**2+(actual[1]-ref.y[1])**2/(g/L)))
  balance=max(abs(v['totalEnergy']-metrics['initialEnergy']-v['driveWork']+v['dissipatedEnergy']) for v in s)
  constraint=max(abs(v['x']**2+v['y']**2-L**2) for v in s)
  tangent=max(abs(v['x']*v['vx']+v['y']*v['vy']) for v in s)
  result.update(state_error=float(err),balance_J=balance,constraint_m2=constraint,tangency_m2_s=tangent)
  if p['dt']==1/240:
   assert err<2e-5,(r['name'],r['mode'],err)
   assert balance<2e-5,(r['name'],r['mode'],balance)
  assert constraint<1e-12 and tangent<1e-12
 elif r['name']=='period':
  exact=4*np.sqrt(L/g)*ellipk(np.sin(p['initialAngle']/2)**2)
  error=abs(metrics['estimatedPeriod']/exact-1)*100
  assert abs(metrics['exactPeriod']/exact-1)<1e-12
  assert error<.003,(r['mode'],p['initialAngle'],error)
  result.update(angle_rad=p['initialAngle'],exact_period_s=float(exact),measured_period_s=metrics['estimatedPeriod'],period_error_percent=float(error))
 else:
  result.update(energy_range_percent=metrics['energyDriftPercent'],energy_ratio=r['state']['totalEnergy']/metrics['initialEnergy'])
  assert metrics['energyDriftPercent']<.001
 results.append(result)
orders=[]
for mode in ['angular','cartesian']:
 for name in ['free','linear','quadratic','driven','rotation']:
  rs=[r for r in results if r['mode']==mode and r['case']==name]
  order=np.log2(rs[-2]['state_error']/rs[-1]['state_error'])
  orders.append({'mode':mode,'case':name,'finest_pair_order':float(order)})
  # |omega| omega is not globally smooth; RK4 need not retain order four at crossings.
  assert order>2.7,(mode,name,order)
report={'reference':f'SciPy {scipy.__version__} DOP853 rtol=2e-12 atol=2e-14; elliptic integral', 'python':platform.python_version(),'results':results,'convergence':orders}
Path('validation/report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checks':'passed','cases':len(results),'orders':orders},indent=2))
