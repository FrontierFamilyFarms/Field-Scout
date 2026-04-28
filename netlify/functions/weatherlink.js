const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const API_KEY = process.env.WEATHERLINK_API_KEY;
  const API_SECRET = process.env.WEATHERLINK_API_SECRET;

  try {
    const t = Math.floor(Date.now() / 1000).toString();
    const dataToSign = 'api-key' + API_KEY + 't' + t;
    const sig = crypto.createHmac('sha256', API_SECRET).update(dataToSign).digest('hex');

    const stationRes = await fetch(
      `https://api.weatherlink.com/v2/stations?api-key=${API_KEY}&t=${t}&api-signature=${sig}`
    );
    const stationData = await stationRes.json();

    if (!stationData.stations || stationData.stations.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ debug: stationData }) };
    }

    const stationId = stationData.stations[0].station_id;
    const t2 = Math.floor(Date.now() / 1000).toString();
    const dataToSign2 = 'api-key' + API_KEY + 'station-id' + stationId + 't' + t2;
    const sig2 = crypto.createHmac('sha256', API_SECRET).update(dataToSign2).digest('hex');

    const currentRes = await fetch(
      `https://api.weatherlink.com/v2/current/${stationId}?api-key=${API_KEY}&t=${t2}&api-signature=${sig2}`
    );
    const currentData = await currentRes.json();

    // Extract ts from the main weather sensor and return it alongside data
    let dataTs = null;
    if (currentData.sensors) {
      for (const s of currentData.sensors) {
        for (const r of (s.data || [])) {
          if (r.ts && dataTs == null) dataTs = r.ts;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...currentData, _dataTs: dataTs, _fetchedAt: Math.floor(Date.now()/1000) })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
