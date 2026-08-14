/**
 * APPLICATION ERROR
 *
 * A domain error that carries the HTTP status it should map to.
 *
 * WHY THIS EXISTS:
 * Services enforce business rules, but services must not know about Express
 * (no `res.status(...)` inside a service). Instead a service throws an AppError,
 * and the controller translates it into an HTTP response via `sendError`.
 * Anything that is NOT an AppError is treated as an unexpected bug and becomes
 * a generic 500, so we never leak stack traces or SQL errors to clients.
 */

export class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.isOperational = true; // Distinguishes "expected" rule violations from real crashes
    }
}

// Convenience constructors so call sites read like the rule they enforce.
export const badRequest = (message) => new AppError(message, 400);
export const forbidden = (message) => new AppError(message, 403);
export const notFound = (message) => new AppError(message, 404);

/**
 * sendError
 * Translates any thrown value into an HTTP response.
 * Used by every controller's catch block so error shape stays consistent.
 */
export const sendError = (res, error) => {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    // Unexpected: log the real cause server-side, return something safe to the client.
    console.error(error);
    return res.status(500).json({ success: false, error: 'Server Error' });
};
