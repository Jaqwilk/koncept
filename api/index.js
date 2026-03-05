import adminOverview from '../server/admin-overview.js';
import adminProjects from '../server/admin-projects.js';
import authAcceptInvite from '../server/auth-accept-invite.js';
import authInvite from '../server/auth-invite.js';
import authLogin from '../server/auth-login.js';
import authLogout from '../server/auth-logout.js';
import authMe from '../server/auth-me.js';
import dashboard from '../server/dashboard.js';
import fileDownload from '../server/file-download.js';
import healthDb from '../server/health-db.js';
import health from '../server/health.js';
import notifications from '../server/notifications.js';
import projectApprovals from '../server/project-approvals.js';
import projectBrief from '../server/project-brief.js';
import projectFeedback from '../server/project-feedback.js';
import projectFiles from '../server/project-files.js';
import projectInvoices from '../server/project-invoices.js';
import projectMessages from '../server/project-messages.js';
import projectStages from '../server/project-stages.js';
import projectTasks from '../server/project-tasks.js';
import projectWorkspace from '../server/project-workspace.js';

const ROUTE_HANDLERS = {
  'admin-overview': adminOverview,
  'admin-projects': adminProjects,
  'auth-accept-invite': authAcceptInvite,
  'auth-invite': authInvite,
  'auth-login': authLogin,
  'auth-logout': authLogout,
  'auth-me': authMe,
  dashboard,
  'file-download': fileDownload,
  notifications,
  'project-approvals': projectApprovals,
  'project-brief': projectBrief,
  'project-feedback': projectFeedback,
  'project-files': projectFiles,
  'project-invoices': projectInvoices,
  'project-messages': projectMessages,
  'project-stages': projectStages,
  'project-tasks': projectTasks,
  'project-workspace': projectWorkspace,
  health,
  'health-db': healthDb
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

function sendNodeJson(nodeRes, status, payload) {
  nodeRes.statusCode = status;
  nodeRes.setHeader('content-type', 'application/json; charset=utf-8');
  nodeRes.end(JSON.stringify(payload));
}

export default async function handler(nodeReq, nodeRes) {
  try {
    const request = await toWebRequest(nodeReq);
    const path = extractPath(request.url);

    if (!path) {
      const routes = Object.keys(ROUTE_HANDLERS).sort();
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

    const route = ROUTE_HANDLERS[path] ?? null;

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
  } catch (error) {
    console.error('API bootstrap failure', error);
    try {
      sendNodeJson(nodeRes, 500, {
        error: 'Błąd inicjalizacji API.',
        code: 'API_BOOTSTRAP_FAILED'
      });
    } catch (responseError) {
      nodeRes.statusCode = 500;
      nodeRes.end('API bootstrap failed');
    }
  }
}
