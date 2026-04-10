const fetch = require('node-fetch');

// ============================================
// CONFIGURATION
// ============================================
const YODECK_TOKEN = 'yodeck:fpmQz4gVo9jEobM79mfomQ2C0a68I3_Lzx79tSrWXjZ-g0xJAQwG3WI8EHB9Xf9f';
const FRAMEN_ORG = 'Org_2E7a3bJRHHf';
const GITHUB_PLAYER_URL = 'https://elyadrian.github.io/framen-player/player.html';

// Add your screens here - one line per screen
// Format: { yodeckId: 'YODECK_SCREEN_ID', framenId: 'FRAMEN_SCREEN_ID', name: 'Screen Name' }
const SCREENS = [
  // Example - replace with real IDs after April 15th call
  // { yodeckId: '12345', framenId: '64d13f7c-00b5-4743-b915-6619834a9e78', name: 'Test Screen' }
];

// How often to show an ad (in minutes)
const AD_INTERVAL_MINUTES = 5;

// How many ads to play per interruption
const ADS_PER_BREAK = 1;
// ============================================

async function getAdFromFramen(framenScreenId) {
  try {
    const url = `https://api.framen.com/v3/vendor/${FRAMEN_ORG}/1/rt_ad/${framenScreenId}`;
    const res = await fetch(url);
    const json = await res.json();
    const data = json.data;
    if (data.ad && data.ad.url) {
      return { url: data.ad.url, pop: data.ad.pop, duration: data.ad.duration };
    } else if (data.news && data.news.url) {
      return { url: data.news.url, pop: data.news.pop, duration: data.news.duration };
    }
    return null;
  } catch (e) {
    console.log('Error fetching Framen ad:', e.message);
    return null;
  }
}

async function takeoverScreen(yodeckScreenId, durationSeconds) {
  try {
    const url = `https://app.yodeck.com/api/v1/screen/${yodeckScreenId}/takeover/`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Token ${YODECK_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        takeover_content: {
          source_id: 31696683,
          source_type: 'media',
          duration: durationSeconds
        },
        use_download_timeslots: false
      })
    });
    const json = await res.json();
    console.log(`Takeover screen ${yodeckScreenId}:`, json.status || json);
    return json.status === 'success';
  } catch (e) {
    console.log('Error taking over screen:', e.message);
    return false;
  }
}

async function firePopUrl(popUrl) {
  if (!popUrl) return;
  try {
    await fetch(popUrl);
  } catch (e) {
    console.log('Error firing pop URL:', e.message);
  }
}

async function runAdBreak(screen) {
  console.log(`\n[${new Date().toISOString()}] Running ad break for: ${screen.name}`);

  for (let i = 0; i < ADS_PER_BREAK; i++) {
    const ad = await getAdFromFramen(screen.framenId);
    if (!ad) {
      console.log('No ad available, skipping break');
      return;
    }

    const durationSeconds = Math.ceil(ad.duration / 1000) + 2;
    console.log(`Playing ad for ${durationSeconds} seconds on ${screen.name}`);

    await takeoverScreen(screen.yodeckId, durationSeconds);
    await firePopUrl(ad.pop);

    // Wait for ad to finish before playing next one
    await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));
  }

  console.log(`Ad break finished for: ${screen.name}`);
}

async function runAllScreens() {
  if (SCREENS.length === 0) {
    console.log('No screens configured yet. Add screens to the SCREENS array in index.js');
    return;
  }
  for (const screen of SCREENS) {
    await runAdBreak(screen);
  }
}

// Run immediately on start, then every X minutes
console.log(`Framen automation started. Running ad breaks every ${AD_INTERVAL_MINUTES} minutes.`);
runAllScreens();
setInterval(runAllScreens, AD_INTERVAL_MINUTES * 60 * 1000);
