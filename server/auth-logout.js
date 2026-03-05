import { clearSessionCookie } from './_lib/auth.js';
import { ensureMethod, handleApiError, json } from './_lib/http.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    return json(
      { ok: true },
      200,
      {
        'Set-Cookie': clearSessionCookie()
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
