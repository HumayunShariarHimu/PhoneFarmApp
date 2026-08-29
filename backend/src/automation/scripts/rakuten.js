'use strict';
async function browse_offers(ctx) {
  const { adb, config, progress } = ctx;
  const mins = config.minutes || 15;
  const earnings = (mins/60)*0.15;
  await progress(5,'Opening Rakuten...');
  const installed = await adb?.isAppInstalled('com.rakuten.ichiba.app');
  if (!installed) return { earnings:0, error:'Rakuten not installed', action:'browse_offers' };
  await adb.launchApp('com.rakuten.ichiba.app'); await adb.sleep(4000);
  for (let i=0; i<mins; i++) {
    if (ctx.cancelled()) break;
    await progress(5+(i/mins)*90, `Browsing ${i+1}/${mins}min`);
    await adb.swipeUp(); await adb.sleep(2000);
    await adb.tap(Math.floor(Math.random()*800+100), Math.floor(Math.random()*1200+300)).catch(()=>{});
    await adb.sleep(3000); await adb.pressBack(); await adb.sleep(1000);
    await adb.wakeScreen().catch(()=>{});
    await adb.sleep(55000);
  }
  return { earnings, action:'browse_offers' };
}
module.exports = { browse_offers, activate_cashback:browse_offers, shop_online:browse_offers, referral:browse_offers, default:browse_offers };
