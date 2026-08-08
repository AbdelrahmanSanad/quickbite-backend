import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OtpGenerator } from '../../domain/ports/otp-generator.port';

/** 6-digit numeric OTP, zero-padded, using a CSPRNG (not Math.random). */
@Injectable()
export class CryptoOtpGenerator implements OtpGenerator {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
