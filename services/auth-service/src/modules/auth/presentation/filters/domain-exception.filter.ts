import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  AccountNotActiveError,
  DomainError,
  EmailAlreadyInUseError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  InvalidResetCodeError,
  InvalidVerificationTokenError,
  TooManyResetAttemptsError,
  TooManyVerificationAttemptsError,
} from '../../domain/errors/domain.error';

/**
 * Maps domain errors to HTTP responses so the domain/application layers stay
 * transport-agnostic. Unmapped domain errors default to 400.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(exception);
    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }

  private statusFor(exception: DomainError): number {
    if (exception instanceof EmailAlreadyInUseError) {
      return HttpStatus.CONFLICT;
    }
    if (
      exception instanceof InvalidCredentialsError ||
      exception instanceof InvalidRefreshTokenError
    ) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (
      exception instanceof EmailNotVerifiedError ||
      exception instanceof AccountNotActiveError
    ) {
      return HttpStatus.FORBIDDEN;
    }
    if (
      exception instanceof TooManyVerificationAttemptsError ||
      exception instanceof TooManyResetAttemptsError
    ) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }
    if (
      exception instanceof InvalidVerificationTokenError ||
      exception instanceof InvalidResetCodeError
    ) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
