# Service Cost Tracker
## Project Technical Documentation & Knowledge Transfer (KT)

**Project Name:** Service Cost Tracker  
**Client:** Nokia  
**Document Type:** Technical Documentation / Knowledge Transfer  
**Technology Stack:** React.js, Node.js, Express.js, MySQL, Postgres(Pgadmin), Tailwind CSS

---

## 1. Project Overview

Service Cost Tracker is a data management web application designed to process data, store it in a database, and present it through an interactive dashboard.

The application uses data from Excel files and displays relevant information in tabular and summary formats. It also supports calculations, multiple table joins, and business-specific data processing, similar to measures and data models used in Power BI.

### Key Objectives

- Import and manage financial or project-related data.
- Store and retrieve data from the database.
- Display data through interactive dashboards and tables.
- Perform calculations and combine information from multiple tables.
- Provide a reusable and maintainable application structure.

---

## 2. Project Folder Structure

The project is divided into two main folders:

- **client:** Frontend application.
- **server:** Backend application.

### 2.1 Backend — `/server`

**Technology:** Node.js and Express.js

The backend handles API requests, database interactions, and server-side business logic.

| File / Folder | Purpose |
|---|---|
| `server.js` | Main entry point of the backend. Starts the server and registers API routes. |
| `.env` | Stores environment-specific configuration, such as database connection details. Actual credentials must remain confidential. |
| `config/db.js` | Configures the database connection. If connection pooling is implemented, it allows database connections to be reused efficiently. |
| `routes/dataRoutes.js` | Defines API endpoints and maps incoming requests to their respective controller functions. |
| `controllers/dataController.js` | Handles request processing, SQL queries or database operations, business logic, and API responses. |
| `uploads/` | Directory intended for uploaded files, such as Excel files, if file uploads are implemented in this project. |

**Backend execution flow:**

`server.js` → `dataRoutes.js` → `dataController.js` → Database → API Response

### 2.2 Frontend — `/client`

**Technology:** React.js and Tailwind CSS

The frontend provides the user interface and allows users to interact with application data.

| File / Folder | Purpose |
|---|---|
| `src/index.js` | Entry point that mounts the React application into the HTML page. |
| `src/App.js` | Main application component that defines the layout and integrates major UI sections. |
| `src/components/` | Contains reusable UI components. |
| `src/components/Sidebar.jsx` | Implements the sidebar navigation menu. |
| `src/components/DataTable.jsx` | Provides a reusable table component that can display data passed to it through props. |
| `src/pages/` | Contains individual application pages or views. |
| `src/pages/SummaryView.jsx` | Displays summary data by requesting information from the backend API and rendering it through the relevant UI components. |
| `src/index.css` | Contains global styles and Tailwind CSS directives, depending on the project configuration. |

**Frontend execution flow:**

`App.js` → `SummaryView.jsx` → API Request → API Response → `DataTable.jsx`

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Builds the interactive user interface using reusable components. |
| Node.js | Runs JavaScript on the server side. |
| Express.js | Handles HTTP requests and defines backend API routes. |
| MySQL | Stores and retrieves structured application data. |
| Tailwind CSS | Provides utility-based styling for the user interface. |
| Axios | Sends HTTP requests from the frontend to the backend API. |
| SQL | Retrieves, joins, filters, and processes database records. |

---

## 4. Application Architecture and Data Flow

The application follows a client-server architecture. The frontend communicates with the backend through API endpoints, while the backend interacts with the database.

### Example: Summary View

**Step 1 — User Action**

The user opens the Summary View in the application.

**Step 2 — Frontend Request**

`SummaryView.jsx` sends an HTTP request using Axios to the backend endpoint:

`GET http://localhost:5000/api/data/wbs-summary`

*Note: The HTTP method and endpoint should be verified against the actual route implementation.*

**Step 3 — Backend Routing**

The Express server receives the request and routes it to the corresponding handler defined in `routes/dataRoutes.js`.

**Step 4 — Controller Processing**

The relevant function in `controllers/dataController.js` executes the required business logic and database query.

**Step 5 — Database Operation**

MySQL returns the records matching the query conditions.

**Step 6 — API Response**

The controller returns the processed data in JSON format, along with an appropriate HTTP status code.

**Step 7 — Frontend Rendering**

The React component receives the response and passes the data to `DataTable.jsx` for display.

### End-to-End Flow

`User Action` → `React Component` → `Axios API Request` → `Express Route` → `Controller Logic` → `MySQL Query` → `JSON Response` → `Dashboard/Table`

---

## 5. Database and Business Logic

### 5.1 Data Processing

The application processes data retrieved from the database and presents it in a user-friendly format.

Depending on the functionality, data processing may involve:

- Retrieving records using SQL queries.
- Combining data from multiple tables using joins.
- Applying business-specific filters and calculations.
- Preparing summary-level results for dashboard display.

The exact tables, joins, calculations, and validation rules should be documented alongside the relevant controller functions and SQL queries.

### 5.2 Important Columns in `final_dashboard_table`

The following columns have specific meanings in the application's data handling logic.

| Column | Purpose |
|---|---|
| `non_committed` | Stores the original or existing values, according to the current application design. |
| `non_committed_editable` | Represents the editable input field in which updated values are entered and saved. |

