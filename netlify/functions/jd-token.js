// Netlify serverless function — handles John Deere OAuth token exchange
// Keeps JD_CLIENT_SECRET off the frontend entirely

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { code, grant_type, refresh_token, code_verifier } = body;
  const CLIENT_ID = process.env.JD_CLIENT_ID;
  const CLIENT_SECRET = process.env.JD_CLIENT_SECRET;
  const REDIRECT_URI = 'https://willowy-faloodeh-897608.netlify.app/callback';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server config error — credentials not set' }) };
  }

  try {
    let tokenBody;
    if (grant_type === 'refresh_token') {
      tokenBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        redirect_uri: REDIRECT_URI
      });
    } else {
      tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        ...(code_verifier ? { code_verifier } : {})
      });
    }

    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token', {
      // Note: same endpoint for both sandbox and production
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenBody.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error_description || 'Token exchange failed', details: data }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token exchange failed', message: err.message }) };
  }
};
