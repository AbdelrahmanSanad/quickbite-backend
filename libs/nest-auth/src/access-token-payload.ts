/**
 * The access-token wire contract shared across services. This MUST match what
 * the Auth Service signs (`{ sub, email, role }`) — a cross-service payload
 * test freezes that shape. Change it only alongside the Auth Service.
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}