**Important distinction:** `non_committed` represents the original values, while `non_committed_editable` represents the editable values.

During KT, explain how edits are validated, where the updated values are saved, and whether the original values are retained for comparison or auditing.

---

## 6. API Endpoint Reference

The following endpoints are mentioned in the current project notes. Their HTTP methods, request parameters, controller functions, and behavior must be confirmed from the source code.

| API Endpoint | Purpose |
|---|---|
| `/api/data/wbs-summary` | Retrieves summary information related to WBS data. |
| `/api/data/run-fix-db` | Appears to trigger a database-fix operation; verify its exact implementation before documenting its behavior. |

### API Documentation Checklist

For each endpoint, document:

1. HTTP method: GET, POST, PUT, PATCH, or DELETE.
2. Route definition and associated controller function.
3. Required query parameters or request body.
4. Database tables or views involved.
5. Business rules and validations.
6. Response format and error handling.
7. Authentication and authorization requirements, if applicable.

**Operational caution:** Do not execute a database-fix endpoint in a production environment until its behavior, access restrictions, and possible database changes have been reviewed.

---

## 7. Project Setup and Execution

Follow the steps below to run the application locally, subject to the actual project configuration.

### 7.1 Prerequisites

- Node.js and npm installed.
- MySQL server installed and running.
- Project source code available locally.
- Database schema and required data available.
- Required environment variables configured.

XAMPP may be used if the project is configured to run on its MySQL/MariaDB service.

### 7.2 Database Setup

1. Start the configured database service.
2. Create or restore the required database.
3. Import the necessary tables, views, and initial data.
4. Configure the database connection details in the backend environment file.
5. Verify that the backend can connect to the database.

The database name, schema, and import procedure should match the actual project configuration.

### 7.3 Start the Backend

Open a terminal in the project root and run:

```bash
cd server
npm install
```

Start the backend using the command supported by the project's `package.json` scripts. For example:

```bash
npm start
```

Alternatively, if `nodemon` is installed and configured:

```bash
npx nodemon server.js
```

Confirm the configured port from the server code or environment variables. Port `5000` is the example port used in the current project notes.

### 7.4 Start the Frontend

Open a separate terminal:

```bash
cd client
npm install
npm start
```

Verify the frontend development command against the actual `package.json`.

### 7.5 Validate the Application

- Confirm that the frontend loads successfully.
- Check that the backend starts without errors.
- Verify database connectivity.
- Open the Summary View.
- Confirm that API requests return the expected data.
- Check browser console and backend logs if errors occur.

---

## 8. Development Principles

### 8.1 DRY — Don't Repeat Yourself

Reusable components such as `DataTable.jsx` and `Sidebar.jsx` help avoid duplicate code and make future maintenance easier.

### 8.2 Separation of Concerns

The frontend handles user interaction and presentation, while the backend handles API processing and database operations.

### 8.3 Component-Based Architecture

React components divide the interface into smaller, reusable units, improving readability and maintainability.

### 8.4 Centralized API and Database Logic

Routes, controllers, and database configuration should have clearly defined responsibilities so that changes can be implemented and debugged efficiently.

---

## 9. Important React Concept: JSX

JSX is a syntax extension commonly used with React that allows developers to describe UI elements using HTML-like syntax within JavaScript code.

React components encapsulate individual UI elements or sections of the application. These components can be composed together to build complete pages and layouts.

---

## 10. Troubleshooting and Maintenance

During development or maintenance, check the following areas when an issue occurs:

| Issue | What to Check |
|---|---|
| Frontend does not start | Node.js version, npm dependencies, and frontend scripts. |
| Backend does not start | Server logs, dependencies, port conflicts, and environment configuration. |
| Database connection fails | Database service status, host, port, credentials, and database permissions. |
| API returns an error | Route definition, controller logic, request parameters, and backend logs. |
| Data does not appear in the table | API response, frontend state, data mapping, and table props. |
| Incorrect summary values | SQL joins, filters, calculations, and underlying database records. |
| Editable values are not saved | Update API, input handling, validation, database update query, and response. |

Never include actual passwords, API secrets, tokens, or production credentials in troubleshooting documentation.

---

## 11. Knowledge Transfer Checklist

Before completing the KT, ensure that the receiving developer understands:

- [ ] Overall project purpose and architecture.
- [ ] Frontend and backend folder structure.
- [ ] Important files and their responsibilities.
- [ ] API request-response flow.
- [ ] Database tables, joins, and calculations.
- [ ] Original and editable data columns.
- [ ] Local setup and execution process.
- [ ] Error handling and troubleshooting.
- [ ] Database-fix endpoint and its operational risks.
- [ ] Outstanding issues and future maintenance requirements.

---

## 12. Handover Notes

Use this section to record project-specific information before the final handover.

- **Repository URL:** [Add repository URL]
- **Required software versions:** [Add verified versions]
- **Database setup or backup location:** [Add approved location]
- **Environment configuration instructions:** [Add secure instructions; do not include secrets]
- **Deployment process:** [Document verified deployment steps]
- **Scheduled jobs or external dependencies:** [List applicable jobs and services]
- **Known issues:** [List current issues]
- **Pending enhancements:** [List planned changes]
- **KT date and participants:** [Add details]

**Document Status:** Draft — pending verification against the actual codebase.