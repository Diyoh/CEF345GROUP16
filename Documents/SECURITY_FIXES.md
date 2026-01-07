# Security Fixes Report

## Overview

This document details the security vulnerabilities identified in the initial implementation of the BuildRight platform and the steps taken to resolve them. All fixes have been implemented while maintaining the original project structure.

---

## 1. Vulnerability: Insecure Token Storage (XSS Risk)

**Risk**: Authentication tokens (JWT) were stored in `localStorage` in the browser. If a script injection attack (XSS) occurred, the attacker could steal the token.

**Solution**: Moved to **HttpOnly Cookies**. These cookies cannot be accessed by JavaScript, only by the server.

**Modifications**:

- **`Backend/controllers/authController.js`**:
  - Updated `sendTokenResponse` helper to use `res.cookie('token', token, { httpOnly: true })` instead of sending it in the JSON body.
  - Added `logout` controller to clear the cookie.
- **`Backend/middleware/authMiddleware.js`**:
  - Updated `protect` function to read `req.cookies.token`.
- **`Frontend/api.js`**:
  - Removed `Authorization: Bearer` headers.
  - Added `credentials: 'include'` to all fetch requests to ensure cookies are sent.
- **`Frontend/store.jsx`**:
  - Removed `localStorage` code.
  - Added logic to call `getMe()` on app load to verify session.

---

## 2. Vulnerability: Open CORS Policy

**Risk**: `app.use(cors())` allowed any website to send requests to the API.

**Solution**: Restricted access to only the Frontend origin.

**Modifications**:

- **`Backend/index.js`**:
  - Updated `cors()` configuration:
    ```javascript
    app.use(
      cors({
        origin: "http://localhost:5173", // Only allow Frontend
        credentials: true, // Allow Cookies
      })
    );
    ```

---

## 3. Vulnerability: Lack of Rate Limiting (DoS Risk)

**Risk**: No limits on how many requests an IP could make, making the server vulnerable to Brute Force or Denial of Service attacks.

**Solution**: Implemented `express-rate-limit`.

**Modifications**:

- **`Backend/index.js`**:
  - Limit set to 100 requests per 15 minutes per IP.

---

## 4. Vulnerability: Unchecked File Uploads

**Risk**: The server accepted any Base64 string as an "image", allowing potential uploading of malicious scripts.

**Solution**: Added strict validation for Magic Numbers (MIME types) and file size.

**Modifications**:

- **`Backend/utils/fileHandler.js`**:
  - Added Regex check: `^data:image\/([a-zA-Z0-9]+);base64`.
  - Added Whitelist check: `['png', 'jpg', 'jpeg', 'gif', 'webp']`.
  - Added Size check: Max 5MB.

---

## 5. Vulnerability: Missing HTTP Security Headers

**Risk**: The app was missing standard security headers (Content-Security-Policy, X-Frame-Options).

**Solution**: Implemented `helmet`.

**Modifications**:

- **`Backend/index.js`**:
  - Added `app.use(helmet())`.

---
