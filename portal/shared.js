const roleLabels = {
  ADMIN: 'Admin',
  TEAM_MEMBER: 'Zespół',
  CLIENT: 'Klient'
};

const statusClassMap = {
  WAITING_FOR_MATERIALS: 'portal-badge--warning',
  DESIGN_PHASE: 'portal-badge--accent',
  DEVELOPMENT_PHASE: 'portal-badge--accent',
  REVIEW_PHASE: 'portal-badge--warning',
  COMPLETED: 'portal-badge--success',
  ACTIVE: 'portal-badge--accent',
  PENDING: 'portal-badge--neutral',
  BLOCKED: 'portal-badge--warning',
  OPEN: 'portal-badge--warning',
  IN_PROGRESS: 'portal-badge--accent',
  RESOLVED: 'portal-badge--success',
  APPROVED: 'portal-badge--success',
  REJECTED: 'portal-badge--warning',
  ISSUED: 'portal-badge--accent',
  PAID: 'portal-badge--success',
  OVERDUE: 'portal-badge--warning'
};

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error || 'Wystąpił błąd podczas komunikacji z API.';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function requirePortalUser({ redirectTo = '/portal/login/' } = {}) {
  try {
    const payload = await apiFetch('/api/auth-me', { method: 'GET' });
    return payload.user;
  } catch (error) {
    if (error.status === 401) {
      window.location.href = redirectTo;
      return null;
    }
    throw error;
  }
}

export async function logout() {
  await apiFetch('/api/auth-logout', {
    method: 'POST'
  });
  window.location.href = '/portal/login/';
}

export function formatDate(value) {
  if (!value) return 'Brak daty';
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function formatShortDate(value) {
  if (!value) return 'Brak daty';
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function formatCurrency(cents, currency = 'PLN') {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency
  }).format(amount);
}

export function renderBadge(label, status, fallbackClass = 'portal-badge--neutral') {
  const className = statusClassMap[status] || fallbackClass;
  return `<span class="portal-badge ${className}">${escapeHtml(label)}</span>`;
}

export function setFlash(element, message, type = 'success') {
  if (!element) return;
  element.textContent = message;
  element.className = `portal-flash portal-flash--${type} is-visible`;
}

export function clearFlash(element) {
  if (!element) return;
  element.textContent = '';
  element.className = 'portal-flash';
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function getProjectIdFromUrl() {
  return new URL(window.location.href).searchParams.get('id');
}

export function bindSidebarToggle() {
  const button = qs('[data-portal-menu-toggle]');
  const sidebar = qs('.portal-sidebar');
  if (!button || !sidebar) return;

  button.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(isOpen));
  });

  qsa('.portal-nav__link', sidebar).forEach((link) => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
    });
  });
}

export function hydrateUserShell(user) {
  qsa('[data-user-name]').forEach((element) => {
    element.textContent = user.name;
  });
  qsa('[data-user-role]').forEach((element) => {
    element.textContent = roleLabels[user.role] || user.role;
  });
  qsa('[data-admin-only]').forEach((element) => {
    element.hidden = user.role !== 'ADMIN' && user.role !== 'TEAM_MEMBER';
  });
}

export function bindLogoutButtons() {
  qsa('[data-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      logout().catch((error) => {
        console.error(error);
      });
    });
  });
}

export function bindTabs() {
  const tabs = qsa('[data-tab]');
  if (!tabs.length) return;

  function activate(target) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === target;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    qsa('[data-tab-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.tabPanel === target);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.tab));
  });

  const hash = window.location.hash.replace('#', '');
  if (hash) {
    activate(hash);
  }
}

export function statusLabel(value) {
  return (
    {
      WAITING_FOR_MATERIALS: 'Oczekiwanie na materiały',
      DESIGN_PHASE: 'Faza projektowa',
      DEVELOPMENT_PHASE: 'Development',
      REVIEW_PHASE: 'Review',
      COMPLETED: 'Zakończony',
      PENDING: 'Oczekuje',
      ACTIVE: 'Aktywny',
      BLOCKED: 'Zablokowany',
      OPEN: 'Otwarte',
      IN_PROGRESS: 'W trakcie',
      RESOLVED: 'Rozwiązane',
      APPROVED: 'Zaakceptowane',
      REJECTED: 'Odrzucone',
      DRAFT: 'Szkic',
      ISSUED: 'Wystawiona',
      PAID: 'Opłacona',
      OVERDUE: 'Po terminie',
      CANCELLED: 'Anulowana'
    }[value] || value
  );
}

export function renderProjectLink(projectId, text = 'Otwórz projekt') {
  return `<a href="/portal/project/?id=${encodeURIComponent(projectId)}" class="btn btn--secondary">${escapeHtml(text)}</a>`;
}

export function createListMarkup(items, renderer, emptyText = 'Brak danych.') {
  if (!items?.length) {
    return `<p class="portal-empty">${escapeHtml(emptyText)}</p>`;
  }
  return items.map(renderer).join('');
}
