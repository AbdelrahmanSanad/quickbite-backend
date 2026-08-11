import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload } from './access-token-payload';
import { AuthenticatedUser } from './authenticated-user';

interface BearerRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

/**
 * Validates the access JWT on protected routes and populates `request.user`.
 *
 * Verification only — never signs. Stateless (no DB lookup). All failure modes
 * return 401 with a generic message; tokens are never logged.
 *
 * Algorithm-agnostic by design: moving from the shared HS256 secret to an
 * RS256 public key is a change to the `verifyAsync` options here, not a rewrite.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BearerRequest>();
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
      throw new UnauthorizedException('Invalid or expired access token');
    }

    request.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }

  private extractBearerToken(request: BearerRequest): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value, ...rest] = header.split(' ');
    // Auth scheme is case-insensitive (RFC 7235).
    if (scheme.toLowerCase() !== 'bearer' || !value || rest.length > 0) {
      return null;
    }
    return value;
  }
}
