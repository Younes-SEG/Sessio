import { ApiError } from './errors';
import { isHosted } from './hosting';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Behind Render's proxy, Next builds request.url from the bind address (https://0.0.0.0:PORT),
 * so a hosted deployment states its public origin instead: Render's own RENDER_EXTERNAL_URL,
 * plus COMMAND_PUBLIC_ORIGINS (comma-separated) for custom domains. Never derived from headers.
 */
function configuredOrigins(): string[] {
  return [process.env.COMMAND_PUBLIC_ORIGINS, process.env.RENDER_EXTERNAL_URL]
    .flatMap((value) => (value || '').split(','))
    .flatMap((value) => {
      try {
        const url = new URL(value.trim());
        return url.protocol === 'https:' ? [url.origin] : [];
      } catch {
        return [];
      }
    });
}

/** Next normalizes a loopback request URL to localhost; Host retains the browser's address. */
export function assertSameOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  let expectedOrigin = requestUrl.origin;
  const host = request.headers.get('host');
  if (host && loopbackHosts.has(requestUrl.hostname)) {
    try {
      const browserUrl = new URL(`${requestUrl.protocol}//${host}`);
      if (loopbackHosts.has(browserUrl.hostname) && browserUrl.port === requestUrl.port) {
        expectedOrigin = browserUrl.origin;
      }
    } catch {
      /* An invalid host never expands the accepted origin. */
    }
  }
  const configured = isHosted() ? configuredOrigins() : [];
  const allowed = configured.length ? configured : [expectedOrigin];
  const origin = request.headers.get('origin');
  const changesData = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (
    (isHosted() && changesData && !origin) ||
    (origin && !allowed.includes(origin)) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw ApiError.accessDenied('cross-origin', 'Changes must come from this application.');
  }
}
