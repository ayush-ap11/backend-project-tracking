# Project Tracking Dashboard (Backend)

## Project Overview
This is the backend for the Project Tracking Dashboard. It is built using Node.js, Express, and MongoDB. It handles user authentication and project management features with a production-grade structure.

## Tech Stack
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB (via Mongoose)
-   **Authentication**: JWT (JSON Web Tokens) via **HTTPOnly Cookies**
-   **Security**: bcryptjs (Password hashing), cors, cookie-parser, helmet (recommended for future)

## Project Structure

### Configuration
-   `src/config/db.js`: MongoDB connection logic.
-   `.env`: Environment variables (see `.env.example`).

### Models
-   `src/models/User.js`: User schema (roles: ADMIN, CLIENT, TEAM).
-   `src/models/Project.js`: Project schema with client and team member relations.
-   `src/models/ActivityLog.js`: Tracks user actions.
-   `src/models/Note.js`: Project notes.
-   `src/models/ProjectStage.js`: Stages (kanban/phases) for projects.

### Controllers
-   `src/controllers/authController.js`: Registration, Login (cookie set), Logout.
-   `src/controllers/projectController.js`: Full CRUD for projects.

### Middleware
-   `src/middleware/authMiddleware.js`: Protects routes by checking `req.cookies.jwt`.
-   `src/middleware/errorMiddleware.js`: Global error handling and Not Found catcher.
-   `src/middleware/asyncHandler.js`: Utility to handle async route errors cleanly.
-   `src/utils/generateToken.js`: Generates and sets HTTPOnly cookies.

## Setup & Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Configuration**:
    Copy `.env.example` to `.env` and configure `MONGO_URI` and `JWT_SECRET`.
3.  **Run the Server**:
    ```bash
    npm run dev
    ```

## API Documentation

### Authentication (Cookie-Based)
> [!IMPORTANT]
> This API uses **HTTPOnly Cookies** for authentication. The token is **NOT** returned in the JSON body. Your client (Postman/Browser) must support cookies.

#### 1. Register User
-   **URL**: `POST /api/auth/register`
-   **Body**:
    ```json
    { "name": "...", "email": "...", "password": "...", "role": "ADMIN" }
    ```
-   **Response**: 201 Created (User info only). **Cookie `jwt` is set automatically.**

#### 2. Login User
-   **URL**: `POST /api/auth/login`
-   **Body**:
    ```json
    { "email": "...", "password": "..." }
    ```
-   **Response**: 200 OK. **Cookie `jwt` is set automatically.**

#### 3. Logout
-   **URL**: `POST /api/auth/logout`
-   **Response**: 200 OK. Clears the cookie.

### Projects (Protected)
*Requires valid `jwt` cookie.*

#### 1. Create Project
-   **URL**: `POST /api/projects`
-   **Body**:
    ```json
    {
       "projectName": "New Website",
       "clientId": "userId...",
       "description": "...",
       "expectedEndDate": "2025-12-31"
    }
    ```

#### 2. Get All Projects
-   **URL**: `GET /api/projects`

#### 3. Get Project By ID
-   **URL**: `GET /api/projects/:id`

#### 4. Update Project
-   **URL**: `PUT /api/projects/:id`

#### 5. Delete Project
-   **URL**: `DELETE /api/projects/:id`

## Validation & testing
-   **Postman**: When testing, ensure the Postman "Cookies" manager is effectively capturing the `jwt` cookie from the Login response so it is sent with subsequent requests.
