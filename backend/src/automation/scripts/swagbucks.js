'use strict';
// swagbucks.js
const SB_PKG = 'com.prodege.swagbucks';

async function watch_sbtv(ctx) {
  const { adb, config, progress, log } = ctx;
  const count = config.videoCount || 10;
  const earnings = count * 2 * 0.01;
  log(`Swagbucks SBTV: watching ${count} videos`);
  await progress(5, 'Opening Swagbucks...');
  const installed = await adb.isAppInstalled(SB_PKG);
  if (!installed) return { earnings: 0, error: 'Swagbucks app not installed', action: 'watch_sbtv' };
  await adb.launchApp(SB_PKG); await adb.sleep(5000);
  await adb.tap(540, 1800); await adb.sleep(2000); // Watch tab
  for (let i = 0; i < count; i++) {
    if (ctx.cancelled()) break;
    await progress(10 + (i/count)*80, `Video ${i+1}/${count}`);
    await adb.tap(540, 450); await adb.sleep(2500);
    await adb.sleep(45000 + Math.floor(Math.random()*10000));
    await adb.pressBack(); await adb.sleep(2000);
    log(`Video ${i+1} done (+2 SB)`);
  }
  await adb.stopApp(SB_PKG);
  return { earnings, videosWatched: count, sbEarned: count * 2, action: 'watch_sbtv' };
}

async function complete_survey(ctx) {
  const { adb, progress, config, log } = ctx;
  const count = config.surveyCount || 3;
  const earnings = count * 0.25;
  await progress(5, 'Opening Swagbucks surveys...');
  await adb.launchApp(SB_PKG); await adb.sleep(5000);
  await adb.tap(540, 1750); await adb.sleep(2000); // Surveys tab
  for (let i = 0; i < count; i++) {
    if (ctx.cancelled()) break;
    await progress(10 + (i/count)*80, `Survey ${i+1}/${count}`);
    await adb.tap(540, 400); await adb.sleep(3000);
    // Answer questions
    for (let q = 0; q < 8; q++) {
      await adb.tap(300, 600 + Math.floor(Math.random()*200)).catch(() => {});
      await adb.sleep(1000);
      await adb.tap(540, 1800).catch(() => {}); // Next
      await adb.sleep(1500);
    }
    await adb.pressBack(); await adb.sleep(2000);
    log(`Survey ${i+1} completed`);
  }
  await adb.stopApp(SB_PKG);
  return { earnings, surveysCompleted: count, action: 'complete_survey' };
}

async function daily_search(ctx) {
  const { adb, config, progress, log } = ctx;
  const count = config.searchCount || 30;
  const earnings = count * 0.001;
  const terms = ['best restaurants','weather today','tech news','stock market','online shopping deals','fitness tips','travel destinations','movie reviews','book recommendations','recipes'];
  await adb.launchApp(SB_PKG); await adb.sleep(4000);
  for (let i = 0; i < count; i++) {
    if (ctx.cancelled()) break;
    await progress(5 + (i/count)*90, `Search ${i+1}/${count}`);
    await adb.tap(540, 100); await adb.sleep(1000);
    await adb.typeText(terms[i % terms.length] + ' ' + Math.floor(Math.random()*100));
    await adb.pressEnter(); await adb.sleep(3000 + Math.random()*2000);
    log(`Search ${i+1} done`);
  }
  await adb.stopApp(SB_PKG);
  return { earnings, searchesCompleted: count, action: 'daily_search' };
}

module.exports = { watch_sbtv, complete_survey, daily_search, default: watch_sbtv };
