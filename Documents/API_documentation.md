# BuildRight API Documentation v1.0

## Base URL
`https://api.buildright.cm/v1`

## Authentication
All protected endpoints require a Bearer Token in the Authorization header.
`Authorization: Bearer <your_jwt_token>`

## Response Format
All responses are returned in JSON format.

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

---

## 1. Authentication & Users

### Login
Authenticate a user and receive a session token.
- **Endpoint**: `POST /auth/login`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: Returns User object and JWT Token.

### Register
Create a new account using a pre-generated Access Code.
- **Endpoint**: `POST /auth/register`
- **Access**: Public
- **Body**:
  ```json
  {
    "name": "BTP Construction",
    "email": "contact@btp.cm",
    "password": "securePassword",
    "accessCode": "CONTR-X7829A"
  }
  ```

### Get Current User
Get details of the currently logged-in user.
- **Endpoint**: `GET /auth/me`
- **Access**: Private (All Roles)

---

## 2. Projects

### List All Projects
Get a paginated list of projects with optional filtering.
- **Endpoint**: `GET /projects`
- **Access**: Public
- **Query Params**:
  - `page`: number (default 1)
  - `limit`: number (default 10)
  - `status`: 'Planned' | 'Ongoing' | 'Stalled' | 'Completed'
  - `search`: string (matches title or location)
  - `region`: string

### Get Project Details
Get full details, timeline updates, and images for a specific project.
- **Endpoint**: `GET /projects/:id`
- **Access**: Public

### Create Project
- **Endpoint**: `POST /projects`
- **Access**: Admin Only
- **Body**:
  ```json
  {
    "title": "Yaoundé Highway",
    "description": "Phase 2 construction...",
    "location": "Yaoundé",
    "region": "Centre",
    "budget": 500000000,
    "contractorId": "u123",
    "startDate": "2024-01-01",
    "completionDate": "2025-01-01"
  }
  ```

### Update Project
Update project details. Contractors can update progress/spent; Admins can update all fields.
- **Endpoint**: `PATCH /projects/:id`
- **Access**: Admin, Contractor (Assigned Only)
- **Body**:
  ```json
  {
    "status": "Ongoing",
    "progress": 45,
    "spent": 20000000,
    "description": "Updated description...",
    "newImages": ["base64string...", "base64string..."]
  }
  ```

### Delete Project
- **Endpoint**: `DELETE /projects/:id`
- **Access**: Admin Only

---

## 3. Project Updates (Timeline)

### Add Timeline Update
Add a formal update to the project timeline (e.g., "Foundation Laid").
- **Endpoint**: `POST /projects/:id/updates`
- **Access**: Admin, Contractor
- **Body**:
  ```json
  {
    "message": "Foundation work completed successfully.",
    "date": "2024-03-15"
  }
  ```

---

## 4. Comments (Citizen Reports)

### List Comments
Get reports/comments for a specific project.
- **Endpoint**: `GET /projects/:id/comments`
- **Access**: Public

### Post Comment
Submit a citizen report or NGO observation.
- **Endpoint**: `POST /projects/:id/comments`
- **Access**: Public (Rate limited)
- **Body**:
  ```json
  {
    "authorName": "Jean Dupont",
    "authorType": "Citizen",
    "text": "Work has stopped for 3 weeks.",
    "images": ["base64string..."] 
  }
  ```

### Delete Comment
Moderate inappropriate content.
- **Endpoint**: `DELETE /comments/:commentId`
- **Access**: Admin Only

---

## 5. Team (Developers)

### List Team Members
- **Endpoint**: `GET /team`
- **Access**: Public

### Update Team Member
Update bio, role, or image of a team member.
- **Endpoint**: `PUT /team/:id`
- **Access**: Developer Admin Only
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "role": "Lead Engineer",
    "bio": "New bio text...",
    "imageUrl": "https://..."
  }
  ```

---

## 6. Access Codes (System)

### Generate Access Code
Generate a new invite code for a specific role.
- **Endpoint**: `POST /admin/access-codes`
- **Access**: Developer Admin Only
- **Body**:
  ```json
  {
    "role": "CONTRACTOR" 
  }
  ```
- **Response**:
  ```json
  {
    "code": "CONTR-8921AA",
    "expiresAt": "2024-04-01T00:00:00Z"
  }
  ```

### List Access Codes
View all active and used codes.
- **Endpoint**: `GET /admin/access-codes`
- **Access**: Developer Admin Only

---

## 7. Statistics

### Get Global Stats
Get aggregated data for the Hero section.
- **Endpoint**: `GET /stats/global`
- **Access**: Public
- **Response**:
  ```json
  {
    "totalProjects": 150,
    "totalBudget": 45000000000,
    "projectsByStatus": {
      "Planned": 10,
      "Ongoing": 80,
      "Stalled": 5,
      "Completed": 55
    }
  }
  ```
