# File Upload Implementation (Multer)

## Goal

Replace inefficient Base64 image storage with server-side file storage using `multer`.

## Changes

### Backend

1.  **Install Multer**: `npm install multer`
2.  **Middleware**: Create `middleware/uploadMiddleware.js` to configure storage (destination: `public/uploads`) and file filters.
3.  **Routes**: Update `routes/projectRoutes.js` to use `upload.array('images')` on POST/PUT routes.
4.  **Controller**: Update `controllers/projectController.js` to extract file paths from `req.files` instead of reading Base64 from `req.body`.

### Frontend

1.  **API**: Update `api.js` `createProject` and `updateProject` to handle `FormData` properly (remove `Content-Type: application/json` header manually or let browser set it).
2.  **ProjectModal**:
    - Stop converting files to Base64.
    - Append `File` objects to `FormData` with key `images`.

## Verification

- Test creating a project with images.
- Verify images appear in `Backend/public/uploads`.
- Verify images load in the dashboard.
