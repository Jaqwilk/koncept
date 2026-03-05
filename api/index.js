const ROUTE_MODULES = {
  'admin-overview': '../server/admin-overview.js',
  'admin-projects': '../server/admin-projects.js',
  'auth-accept-invite': '../server/auth-accept-invite.js',
  'auth-invite': '../server/auth-invite.js',
  'auth-login': '../server/auth-login.js',
  'auth-logout': '../server/auth-logout.js',
  'auth-me': '../server/auth-me.js',
  dashboard: '../server/dashboard.js',
  'file-download': '../server/file-download.js',
  notifications: '../server/notifications.js',
  'project-approvals': '../server/project-approvals.js',
  'project-brief': '../server/project-brief.js',
  'project-feedback': '../server/project-feedback.js',
  'project-files': '../server/project-files.js',
  'project-invoices': '../server/project-invoices.js',
  'project-messages': '../server/project-messages.js',
  'project-stages': '../server/project-stages.js',
  'project-tasks': '../server/project-tasks.js',
  'project-workspace': '../server/project-workspace.js',
  health: '../server/health.js',
  'health-db': '../server/health-db.js'
};

const NO_BODY_METHODS = new Set(['GET', 'HEAD']);

function extractPath(requestUrl) {
  const url = new URL(requestUrl);
  const fromQuery = url.searchParams.get('path') || url.searchParams.get('route');
  if (fromQuery) {
    return fromQuery.replace(/^\/+|\/+$/g, '');
  }

  const pathname = (url.pathname || '').replace(/^\/+|\/+$/g, '');
  if (pathname === 'api') return '';
  if (pathname.startsWith('api/')) return pathname.slice(4);
  return pathname;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}

function getHeaderValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') return [value];
  return [];
}

async function readNodeBody(nodeReq) {
  const chunks = [];
  for await (const chunk of nodeReq) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return undefined;
  return Buffer.concat(chunks);
}

async function toWebRequest(nodeReq) {
  const method = String(nodeReq.method || 'GET').toUpperCase();
  const protocol = nodeReq.headers['x-forwarded-proto'] || 'https';
  const host = nodeReq.headers['x-forwarded-host'] || nodeReq.headers.host || 'localhost';
  const url = new URL(nodeReq.url || '/', `${protocol}://${host}`);

  const headers = new Headers();
  Object.entries(nodeReq.headers || {}).forEach(([key, value]) => {
    getHeaderValues(value).forEach((item) => headers.append(key, item));
  });

  if (NO_BODY_METHODS.has(method)) {
    return new Request(url, { method, headers });
  }

  const body = await readNodeBody(nodeReq);
  return new Request(url, {
    method,
    headers,
    body
  });
}

async function sendWebResponse(nodeRes, webResponse) {
  nodeRes.statusCode = webResponse.status;

  const setCookie = typeof webResponse.headers.getSetCookie === 'function' ? webResponse.headers.getSetCookie() : [];
  const legacySetCookie = webResponse.headers.get('set-cookie');

  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    nodeRes.setHeader(key, value);
  });

  if (setCookie.length) {
    nodeRes.setHeader('set-cookie', setCookie);
  } else if (legacySetCookie) {
    nodeRes.setHeader('set-cookie', legacySetCookie);
  }

  const payload = Buffer.from(await webResponse.arrayBuffer());
  nodeRes.end(payload);
}

async function loadRoute(path) {
  const modulePath = ROUTE_MODULES[path];
  if (!modulePath) return null;
  const mod = await import(modulePath);
  return mod.default;
}

export default async function handler(nodeReq, nodeRes) {
  const request = await toWebRequest(nodeReq);
  const path = extractPath(request.url);

  if (!path) {
    const routes = Object.keys(ROUTE_MODULES).sort();
    await sendWebResponse(
      nodeRes,
      json(
        {
          ok: true,
          message: 'Koncept API router online.',
          routes
        },
        200
      )
    );
    return;
  }

  let route;
  try {
    route = await loadRoute(path);
  } catch (error) {
    console.error('API route import failure', { path, error });
    await sendWebResponse(
      nodeRes,
      json(
        {
          error: 'Nie udało się załadować modułu endpointu.',
          code: 'ROUTE_IMPORT_FAILED',
          route: path
        },
        500
      )
    );
    return;
  }

  if (!route) {
    await sendWebResponse(
      nodeRes,
      json(
        {
          error: `Nieznany endpoint API: ${path}`,
          code: 'ROUTE_NOT_FOUND',
          route: path
        },
        404
      )
    );
    return;
  }

  try {
    const response = await route(request);
    if (!(response instanceof Response)) {
      await sendWebResponse(
        nodeRes,
        json(
          {
            error: 'Endpoint zwrócił nieprawidłowy typ odpowiedzi.',
            code: 'INVALID_HANDLER_RESPONSE',
            route: path
          },
          500
        )
      );
      return;
    }

    await sendWebResponse(nodeRes, response);
  } catch (error) {
    console.error('API route execution failure', { path, error });
    await sendWebResponse(
      nodeRes,
      json(
        {
          error: 'Błąd wykonania endpointu.',
          code: 'ROUTE_EXECUTION_FAILED',
          route: path
        },
        500
      )
    );
  }
}
