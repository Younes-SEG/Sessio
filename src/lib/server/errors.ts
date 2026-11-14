import type { AccessDenialReason } from '../access-denial';

export class ApiError extends Error {
  static accessDenied(reason: AccessDenialReason, message: string) {
    return new ApiError(403, message, undefined, reason);
  }

  constructor(
    public status: number,
    message: string,
    public code?: 'provider_unavailable',
    public reason?: AccessDenialReason,
  ) {
    super(message);
  }
}
