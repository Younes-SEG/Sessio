import { describe, expect, it } from 'vitest';
import { isLocalWorkspaceRequest } from '../src/lib/server/local-access';

describe('local workspace boundary', () => {
  it.each(['localhost:3000', '127.0.0.1:3000', '[::1]:3000'])('allows loopback host %s', (host) => {
    expect(isLocalWorkspaceRequest(new Headers({ host }))).toBe(true);
  });
  it.each([
    {},
    { host: 'command.example' },
    { host: 'localhost.attacker.example' },
    { host: '127.0.0.1:3000', 'sec-fetch-site': 'cross-site' },
    { host: '127.0.0.1:3000', 'x-forwarded-host': 'public.example' },
    { host: 'localhost:3000', 'x-forwarded-for': '203.0.113.2' },
    { host: 'localhost:3000', forwarded: 'for=203.0.113.2' },
  ])('rejects public or cross-site headers %j', (headers) => {
    expect(isLocalWorkspaceRequest(new Headers(headers as Record<string, string>))).toBe(false);
  });
  const callback = { method: 'GET', pathname: '/api/email/callback' };
  const returnHeaders = {
    host: '127.0.0.1:3000',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-dest': 'document',
  };
  it('allows only the top-level local OAuth return from Google', () => {
    expect(isLocalWorkspaceRequest(new Headers(returnHeaders), callback)).toBe(true);
  });
  it.each([
    { method: 'POST', pathname: '/api/email/callback' },
    { method: 'GET', pathname: '/api/email' },
    { method: 'GET', pathname: '/email' },
    { method: 'GET', pathname: '/api/email/callback/extra' },
  ])('keeps other cross-site requests blocked: %j', (request) => {
    expect(isLocalWorkspaceRequest(new Headers(returnHeaders), request)).toBe(false);
  });
  it.each([
    { 'sec-fetch-mode': 'cors' },
    { 'sec-fetch-dest': 'iframe' },
    { host: 'public.example' },
    { 'x-forwarded-host': 'public.example' },
    { 'x-forwarded-for': '203.0.113.2' },
    { forwarded: 'for=203.0.113.2' },
  ])('does not weaken host or browser checks for callbacks: %j', (overrides) => {
    const headers = new Headers(returnHeaders);
    for (const [name, value] of Object.entries(overrides)) headers.set(name, value);
    expect(isLocalWorkspaceRequest(headers, callback)).toBe(false);
  });
});
