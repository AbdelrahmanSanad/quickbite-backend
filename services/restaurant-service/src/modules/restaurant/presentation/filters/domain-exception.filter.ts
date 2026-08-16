import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  BranchNotFoundError,
  CategoryNotFoundError,
  DomainError,
  DuplicateCategoryError,
  ForbiddenOwnershipError,
  RestaurantNotFoundError,
} from '../../domain/errors/domain.error';

/**
 * Maps Restaurant domain errors to HTTP responses so the domain/application
 * layers stay transport-agnostic. Unmapped domain errors default to 400.
 * (401 and role-403 are raised by the nest-auth guards as native HTTP
 * exceptions, so they bypass this filter.)
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
    if (
      exception instanceof RestaurantNotFoundError ||
      exception instanceof BranchNotFoundError ||
      exception instanceof CategoryNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof ForbiddenOwnershipError) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof DuplicateCategoryError) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
