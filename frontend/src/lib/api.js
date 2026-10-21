const BASE = import.meta.env.VITE_API_BASE || '';

async function handleResponse(res) {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch {
      // response body wasn't JSON — fall back to the generic message
    }
    throw new Error(message);
  }
  return res.json();
}

export function apiGet(path) {
  return fetch(`${BASE}${path}`).then(handleResponse);
}

export function apiPost(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handleResponse);
}

export function apiPatch(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handleResponse);
}
