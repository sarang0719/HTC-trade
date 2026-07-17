import { Request, Response, NextFunction } from "express";

export interface LogContext {
  requestId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  timestamp: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  // Add request context
  const context: LogContext = {
    requestId,
    userId: (req as any).user?.claims?.sub,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };

  // Add context to request for use in other middleware
  (req as any).logContext = context;

  // Log request
  console.log(`[${context.requestId}] ${context.method} ${context.url} - ${context.ip} - ${context.userAgent}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${context.requestId}] ${logLevel} ${res.statusCode} ${context.method} ${context.url} - ${duration}ms`);
  });

  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const context = (req as any).logContext as LogContext;
  
  console.error(`[${context?.requestId || 'unknown'}] ERROR:`, {
    error: err.message,
    stack: err.stack,
    context: {
      userId: context?.userId,
      ip: context?.ip,
      method: context?.method,
      url: context?.url,
    },
  });

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      message: 'Internal server error',
      requestId: context?.requestId,
    });
  } else {
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      requestId: context?.requestId,
    });
  }
}
