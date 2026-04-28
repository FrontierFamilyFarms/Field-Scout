const crypto = require('crypto');

exports.handler = async (event) => {
  const API_KEY = process.env.WEATHERLINK_API_KEY;
const API_SECRET = process.env.WEATHERLINK_API_SECRET;
  
  try {
    // Step 1: get station ID
    const t = Math.floor(Date.now() / 1000).toString();
    const stationParams = { t };
    const stationSig = generateHMAC(API_KEY, API_SECRET, stationParams);
    const stationRes = await fetch(
      `https://api.weatherlink.com/v2/stations?api-key=${API_KEY}&t=${t}&api-signature=${stationSig}`
    );
    const stationData = await stationRes.json();
    const stationId = stationData.stations[0].station_id;

    // Step 2: get current conditions
    const t2 = Math.floor(Date.now() / 1000).toString();
    const currentParams = { t: t2 };
    const currentSig = generateHMAC(API_KEY, API_SECRET, currentParams);
    const currentRes = await fetch(
      `https://api.weatherlink.com/v2/current/${stationId}?api-key=${API_KEY}&t=${t2}&api-signature=${currentSig}`
    );
    const currentData = await currentRes.json();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(currentData),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function generateHMAC(apiKey, apiSecret, params) {
  const sorted = Object.keys(params).sort().map(k => k + params[k]).join('');
  const msg = apiKey + sorted + apiSecret;
  return crypto.createHmac('sha256', apiSecret).update(msg).digest('hex');
}
