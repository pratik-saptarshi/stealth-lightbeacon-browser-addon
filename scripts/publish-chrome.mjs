function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export async function fetchAccessToken(env = process.env, fetchImpl = fetch) {
  const payload = new URLSearchParams({
    client_id: requireEnv('CWS_CLIENT_ID', env),
    client_secret: requireEnv('CWS_CLIENT_SECRET', env),
    refresh_token: requireEnv('CWS_REFRESH_TOKEN', env),
    grant_type: 'refresh_token'
  });

  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
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

export async function publishChrome(env = process.env, fetchImpl = fetch) {
  const publisherId = requireEnv('CWS_PUBLISHER_ID', env);
  const extensionId = requireEnv('CWS_EXTENSION_ID', env);
  const zipPath = env.CWS_ZIP_PATH ?? 'artifacts/addon-store.zip';
  const zipBuffer = await import('node:fs').then(({ readFileSync }) => readFileSync(zipPath));

  const token = await fetchAccessToken(env, fetchImpl);
  const resourceName = `publishers/${publisherId}/items/${extensionId}`;
  const authHeaders = { authorization: `Bearer ${token}` };

  const uploadRes = await fetchImpl(`https://chromewebstore.googleapis.com/upload/v2/${resourceName}:upload`, {
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

  const publishRes = await fetchImpl(`https://chromewebstore.googleapis.com/v2/${resourceName}:publish`, {
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

  const statusRes = await fetchImpl(`https://chromewebstore.googleapis.com/v2/${resourceName}:fetchStatus`, {
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

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await publishChrome();
}
