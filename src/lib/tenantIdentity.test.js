import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTenantUserId } from './tenantIdentity.js';

test('requireTenantUserId returns a valid authenticated user ID unchanged', () => {
  assert.equal(requireTenantUserId('user_123'), 'user_123');
});

test('requireTenantUserId rejects missing, non-string and blank identities', () => {
  for (const value of [undefined, null, '', '   ', 123, {}, false]) {
    assert.throws(
      () => requireTenantUserId(value),
      (error) => error.status === 401 && /Authenticated user is required/.test(error.message),
    );
  }
});
