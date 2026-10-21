const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '::ffff:127.0.0.1']);

function localHost(host: string) {
  try {
    return loopback.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

/** Defense in depth for the local edition, not a substitute for hosted authentication. */
export function isLocalWorkspaceRequest(
  headers: Headers,
  request?: { method: string; pathname: string },
) {
  const host = headers.get('host');
  if (!host || !localHost(host)) return false;
  if (headers.get('sec-fetch-site') === 'cross-site') {
    // Google returns through a top-level browser navigation. Only this callback
    // may cross the site boundary; its handler validates state, cookie and PKCE.
    const gmailReturn =
      request?.method === 'GET' &&
      request.pathname === '/api/email/callback' &&
      headers.get('sec-fetch-mode') === 'navigate' &&
      headers.get('sec-fetch-dest') === 'document';
    if (!gmailReturn) return false;
  }
  const forwardedHost = headers.get('x-forwarded-host');
  if (forwardedHost && forwardedHost.split(',').some((value) => !localHost(value.trim())))
    return false;
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.split(',').some((value) => !loopback.has(value.trim())))
    return false;
  if (headers.has('forwarded')) return false;
  return true;
}
