import { readFileSync } from 'node:fs';

function getRequired(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// The Edge Add-ons Update API v1.1 uses an API key and Client ID in the
// request headers. The v1 bearer-token flow ended on 2024-12-31.
export function getEdgeAuthHeaders(env = process.env) {
  return {
    authorization: `ApiKey ${getRequired('EDGE_API_KEY', env)}`,
    'x-clientid': getRequired('EDGE_CLIENT_ID', env)
  };
}

function operationIdFromLocation(location) {
  const trimmed = String(location).replace(/\/+$/, '');
  const operationId = trimmed.split('/').pop();
  if (!operationId) {
    throw new Error('Edge operation location has no operation ID.');
  }
  return operationId;
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

  const headers = getEdgeAuthHeaders(env);

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
  const uploadLocation = uploadRes.headers.get('location');
  if (!uploadLocation) {
    throw new Error('Edge upload did not return operation location header.');
  }
  const uploadOperationId = operationIdFromLocation(uploadLocation);
  await pollOperation(
    `${baseApi}/v1/products/${productId}/submissions/draft/package/operations/${uploadOperationId}`,
    headers,
    fetchImpl
  );

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

  const publishLocation = publishRes.headers.get('location');
  if (!publishLocation) {
    throw new Error('Edge publish did not return operation location header.');
  }
  const publishOperationId = operationIdFromLocation(publishLocation);
  const finalStatus = await pollOperation(
    `${baseApi}/v1/products/${productId}/submissions/operations/${publishOperationId}`,
    headers,
    fetchImpl
  );
  console.log('[publish:edge] publish accepted');
  console.log(JSON.stringify(finalStatus, null, 2));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await publishEdge();
}
