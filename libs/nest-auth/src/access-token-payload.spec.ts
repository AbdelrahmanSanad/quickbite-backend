import { AccessTokenPayload } from './access-token-payload';

/**
 * Tripwire that freezes THIS lib's access-token interface (`{ sub, email, role }`).
 * Changing the interface forces this test to change — a deliberate signal that a
 * shared contract moved. It does NOT verify what the Auth Service actually signs;
 * that guarantee arrives when auth-service consumes this lib's type (tracked
 * follow-up).
 */
describe('AccessTokenPayload contract', () => {
  it('is exactly { sub, email, role }', () => {
    const sample: AccessTokenPayload = {
      sub: 'user-1',
      email: 'ada@example.com',
      role: 'RESTAURANT_OWNER',
    };
    expect(Object.keys(sample).sort()).toEqual(['email', 'role', 'sub']);
  });
});
