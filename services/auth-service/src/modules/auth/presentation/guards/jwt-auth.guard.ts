import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AccessTokenPayload } from '../../domain/ports/access-token.service.port';
import { AuthenticatedUser } from '../security/authenticated-user';

type AuthedRequest = Request & { user?: AuthenticatedUser };

/**
 * Validates the access JWT on protected routes and populates `request.user`.
 *
 * Stateless: the identity comes from the verified token, with no DB lookup.
 * Reusable in any module that has JwtModule + JWT_ACCESS_SECRET configured.
 * All failure modes return 401 with a generic message (no token or crypto
 * details leaked; tokens are never logged).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing or malformed access token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      // Covers bad signature, expiry, wrong secret, malformed JWT — all 401.
      throw new UnauthorizedException('Invalid or expired access token');
    }

    request.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }

  /** Returns the token from `Authorization: Bearer <token>`, or null. */
  private extractBearerToken(request: AuthedRequest): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value, ...rest] = header.split(' ');
    if (scheme !== 'Bearer' || !value || rest.length > 0) {
      return null;
    }
    return value;
  }
}
