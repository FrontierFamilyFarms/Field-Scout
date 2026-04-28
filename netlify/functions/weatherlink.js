const crypto = require('crypto');

exports.handler = async (event) => {
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
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ debug: stationData })
      };
    }

    const stationId = stationData.stations[0].station_id;
    const t2 = Math.floor(Date.now() / 1000).toString();
    const dataToSign2 = 'api-key' + API_KEY + 'station-id' + stationId + 't' + t2;
    const sig2 = crypto.createHmac('sha256', API_SECRET).update(dataToSign2).digest('hex');

    const currentRes = await fetch(
      `https://api.weatherlink.com/v2/current/${stationId}?api-key=${API_KEY}&t=${t2}&api-signature=${sig2}`
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
