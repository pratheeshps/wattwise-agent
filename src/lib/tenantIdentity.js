export function requireTenantUserId(userId) {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    const error = new Error('Authenticated user is required for tenant-scoped data access.');
    error.status = 401;
    throw error;
  }

  return userId;
}
