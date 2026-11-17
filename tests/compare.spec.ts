import {test,expect} from '@playwright/test';
test('comparison copies current setup, adds independent pendulums, shares and exports synchronized data',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('#length-input').fill('1.5');await page.locator('#length-input').press('Tab');
 await page.getByRole('link',{name:'Compare pendulums →'}).click();
 await expect(page.locator('#p1-length')).toHaveValue('1.5');await expect(page.locator('[data-pendulum]')).toHaveCount(1);
 await page.clock.install();
 await page.locator('#add-pendulum').click();await page.locator('#add-pendulum').click();
 await expect(page.locator('[data-pendulum]')).toHaveCount(3);
 await page.locator('#p2-length').fill('3');await page.locator('#p2-length').press('Tab');
 await page.locator('#p3-mass').fill('2');await page.locator('#p3-mass').press('Tab');
 await page.locator('#p3-length').fill('1.5');await page.locator('#p3-length').press('Tab');
 await expect(page.locator('#p1-length')).toHaveValue('1.5');await expect(page.locator('#p1-mass')).toHaveValue('1');
 await page.locator('#comparison-play').click();await page.clock.runFor(2200);await page.locator('#comparison-play').click();
 const cells=await page.locator('#comparison-values tbody tr').evaluateAll(rows=>rows.map(row=>Array.from(row.querySelectorAll('td')).map(td=>td.textContent)));
 expect(cells[0][0]).toBe(cells[1][0]);expect(cells[1][0]).toBe(cells[2][0]);
 expect(cells[0][1]).toBe(cells[2][1]);expect(cells[0][1]).not.toBe(cells[1][1]);
 expect(Number(cells[1][4])/Number(cells[0][4])).toBeCloseTo(Math.sqrt(2),3);
 const downloadPromise=page.waitForEvent('download');await page.locator('#comparison-export').click();const download=await downloadPromise;const stream=await download.createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk;
 const rows=csv.trim().split('\n').slice(2).map(row=>row.split(','));
 for(const id of ['1','2','3']){const group=rows.filter(r=>r[0]===id);expect(group.length).toBeGreaterThan(400);expect(Number(group[0][1])).toBe(0);}
 const link=await page.locator('#comparison-link').inputValue();await page.goto(link);
 await expect(page.locator('[data-pendulum]')).toHaveCount(3);await expect(page.locator('#p2-length')).toHaveValue('3');await expect(page.locator('#p3-mass')).toHaveValue('2');
 await page.getByRole('button',{name:'Remove pendulum 2',exact:true}).click();await expect(page.locator('[data-pendulum]')).toHaveCount(2);
 await expect(page.locator('#comparison-time')).toHaveText('Time: 0.00 s');expect(errors).toEqual([]);
});
test('comparison invalid inputs block playback, reset recovers, and mobile supports more than three pendulums',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/compare.html');await page.clock.install();
 for(let i=0;i<3;i++)await page.locator('#add-pendulum').click();
 await expect(page.locator('[data-pendulum]')).toHaveCount(4);
 await page.locator('#p2-length').fill('0');await page.locator('#p2-length').press('Tab');await page.locator('#comparison-play').click();
 await expect(page.locator('#comparison-play')).toHaveText('Play all');await page.locator('#comparison-step').click();await expect(page.locator('#comparison-time')).toHaveText('Time: 0.00 s');
 await page.locator('#comparison-reset').click();await expect(page.locator('#p2-length')).toHaveValue('0.75');
 await page.locator('#preset-3').selectOption('oil');await expect(page.locator('#p3-fluidDensity')).toHaveValue('900');await expect(page.locator('#p1-fluidDensity')).toHaveValue('0');
 await page.locator('#p4-length').fill('12');await page.locator('#p4-length').press('Tab');
 await page.locator('#comparison-play').click();await page.clock.runFor(500);await page.locator('#comparison-play').click();
 for(const plot of ['omega','totalEnergy','phase','x','y','theta'])await page.locator('#comparison-plot').selectOption(plot);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'validation/comparison-mobile.png',fullPage:true});
});
test('comparison invalid shared setups fall back safely',async({page})=>{
 await page.goto('/compare.html?comparison='+encodeURIComponent(JSON.stringify({dt:1/240,pendulums:[{length:-1}]})));
 await expect(page.locator('#comparison-notice')).toContainText('invalid');await expect(page.locator('#p1-length')).toHaveValue('0.75');
});
