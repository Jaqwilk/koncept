import adminOverview from '../server/admin-overview.js';
import adminProjects from '../server/admin-projects.js';
import authAcceptInvite from '../server/auth-accept-invite.js';
import authInvite from '../server/auth-invite.js';
import authLogin from '../server/auth-login.js';
import authLogout from '../server/auth-logout.js';
import authMe from '../server/auth-me.js';
import dashboard from '../server/dashboard.js';
import fileDownload from '../server/file-download.js';
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

const ROUTES = {
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
  'project-workspace': projectWorkspace
};

function extractPath(request) {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('path');
  if (fromQuery) {
    return fromQuery.replace(/^\/+|\/+$/g, '');
  }

  const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
  if (pathname === 'api') return '';
  if (pathname.startsWith('api/')) return pathname.slice(4);
  return pathname;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

export default async function handler(request) {
  const path = extractPath(request);
  const route = ROUTES[path];

  if (!route) {
    return json({ error: `Nieznany endpoint API: ${path || '(brak)'}` }, 404);
  }

  return route(request);
}
