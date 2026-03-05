import { requireUser } from './_lib/auth.js';
import { getDashboardData } from './_lib/project-queries.js';
import { ensureMethod, handleApiError, json } from './_lib/http.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);
    const user = await requireUser(request);
    const data = await getDashboardData(user);
    return json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
