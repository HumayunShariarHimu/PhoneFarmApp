'use strict';
// honeygain.js
const HG_PKG = 'com.honeygain.app';
async function share_bandwidth(ctx) {
  const { adb, config, progress, log } = ctx;
  const hours = config.hours || 8;
  const earnings = hours * 0.03;
  const installed = await adb?.isAppInstalled(HG_PKG);
  if (!installed) return { earnings: 0, error: 'Honeygain not installed', action: 'share_bandwidth' };
  await progress(5, 'Starting Honeygain...');
  await adb.launchApp(HG_PKG); await adb.sleep(5000);
  const checks = Math.floor(hours * 12); // every 5min
  for (let i = 0; i < checks; i++) {
    if (ctx.cancelled()) break;
    await progress(10 + (i/checks)*80, `Sharing... ${Math.floor(i*5)}/${hours*60}min`);
    await adb.wakeScreen().catch(() => {});
    const cur = await adb.getCurrentApp().catch(() => null);
    if (!cur?.package?.includes('honeygain')) await adb.launchApp(HG_PKG).catch(() => {});
    await adb.sleep(300000);
  }
  await adb.stopApp(HG_PKG);
  return { earnings, hours, action: 'share_bandwidth' };
}
module.exports = { share_bandwidth, content_delivery: share_bandwidth, default: share_bandwidth };
