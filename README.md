# Project Tracking Dashboard (Backend)

## Project Overview
This is the backend for the Project Tracking Dashboard. It is built using **Node.js**, **Express**, and **MongoDB**. It handles user authentication and project management features with a production-grade structure, strictly enforcing Role-Based Access Control (RBAC).

## Tech Stack
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB (via Mongoose)
-   **Authentication**: JWT (JSON Web Tokens) stored in **HTTPOnly Cookies**
-   **Security**: bcryptjs, cors, cookie-parser

## Business Rules & Access Control
-   **ADMIN**: 
    -   Full Control (Create/Delete Projects).
    -   Can view and edit all projects.
    -   **Constraint**: Only one Admin account allowed per system.
-   **TEAM**: 
    -   Can **View** and **Update** projects only if they are assigned to the project's `teamMembers` list.
    -   **Constraint**: Must provide `experienceYears` during registration.
-   **CLIENT**: 
    -   Can **View** projects and **Add Notes** only if they are the assigned `clientId` for the project.

---

## API Reference

### 1. Authentication
*Note: This system uses HTTPOnly Cookies. Tokens are not returned in the JSON body.*

#### Register User
Create a new account.
-   **Endpoint**: `POST /api/auth/register`
-   **Access**: Public
-   **Body**:
    ```json
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "secretpassword",
        "role": "TEAM", 
        "experienceYears": 5, 
        "phone": "1234567890"
    }
    ```
    *(Note: `experienceYears` is mandatory for TEAM role. `role` can be ADMIN, TEAM, or CLIENT)*

-   **Success Response** (201 Created):
    ```json
    {
        "_id": "6784a...",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "TEAM"
    }
    ```
    *Cookie `jwt` is set.*

#### Login User
Authenticate and receive a session cookie.
-   **Endpoint**: `POST /api/auth/login`
-   **Access**: Public
-   **Body**:
    ```json
    {
        "email": "john@example.com",
        "password": "secretpassword"
    }
    ```
-   **Success Response** (200 OK):
    ```json
    {
        "_id": "6784a...",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "TEAM"
    }
    ```
    *Cookie `jwt` is set.*

#### Logout User
Clear the session cookie.
-   **Endpoint**: `POST /api/auth/logout`
-   **Access**: Public
-   **Success Response** (200 OK):
    ```json
    {
        "message": "Logged out successfully"
    }
    ```

---

### 2. Projects
*Note: All Project routes require a valid login (valid `jwt` cookie).*

#### Create Project
-   **Endpoint**: `POST /api/projects`
-   **Access**: **ADMIN Only**
-   **Body**:
    ```json
    {
        "projectName": "Website Redesign",
        "clientId": "6784b...", 
        "description": "Full redesign of the corporate site.",
        "startDate": "2023-10-01",
        "expectedEndDate": "2023-12-31",
        "teamMembers": ["6784c...", "6784d..."]
    }
    ```
    *(Note: `clientId` is the User ID of the Client. `teamMembers` is an array of User IDs for the Team.)*

-   **Success Response** (201 Created):
    ```json
    {
        "_id": "6785x...",
        "projectName": "Website Redesign",
        "clientId": "6784b...",
        "status": "Active",
        "...": "..."
    }
    ```

#### Get All Projects
Retrieve a list of projects visible to the user.
-   **Endpoint**: `GET /api/projects`
-   **Access**: Private (All Roles)
-   **Behavior**:
    -   **ADMIN**: Returns all projects in the database.
    -   **CLIENT**: Returns only projects where `req.user.id` matches project `clientId`.
    -   **TEAM**: Returns only projects where `req.user.id` is in `teamMembers`.
-   **Success Response** (200 OK):
    ```json
    [
        {
            "_id": "6785x...",
            "projectName": "Website Redesign",
            "clientId": { "_id": "...", "name": "Client Name", "email": "..." },
            "status": "Active"
        }
    ]
    ```

#### Get Project By ID
Retrieve details of a specific project.
-   **Endpoint**: `GET /api/projects/:id`
-   **Access**: Private (Assigned Users & Admin)
-   **Constraint**: If user is not Admin and not assigned (Client/Team) to this specific project, returns `403 Forbidden`.
-   **Success Response** (200 OK):
    ```json
    {
        "_id": "6785x...",
        "projectName": "Website Redesign",
        "teamMembers": [
            { "_id": "...", "name": "Dev One", "role": "TEAM" }
        ],
        "notes": []
    }
    ```

#### Update Project
Update project details/status or assign members.
-   **Endpoint**: `PUT /api/projects/:id`
-   **Access**: ADMIN, TEAM (Assigned)
-   **Body** (Example status update):
    ```json
    {
        "status": "Completed",
        "description": "Updated description..."
    }
    ```
-   **Body** (Example assigning members - Admin usually):
    ```json
    {
        "teamMembers": ["6784c...", "6784d...", "6784e..."]
    }
    ```
-   **Success Response** (200 OK): *(Returns updated project object)*

#### Add Note (Comment)
Add a comment/note to the project.
-   **Endpoint**: `POST /api/projects/:id/note`
-   **Access**: ADMIN, TEAM (Assigned), CLIENT (Assigned)
-   **Body**:
    ```json
    {
        "content": "Please review the homepage design."
    }
    ```
-   **Success Response** (201 Created):
    ```json
    {
        "_id": "6799...",
        "projectId": "6785x...",
        "content": "Please review the homepage design.",
        "createdBy": "6784b...",
        "createdAt": "2023-11-15T10:00:00Z"
    }
    ```

#### Delete Project
Remove a project permanently.
-   **Endpoint**: `DELETE /api/projects/:id`
-   **Access**: **ADMIN Only**
-   **Success Response** (200 OK):
    ```json
    {
        "message": "Project removed"
    }
    ```
