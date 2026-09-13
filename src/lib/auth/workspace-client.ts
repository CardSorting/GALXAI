export const WORKSPACE_SESSION_REJECTED = 'galx:workspace-session-rejected';

/** Client UX only; every endpoint still authenticates independently on the server. */
export async function workspaceFetch(owner: string | null, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && owner && !init?.signal?.aborted && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WORKSPACE_SESSION_REJECTED, { detail: { owner } }));
  }
  return response;
}
