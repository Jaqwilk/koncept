export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}

export async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(400, 'Nieprawidłowy format danych.');
  }
  return request.json();
}

export function ensureMethod(request, allowedMethods) {
  if (!allowedMethods.includes(request.method)) {
    throw new ApiError(405, `Metoda ${request.method} nie jest obsługiwana.`);
  }
}

export function handleApiError(error) {
  if (error instanceof ApiError) {
    return json({ error: error.message, details: error.details }, error.status);
  }

  console.error(error);
  return json({ error: 'Wystąpił nieoczekiwany błąd serwera.' }, 500);
}

export function getSearchParam(request, key) {
  return new URL(request.url).searchParams.get(key);
}

export function parseCookies(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.split(';').reduce((acc, item) => {
    const [rawKey, ...rest] = item.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

export function serializeCookie(name, value, options = {}) {
  const {
    maxAge,
    expires,
    path = '/',
    httpOnly = true,
    secure = true,
    sameSite = 'Lax'
  } = options;

  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (typeof maxAge === 'number') parts.push(`Max-Age=${maxAge}`);
  if (expires instanceof Date) parts.push(`Expires=${expires.toUTCString()}`);
  if (path) parts.push(`Path=${path}`);
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (sameSite) parts.push(`SameSite=${sameSite}`);

  return parts.join('; ');
}
