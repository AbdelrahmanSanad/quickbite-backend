import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { TokenGenerator } from '../../domain/ports/token-generator.port';

/** 256-bit cryptographically-random, URL-safe token. */
@Injectable()
export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(32).toString('base64url');
  }
}
