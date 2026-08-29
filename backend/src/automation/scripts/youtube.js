'use strict';
// ════════════════════════════════════════════
//  youtube.js
// ════════════════════════════════════════════
const YT_PKG = 'com.google.android.youtube';

async function watch_video(ctx) {
  const { adb, config, progress, log } = ctx;
  const duration = config.videoDuration || 300;
  const earnings = 0.00004 * (duration / 60);
  log(`YouTube: watching for ${duration}s`);
  await progress(5, 'Opening YouTube...');
  await adb.launchApp(YT_PKG); await adb.sleep(4000);
  await adb.pressBack().catch(() => {}); await adb.sleep(1000);
  await progress(15, 'Searching...');
  await adb.tap(580, 65); await adb.sleep(1500);
  await adb.typeText(config.searchQuery || 'free music no copyright');
  await adb.pressEnter(); await adb.sleep(3000);
  await progress(25, 'Playing video...');
  await adb.tap(540, 320); await adb.sleep(3000);
  // Skip ad
  await adb.sleep(5500); await adb.tap(918, 1730).catch(() => {});
  // Watch loop
  const end = Date.now() + duration * 1000;
  while (Date.now() < end) {
    if (ctx.cancelled()) break;
    const elapsed = (end - Date.now()) / 1000;
    const pct = Math.min(95, 30 + (1 - elapsed/duration) * 60);
    await progress(pct, `Watching... ${Math.floor(duration - elapsed)}s left`);
    if (Math.random() < 0.05) { await adb.tap(540, 960).catch(() => {}); await adb.sleep(500); await adb.tap(540, 960).catch(() => {}); }
    await adb.wakeScreen().catch(() => {});
    await adb.sleep(10000);
  }
  if (config.autoLike) { await adb.tap(85, 1700).catch(() => {}); await adb.sleep(1000); }
  await adb.stopApp(YT_PKG);
  return { earnings, duration, action: 'watch_video' };
}

async function watch_ad(ctx) {
  const { adb, config, progress } = ctx;
  const count = config.adCount || 5;
  const earnings = 0.0002 * count;
  for (let i = 0; i < count; i++) {
    if (ctx.cancelled()) break;
    await progress(10 + (i/count)*80, `Ad ${i+1}/${count}`);
    await adb.launchApp(YT_PKG); await adb.sleep(3000);
    await adb.tap(540, 320); await adb.sleep(20000);
    await adb.tap(918, 1730).catch(() => {}); await adb.sleep(2000);
    await adb.stopApp(YT_PKG); await adb.sleep(1000);
  }
  return { earnings, adCount: count, action: 'watch_ad' };
}

module.exports = { watch_video, watch_ad, subscribe: watch_video, default: watch_video };
