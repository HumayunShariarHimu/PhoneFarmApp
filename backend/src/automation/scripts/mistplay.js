'use strict';
const PKG = 'com.mistplay.mistplay';
async function play_game(ctx) {
  const { adb, config, progress, log } = ctx;
  const dur = config.gameDuration || 1800;
  const earnings = (dur/3600)*0.10;
  const installed = await adb?.isAppInstalled(PKG);
  if (!installed) return { earnings:0, error:'Mistplay not installed', action:'play_game' };
  await progress(5,'Opening Mistplay...'); await adb.launchApp(PKG); await adb.sleep(5000);
  await adb.tap(200,400); await adb.sleep(4000);
  await adb.tap(540,900); await adb.sleep(5000);
  const chunks = Math.floor(dur/30);
  for (let i=0;i<chunks;i++) {
    if (ctx.cancelled()) break;
    await progress(15+(i/chunks)*75,`Playing ${i*30}/${dur}s`);
    await adb.tap(200+Math.floor(Math.random()*700), 400+Math.floor(Math.random()*800)).catch(()=>{});
    await adb.sleep(30000);
  }
  await adb.stopApp(PKG);
  return { earnings, gameDuration:dur, action:'play_game' };
}
async function daily_login(ctx) {
  const { adb, progress } = ctx;
  await progress(10,'Daily login...'); await adb?.launchApp(PKG); await adb?.sleep(5000);
  await adb?.findAndClick('Claim').catch(()=>{}); await adb?.sleep(2000); await adb?.stopApp(PKG);
  return { earnings:0.001, action:'daily_login' };
}
module.exports = { play_game, daily_login, level_up:play_game, default:play_game };
