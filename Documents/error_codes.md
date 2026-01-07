# BuildRight API Error Codes

This document lists the standardized error codes returned by the BuildRight API. 
Errors are returned in the following JSON format:

```json
{
  "success": false,
  "error": "Human readable description",
  "code": "SPECIFIC_ERROR_CODE"
}
```

---

## HTTP Status Codes Summary

| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| **400** | Bad Request | The request was unacceptable, often due to missing parameters or invalid formatting. |
| **401** | Unauthorized | Authentication failed or the user does not have permissions for the requested operation. |
| **403** | Forbidden | The authenticated user is not allowed to access the specified resource. |
| **404** | Not Found | The requested resource (Project, User, Comment) does not exist. |
| **429** | Too Many Requests | Rate limit exceeded. Please wait before retrying. |
| **500** | Server Error | Something went wrong on BuildRight's end. |

---

## Application-Specific Error Codes

### Authentication & Access (`AUTH_` prefix)

| Error Code | HTTP Status | Meaning |
| :--- | :--- | :--- |
| `AUTH_INVALID_CREDENTIALS` | 401 | The email or password provided is incorrect. |
| `AUTH_TOKEN_MISSING` | 401 | The `Authorization` header with a Bearer token is missing. |
| `AUTH_TOKEN_EXPIRED` | 401 | The provided JWT token has expired. Please log in again. |
| `AUTH_TOKEN_INVALID` | 401 | The provided token is malformed or invalid. |
| `ACCESS_DENIED` | 403 | You do not have the required role (e.g., ADMIN, CONTRACTOR) to perform this action. |
| `ACCESS_CODE_INVALID` | 400 | The invite code provided during registration does not exist. |
| `ACCESS_CODE_USED` | 409 | The invite code provided has already been redeemed. |

### Projects & Resources (`RES_` prefix)

| Error Code | HTTP Status | Meaning |
| :--- | :--- | :--- |
| `PROJECT_NOT_FOUND` | 404 | The requested project ID does not exist in the database. |
| `COMMENT_NOT_FOUND` | 404 | The requested comment ID does not exist. |
| `USER_NOT_FOUND` | 404 | The requested user ID does not exist. |
| `RESOURCE_LOCKED` | 409 | The resource is currently being edited by another process. |

### Validation & Input (`VAL_` prefix)

| Error Code | HTTP Status | Meaning |
| :--- | :--- | :--- |
| `MISSING_REQUIRED_FIELD` | 400 | One or more required fields (e.g., `title`, `budget`) are missing from the request body. |
| `INVALID_EMAIL_FORMAT` | 400 | The email address provided is not in a valid format. |
| `INVALID_DATE_FORMAT` | 400 | Dates must be in `YYYY-MM-DD` format. |
| `INVALID_CURRENCY_VALUE` | 400 | Budget or Spent amounts must be positive numbers. |
| `FILE_TOO_LARGE` | 413 | The uploaded image exceeds the maximum allowed size (5MB). |
| `FILE_TYPE_NOT_SUPPORTED` | 415 | Only JPEG, PNG, and WEBP image formats are supported. |
| `MAX_IMAGES_EXCEEDED` | 400 | You cannot upload more than 4 images per comment/project update. |

### Server & System (`SYS_` prefix)

| Error Code | HTTP Status | Meaning |
| :--- | :--- | :--- |
| `INTERNAL_SERVER_ERROR` | 500 | An unhandled exception occurred. |
| `DATABASE_CONNECTION_ERROR` | 503 | The service cannot connect to the database. Try again later. |
| `SERVICE_UNAVAILABLE` | 503 | The API is currently down for maintenance. |
