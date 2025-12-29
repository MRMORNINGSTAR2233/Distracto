/**
 * Error handling utilities for Digital Attention Rescue
 */

/**
 * Error types for categorizing errors
 */
export enum ErrorType {
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class with additional metadata
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly timestamp: number;
  public readonly context?: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    recoverable: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.timestamp = Date.now();
    this.context = context;
    this.recoverable = recoverable;
  }
}

/**
 * Error handler for consistent error logging and handling
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private readonly maxLogSize = 100;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with logging and optional user notification
   */
  public handle(error: Error | AppError, context?: Record<string, any>): void {
    const appError = this.normalizeError(error, context);
    
    // Log to console
    console.error(`[${appError.type}] ${appError.message}`, appError.context);
    
    // Store in error log
    this.logError(appError);
    
    // Track for analytics (if needed in future)
    this.trackError(appError);
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: Error | AppError, context?: Record<string, any>): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Categorize common Chrome extension errors
    let type = ErrorType.UNKNOWN_ERROR;
    let recoverable = true;

    if (error.message.includes('storage')) {
      type = ErrorType.STORAGE_ERROR;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      type = ErrorType.NETWORK_ERROR;
    } else if (error.message.includes('permission')) {
      type = ErrorType.PERMISSION_ERROR;
      recoverable = false;
    } else if (error.message.includes('Extension context invalidated')) {
      type = ErrorType.RUNTIME_ERROR;
      recoverable = false;
    }

    return new AppError(error.message, type, recoverable, context);
  }

  /**
   * Add error to log with size limit
   */
  private logError(error: AppError): void {
    this.errorLog.push(error);
    
    // Keep log size under limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * Track error for analytics (placeholder for future implementation)
   */
  private trackError(error: AppError): void {
    // Could be extended to track errors for debugging
    // All data stays local per privacy requirements
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  public clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Wrap an async function with error handling
   */
  public async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: Record<string, any>,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error as Error, context);
      return fallback;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility function to safely execute code with error handling
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback?: T,
  context?: Record<string, any>
): Promise<T | undefined> {
  return errorHandler.wrapAsync(fn, context, fallback);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Retry function for transient failures
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if extension context is still valid
 */
export function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined;
  } catch {
    return false;
  }
}

/**
 * Safe message sending with context validation
 */
export async function safeSendMessage(message: any): Promise<any> {
  if (!isExtensionContextValid()) {
    throw new AppError(
      'Extension context invalidated',
      ErrorType.RUNTIME_ERROR,
      false
    );
  }
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new AppError(
          chrome.runtime.lastError.message || 'Message send failed',
          ErrorType.RUNTIME_ERROR
        ));
      } else {
        resolve(response);
      }
    });
  });
}
