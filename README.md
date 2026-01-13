# Project Tracking Dashboard Infrastructure

## Overview
This is a production-grade backend for the Project Tracking Dashboard, built with Node.js, Express, and MongoDB. It features strictly enforced Role-Based Access Control (RBAC), automated timeline/status management, and a secure audit trail.

---

## Data Models & Fields

### **User**
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Full name of the user. |
| `email` | String | Unique email address (login credential). |
| `password` | String | Hashed password. |
| `role` | Enum | `ADMIN`, `CLIENT`, `TEAM`. |
| `experienceYears` | Number | Required for `TEAM` role. |
| `phone` | String | Contact number. |

### **Project**
| Field | Type | Description |
| :--- | :--- | :--- |
| `projectName` | String | Name of the project. |
| `clientId` | ObjectId | Reference to `User` (Client role). |
| `teamMembers` | Array | References to `User` (Team role). |
| `startDate` | Date | Project kickoff date. |
| `expectedEndDate` | Date | Deadline. |
| `actualEndDate` | Date | Completion date (triggers `COMPLETED` status). |
| `status` | Enum | Auto-calculated: `NOT_STARTED`, `ON_TRACK`, `DELAYED`, `COMPLETED`. |

### **ProjectStage**
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | e.g., "Design", "Development". |
| `assignedTo` | ObjectId | Team member responsible for this stage. |
| `status` | Enum | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`. |
| `progress` | Number | 0-100 percentage. |

---

## API Documentation

### 1. Authentication

#### **Register User**
*Creates a new user account with specific role-based validation.*
- **Route**: `POST /api/auth/register`
- **Access**: Public
- **Scenarios**:
  - *Success*: Returns 201 and sets HTTPOnly cookie.
  - *Failure*: Returns 400 if `experienceYears` missing for TEAM or Admin already exists.
- **Example Body**:
  ```json
  {
    "name": "Alice Dev",
    "email": "alice@company.com",
    "password": "securepass123",
    "role": "TEAM",
    "experienceYears": 4
  }
  ```

#### **Login User**
*Authenticates user and issues a secure session cookie.*
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Example Body**:
  ```json
  {
    "email": "alice@company.com",
    "password": "securepass123"
  }
  ```

#### **Logout User**
*Invalidates the session cookie.*
- **Route**: `POST /api/auth/logout`
- **Access**: Public

---

### 2. Dashboard Analytics

#### **Admin Dashboard**
*Provides system-wide metrics including completion rates and delays.*
- **Route**: `GET /api/dashboard/admin`
- **Access**: `ADMIN` Only
- **Response Example**:
  ```json
  {
    "totalProjects": 12,
    "completed": 4,
    "delayed": 2,
    "active": 6,
    "avgCompletionTime": 14
  }
  ```

#### **Client Dashboard**
*Provides metrics specific to the logged-in client's projects.*
- **Route**: `GET /api/dashboard/client`
- **Access**: `CLIENT` Only
- **Response Example**:
  ```json
  {
    "totalAssigned": 3,
    "active": 2,
    "completed": 1,
    "projectsOverview": [
      { "name": "App Redesign", "status": "ON_TRACK", "id": "..." }
    ]
  }
  ```

---

### 3. Project Management

#### **Create Project**
*Initialize a new project with client and team assignments.*
- **Route**: `POST /api/projects`
- **Access**: `ADMIN` Only
- **Example Body**:
  ```json
  {
    "projectName": "E-Commerce Platform",
    "clientId": "64f1b2...", 
    "teamMembers": ["64f1c3...", "64f1d4..."],
    "startDate": "2023-11-01",
    "expectedEndDate": "2024-02-01"
  }
  ```

#### **Get All Projects**
*Retrieves projects with strict visibility rules applied.*
- **Route**: `GET /api/projects`
- **Access**: `ADMIN`, `TEAM`, `CLIENT`
- **Scenarios**:
  - *Admin*: Sees all projects.
  - *Client*: Sees only projects where `clientId` matches their ID.
  - *Team*: Sees only projects where they are in `teamMembers`.
- **Note**: Client responses are sanitized (internal notes/team emails hidden).

#### **Get Project Details**
*Fetches a single project by ID.*
- **Route**: `GET /api/projects/:id`
- **Access**: Assigned Users & Admin

#### **Update Project Details**
*Modify general project information (Name, Description).*
- **Route**: `PUT /api/projects/:id`
- **Access**: `ADMIN`, Assigned `TEAM`
- **Note**: Status cannot be manually updated here (use Timeline).

#### **Update Timeline (Admin)**
*Control project dates which automatically recalculates status.*
- **Route**: `PUT /api/projects/:id/timeline`
- **Access**: `ADMIN` Only
- **Functionality**: Setting `actualEndDate` marks project `COMPLETED`. Past due `expectedEndDate` marks `DELAYED`.
- **Example Body**:
  ```json
  {
    "expectedEndDate": "2024-03-01",
    "delayReason": "Third-party api delays"
  }
  ```

#### **Delete Project**
*Permanently removes a project and its associated data.*
- **Route**: `DELETE /api/projects/:id`
- **Access**: `ADMIN` Only

---

### 4. Workflow Stages

#### **Add Stage**
*Add a development phase to a project.*
- **Route**: `POST /api/projects/:projectId/stages`
- **Access**: `ADMIN` Only
- **Example Body**:
  ```json
  {
    "name": "Frontend Development",
    "assignedTo": "64f1c3...",
    "order": 2
  }
  ```

#### **Update Stage**
*Update progress or status of a specific stage.*
- **Route**: `PUT /api/projects/:projectId/stages/:stageId`
- **Access**: `ADMIN`, Assigned `TEAM`
- **Scenario**: Team member can only update stages assigned to *them*.
- **Example Body**:
  ```json
  {
    "status": "IN_PROGRESS",
    "progress": 45
  }
  ```

#### **Get Stages**
*List all workflow stages for a project.*
- **Route**: `GET /api/projects/:projectId/stages`
- **Access**: `ADMIN`, Assigned `TEAM`, Assigned `CLIENT`

---

### 5. Collaboration & Audit

#### **Add Note**
*Post a comment or update to the project feed.*
- **Route**: `POST /api/projects/:id/note`
- **Access**: `ADMIN`, `TEAM`, `CLIENT`
- **Example Body**:
  ```json
  {
    "content": "Meeting minutes attached.",
    "isInternal": true
  }
  ```
  *(Clients cannot see `isInternal: true` notes)*

#### **View Activity Log**
*Retrieve the history of all actions performed on the project.*
- **Route**: `GET /api/projects/:id/activity`
- **Access**: `ADMIN`, `CLIENT`
- **Response Example**:
  ```json
  [
    {
      "action": "UPDATED_TIMELINE",
      "userId": { "name": "Admin User" },
      "details": "Status: DELAYED",
      "createdAt": "2023-12-15T10:00:00Z"
    }
  ]
  ```
