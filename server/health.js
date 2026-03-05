import { ensureMethod, handleApiError, json } from './_lib/http.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);

    return json({
      ok: true,
      service: 'koncept-api',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}
