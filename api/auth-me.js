import { requireUser } from './_lib/auth.js';
import { ensureMethod, handleApiError, json } from './_lib/http.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);
    const user = await requireUser(request);
    return json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
