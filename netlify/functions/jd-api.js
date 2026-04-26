// Netlify function — proxies all JD API calls to avoid CORS issues
const JD_BASE = 'https://sandboxapi.deere.com/platform';

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

  const { path, method = 'GET', body: requestBody, token } = body;

  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'No token provided' }) };
  }

  if (!path) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No path provided' }) };
  }

  try {
    const url = path.startsWith('http') ? path : `${JD_BASE}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.deere.axiom.v3+json',
        'Content-Type': 'application/json'
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { 
        statusCode: 502, 
        headers, 
        body: JSON.stringify({ error: 'JD API returned non-JSON', raw: text.slice(0, 500), status: response.status }) 
      };
    }

    if (!response.ok) {
      return { 
        statusCode: response.status, 
        headers, 
        body: JSON.stringify({ error: data.message || data.error || 'JD API error', details: data, status: response.status }) 
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Proxy error', message: err.message }) 
    };
  }
};
