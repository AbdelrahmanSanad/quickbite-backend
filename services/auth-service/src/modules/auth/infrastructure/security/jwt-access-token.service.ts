import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenPayload,
  AccessTokenService,
  IssuedAccessToken,
} from '../../domain/ports/access-token.service.port';

/** Signs stateless access tokens as JWTs (HS256 by default). */
@Injectable()
export class JwtAccessTokenService implements AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(payload: AccessTokenPayload): Promise<IssuedAccessToken> {
    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const expiresInSeconds = Number(this.config.getOrThrow('JWT_ACCESS_TTL'));
    const token = await this.jwt.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds,
    });
    return { token, expiresInSeconds };
  }
}
