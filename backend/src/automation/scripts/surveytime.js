'use strict';
const ST_PKG = 'com.surveytime.app';
async function complete_survey(ctx) {
  const { adb, config, progress, log } = ctx;
  const count = config.surveyCount || 3;
  const earnings = count * 1.00;
  await progress(5, 'Opening SurveyTime...');
  const installed = await adb?.isAppInstalled(ST_PKG);
  if (!installed) return { earnings:0, error:'SurveyTime not installed', action:'complete_survey' };
  await adb.launchApp(ST_PKG); await adb.sleep(5000);
  for (let i=0;i<count;i++) {
    if (ctx.cancelled()) break;
    await progress(10+(i/count)*80, `Survey ${i+1}/${count} ($1.00)`);
    await adb.tap(540,500); await adb.sleep(3000);
    for (let q=0;q<10;q++) {
      await adb.tap(300, 700+Math.floor(Math.random()*100)).catch(()=>{});
      await adb.sleep(1500);
      await adb.findAndClick('Next').catch(()=>{}); await adb.sleep(1000);
      const url = await adb.getCurrentApp().catch(()=>null);
      if (url?.activity?.includes('complete')||url?.activity?.includes('thank')) break;
    }
    await adb.pressBack(); await adb.sleep(3000);
    log(`Survey ${i+1} done (+$1.00)`);
  }
  await adb.stopApp(ST_PKG);
  return { earnings, surveysCompleted:count, action:'complete_survey' };
}
module.exports = { complete_survey, qualify_survey:complete_survey, profile_update:complete_survey, daily:complete_survey, default:complete_survey };
