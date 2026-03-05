import { requireUser } from './_lib/auth.js';
import { getSearchParam, ensureMethod, handleApiError, json, ApiError } from './_lib/http.js';
import { getProjectWorkspace } from './_lib/project-queries.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);
    const user = await requireUser(request);
    const projectId = getSearchParam(request, 'projectId');
    if (!projectId) throw new ApiError(400, 'Brakuje projectId.');

    const project = await getProjectWorkspace(user, projectId);
    if (!project) {
      throw new ApiError(404, 'Nie znaleziono projektu.');
    }

    return json({
      viewer: {
        id: user.id,
        role: user.role,
        name: user.name
      },
      project
    });
  } catch (error) {
    return handleApiError(error);
  }
}
