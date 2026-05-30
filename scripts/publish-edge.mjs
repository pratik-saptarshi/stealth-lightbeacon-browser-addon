import { readFileSync } from 'node:fs';

function getRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function getEdgeAccessToken() {
  const tenantId = process.env.EDGE_TENANT_ID ?? 'common';
  const clientId = getRequired('EDGE_CLIENT_ID');
  const clientSecret = getRequired('EDGE_CLIENT_SECRET');
  const tokenUrl = process.env.EDGE_TOKEN_URL ?? `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const scope = process.env.EDGE_SCOPE ?? 'https://api.addons.microsoftedge.microsoft.com/.default';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
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

async function pollOperation(operationUrl, headers, timeoutMs = 300000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(operationUrl, { headers });
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

async function main() {
  const productId = getRequired('EDGE_PRODUCT_ID');
  const baseApi = process.env.EDGE_API_BASE ?? 'https://api.addons.microsoftedge.microsoft.com';
  const zipPath = process.env.EDGE_ZIP_PATH ?? 'artifacts/addon-store.zip';
  const publishNotes = process.env.EDGE_PUBLISH_NOTES ?? `Automated publish from ${process.env.GITHUB_SHA ?? 'local'}`;

  const token = await getEdgeAccessToken();
  const headers = {
    authorization: `Bearer ${token}`
  };

  const uploadRes = await fetch(`${baseApi}/v1/products/${productId}/submissions/draft/package`, {
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
  await pollOperation(uploadOperation, headers);

  const publishRes = await fetch(`${baseApi}/v1/products/${productId}/submissions`, {
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
  const finalStatus = await pollOperation(publishOperation, headers);
  console.log('[publish:edge] publish accepted');
  console.log(JSON.stringify(finalStatus, null, 2));
}

await main();
