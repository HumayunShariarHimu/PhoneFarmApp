'use strict';
// inboxdollars.js
const ID_PKG = 'com.inboxdollars.mobile';
async function read_email(ctx) {
  const { adb, config, progress } = ctx;
  const count = config.emailCount || 10;
  const earnings = count * 0.02;
  const installed = await adb?.isAppInstalled(ID_PKG);
  if (!installed) return { earnings:0, error:'InboxDollars not installed', action:'read_email' };
  await progress(5,'Opening InboxDollars...'); await adb.launchApp(ID_PKG); await adb.sleep(5000);
  await adb.tap(540,200); await adb.sleep(2000); // Emails tab
  for (let i=0;i<count;i++) {
    if (ctx.cancelled()) break;
    await progress(10+(i/count)*80,`Email ${i+1}/${count}`);
    await adb.tap(540,400+i*80); await adb.sleep(3000);
    await adb.sleep(5000); // Read email
    await adb.pressBack(); await adb.sleep(1500);
  }
  await adb.stopApp(ID_PKG);
  return { earnings, emailsRead:count, action:'read_email' };
}
async function watch_tv(ctx) {
  const { adb, config, progress } = ctx;
  const mins = config.minutes || 30;
  const earnings = (mins/60)*0.12;
  const installed = await adb?.isAppInstalled(ID_PKG);
  if (!installed) return { earnings:0, error:'InboxDollars not installed', action:'watch_tv' };
  await progress(5,'Opening InboxDollars TV...'); await adb.launchApp(ID_PKG); await adb.sleep(5000);
  await adb.tap(540,1700); await adb.sleep(2000); // TV tab
  await adb.tap(540,400); await adb.sleep(3000); // Play
  const end = Date.now() + mins*60000;
  while (Date.now()<end) {
    if (ctx.cancelled()) break;
    const pct = 10+(1-(end-Date.now())/(mins*60000))*85;
    await progress(pct,`Watching TV...`); await adb.wakeScreen().catch(()=>{}); await adb.sleep(30000);
  }
  await adb.stopApp(ID_PKG);
  return { earnings, minutes:mins, action:'watch_tv' };
}
module.exports = { read_email, watch_tv, complete_offer:read_email, take_survey:watch_tv, default:read_email };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  rakuten.js (separate export via index)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
