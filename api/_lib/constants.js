export const SESSION_COOKIE = 'koncept_portal_session';
export const INVITE_TTL_HOURS = 72;
export const DEFAULT_MAX_UPLOAD_MB = Number.parseInt(process.env.MAX_UPLOAD_MB || '25', 10);
export const DEFAULT_THREAD_TITLE = 'Główny wątek projektu';

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  TEAM_MEMBER: 'Zespół',
  CLIENT: 'Klient'
};

export const PROJECT_STATUS_LABELS = {
  WAITING_FOR_MATERIALS: 'Oczekiwanie na materiały',
  DESIGN_PHASE: 'Faza projektowa',
  DEVELOPMENT_PHASE: 'Development',
  REVIEW_PHASE: 'Review',
  COMPLETED: 'Zakończony'
};

export const WORKFLOW_STATUS_LABELS = {
  PENDING: 'Oczekuje',
  ACTIVE: 'Aktywny',
  COMPLETED: 'Ukończony',
  BLOCKED: 'Zablokowany'
};

export const FEEDBACK_STATUS_LABELS = {
  OPEN: 'Otwarte',
  IN_PROGRESS: 'W trakcie',
  RESOLVED: 'Rozwiązane'
};

export const APPROVAL_STATUS_LABELS = {
  PENDING: 'Wymaga akceptacji',
  APPROVED: 'Zaakceptowane',
  REJECTED: 'Odrzucone'
};

export const INVOICE_STATUS_LABELS = {
  DRAFT: 'Szkic',
  ISSUED: 'Wystawiona',
  PAID: 'Opłacona',
  OVERDUE: 'Po terminie',
  CANCELLED: 'Anulowana'
};
