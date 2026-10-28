# Job Application Tracker

A MERN stack web application to manage job applications, track application statuses, record status history, and monitor follow-up dates.

## Features

- Add, view, edit, and delete job applications.
- Automatically generate application IDs.
- Search applications by company and filter by status.
- Track status changes with a history timeline.
- Automatically calculate follow-up dates.
- Highlight overdue follow-ups.
- Prevent duplicate active applications for the same company and role.
- Responsive user interface.

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **ODM:** Mongoose

## Setup Instructions

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
```

Start the backend:

```bash
npm run dev
```

### Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown in the terminal.

## API Endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check API status |
| GET | `/api/applications` | List applications; supports filtering and search |
| POST | `/api/applications` | Create an application |
| GET | `/api/applications/:id` | Get one application |
| PUT | `/api/applications/:id` | Edit an application |
| PATCH | `/api/applications/:id/status` | Update application status |
| DELETE | `/api/applications/:id` | Delete an application |

## Environment Variables

Keep database credentials private. Do not commit your real `.env` file. Use `.env.example` as a template.

## Screenshots

Add two screenshots of the working application here before final submission.

## Author

Job Application Tracker — MERN Stack Project
