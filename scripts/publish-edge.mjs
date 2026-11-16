import { readFileSync } from 'node:fs';

function getRequired(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export async function getEdgeAccessToken(env = process.env, fetchImpl = fetch) {
  const tenantId = env.EDGE_TENANT_ID ?? 'common';
  const tokenUrl = env.EDGE_TOKEN_URL ?? `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const scope = env.EDGE_SCOPE ?? 'https://api.addons.microsoftedge.microsoft.com/.default';

  const body = new URLSearchParams({
    client_id: getRequired('EDGE_CLIENT_ID', env),
    client_secret: getRequired('EDGE_CLIENT_SECRET', env),
    scope,
    grant_type: 'client_credentials'
  });

  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(`Edge token fetch failed: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new Error('Edge token response missing access_token.');
  }

  return json.access_token;
}

export async function pollOperation(operationUrl, headers, fetchImpl = fetch, timeoutMs = 300000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetchImpl(operationUrl, { headers });
    if (!res.ok) {
      throw new Error(`Edge operation poll failed: ${res.status} ${await res.text()}`);
    }
    const payload = await res.json();
    const status = String(payload.status ?? '').toLowerCase();
    if (status === 'succeeded' || status === 'success') {
      return payload;
    }
    if (status === 'failed' || status === 'failure') {
      throw new Error(`Edge operation failed: ${JSON.stringify(payload)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Edge operation timed out after ${timeoutMs}ms`);
}

export async function publishEdge(env = process.env, fetchImpl = fetch) {
  const productId = getRequired('EDGE_PRODUCT_ID', env);
  const baseApi = env.EDGE_API_BASE ?? 'https://api.addons.microsoftedge.microsoft.com';
  const zipPath = env.EDGE_ZIP_PATH ?? 'artifacts/addon-store.zip';
  const publishNotes = env.EDGE_PUBLISH_NOTES ?? `Automated publish from ${env.GITHUB_SHA ?? 'local'}`;

  const token = await getEdgeAccessToken(env, fetchImpl);
  const headers = {
    authorization: `Bearer ${token}`
  };

  const uploadRes = await fetchImpl(`${baseApi}/v1/products/${productId}/submissions/draft/package`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/zip'
    },
    body: readFileSync(zipPath)
  });
  if (!uploadRes.ok) {
    throw new Error(`Edge upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }
  const uploadOperation = uploadRes.headers.get('location');
  if (!uploadOperation) {
    throw new Error('Edge upload did not return operation location header.');
  }
  await pollOperation(uploadOperation, headers, fetchImpl);

  const publishRes = await fetchImpl(`${baseApi}/v1/products/${productId}/submissions`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ notes: publishNotes })
  });
  if (!publishRes.ok) {
    throw new Error(`Edge publish trigger failed: ${publishRes.status} ${await publishRes.text()}`);
  }

  const publishOperation = publishRes.headers.get('location');
  if (!publishOperation) {
    throw new Error('Edge publish did not return operation location header.');
  }
  const finalStatus = await pollOperation(publishOperation, headers, fetchImpl);
  console.log('[publish:edge] publish accepted');
  console.log(JSON.stringify(finalStatus, null, 2));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await publishEdge();
}
