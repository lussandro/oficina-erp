import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { STATUS_CODES } from "http";

// Formato de erro único do contrato (docs/API_CONTRACT.md): statusCode, error, message, details?.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : null;

    let message = "Erro interno";
    // Exceções construídas com payload de objeto (ex.: `new UnprocessableEntityException({ message, details })`)
    // substituem o body inteiro — Nest não preenche `error` sozinho nesse caso. Cai pro reason phrase do status.
    let error = STATUS_CODES[statusCode] ?? "Internal Server Error";
    let details: unknown;

    if (typeof body === "string") {
      message = body;
    } else if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      message = Array.isArray(b.message)
        ? b.message.join("; ")
        : ((b.message as string) ?? message);
      error = (b.error as string) ?? error;
      details = b.details;
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(details !== undefined ? { details } : {}),
    });
  }
}
