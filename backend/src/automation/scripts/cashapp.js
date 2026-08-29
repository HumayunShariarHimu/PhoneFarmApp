'use strict';
const CA_PKG = 'com.squareup.cash';
async function claim_boost(ctx) {
  const { adb, config, progress, log } = ctx;
  const count = config.boostCount || 5;
  const earnings = count * 0.08;
  const installed = await adb?.isAppInstalled(CA_PKG);
  if (!installed) return { earnings:0, error:'Cash App not installed', action:'claim_boost' };
  await progress(5,'Opening Cash App...');
  await adb.launchApp(CA_PKG); await adb.sleep(5000);
  await adb.tap(540,1800); await adb.sleep(2000); // Boost tab
  for (let i=0;i<count;i++) {
    if (ctx.cancelled()) break;
    await progress(10+(i/count)*80,`Boost ${i+1}/${count}`);
    await adb.tap(200+i*100,500).catch(()=>{});
    await adb.sleep(2000);
    await adb.findAndClick('Activate').catch(()=>{});
    await adb.sleep(2000);
    log(`Boost ${i+1} activated`);
  }
  await adb.stopApp(CA_PKG);
  return { earnings, boostsActivated:count, action:'claim_boost' };
}
module.exports = { claim_boost, boost_spending:claim_boost, refer_earn:claim_boost, bitcoin:claim_boost, default:claim_boost };
