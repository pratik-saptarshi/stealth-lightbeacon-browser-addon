async function fetchAccessToken() {
  const clientId = process.env.CWS_CLIENT_ID;
  const clientSecret = process.env.CWS_CLIENT_SECRET;
  const refreshToken = process.env.CWS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing required Chrome OAuth credentials.');
  }

  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  });
  if (!response.ok) {
    throw new Error(`Failed to get Google access token: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new Error('OAuth response missing access_token.');
  }
  return json.access_token;
}

async function main() {
  const publisherId = process.env.CWS_PUBLISHER_ID;
  const extensionId = process.env.CWS_EXTENSION_ID;
  const zipPath = process.env.CWS_ZIP_PATH ?? 'artifacts/addon-store.zip';
  const zipBuffer = await import('node:fs').then(({ readFileSync }) => readFileSync(zipPath));

  if (!publisherId || !extensionId) {
    throw new Error('Missing CWS_PUBLISHER_ID or CWS_EXTENSION_ID.');
  }

  const token = await fetchAccessToken();
  const resourceName = `publishers/${publisherId}/items/${extensionId}`;
  const authHeaders = { authorization: `Bearer ${token}` };

  const uploadRes = await fetch(`https://chromewebstore.googleapis.com/upload/v2/${resourceName}:upload`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/zip'
    },
    body: zipBuffer
  });
  if (!uploadRes.ok) {
    throw new Error(`Chrome upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const publishRes = await fetch(`https://chromewebstore.googleapis.com/v2/${resourceName}:publish`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' })
  });
  if (!publishRes.ok) {
    throw new Error(`Chrome publish failed: ${publishRes.status} ${await publishRes.text()}`);
  }

  const statusRes = await fetch(`https://chromewebstore.googleapis.com/v2/${resourceName}:fetchStatus`, {
    method: 'GET',
    headers: authHeaders
  });
  if (!statusRes.ok) {
    throw new Error(`Chrome status fetch failed: ${statusRes.status} ${await statusRes.text()}`);
  }

  const status = await statusRes.json();
  console.log('[publish:chrome] publish accepted');
  console.log(JSON.stringify(status, null, 2));
}

await main();
