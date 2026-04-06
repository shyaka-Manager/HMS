<<<<<<< HEAD
# Hospital Booking App

This is a full-stack web app for hospital appointment booking.

## What this app does

1. Patients can see doctors and book appointments from the home page.
2. Doctors can log in, view their patients, and manage their schedule.
3. Admin can manage doctors, patients, and appointments.

## Tech used

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: MySQL (runs locally with XAMPP)

## Project folders

- Frontend: user interface and pages
- Backend: API and database logic

## Before you run

Install these tools:

1. Node.js (LTS version)
2. XAMPP

## Step 1: Setup MySQL in XAMPP

1. Open XAMPP Control Panel.
2. Start MySQL.
3. Open phpMyAdmin.
4. Create a new database named hospital_booking.

## Step 2: Setup backend

Open terminal in the Backend folder and run:

```bash
npm install
```

Create a file named .env inside Backend and add:

```env
PORT=8080
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

SQL_HOST=127.0.0.1
SQL_PORT=3306
SQL_DATABASENAME=hospital_booking
SQL_USERNAME=root
SQL_PASSWORD=

FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:8080

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Start backend:

```bash
npm run start
```

Backend runs at:

http://localhost:8080

## Step 3: Setup frontend

Open terminal in the Frontend folder and run:

```bash
npm install
npm run dev
```

Frontend runs at:

http://localhost:5173

## Quick test

1. Open frontend in browser.
2. Check Featured Doctors section (data comes from database).
3. Try Book Appointment on home page.
4. Use Admin Login and Doctor Login buttons to test role-based panels.

## Helpful backend routes

- GET /health
- GET /doctors/all-doctors
- POST /appointments/book-appointment
- POST /user/login
- GET /stats/at-a-glance

## Common issue

If backend stops with exit code 1:

1. Confirm MySQL is running in XAMPP.
2. Confirm database hospital_booking exists.
3. Check Backend .env values (host, port, username, password).
4. Run backend again.
=======
# hospital-booking-app
>>>>>>> 8e10727e399a0836303b33ce92ba36ef1eb09826
