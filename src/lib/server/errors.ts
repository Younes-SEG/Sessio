export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: 'provider_unavailable',
  ) {
    super(message);
  }
}
