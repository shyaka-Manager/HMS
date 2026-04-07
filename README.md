# Hospital Booking App

This repository contains a full-stack hospital appointment booking app.

## Overview

The app lets patients view doctors, book appointments, and receive confirmations, while giving doctors and admins a schedule-driven workflow for managing availability.

## What it does

1. Patients can filter doctors by specialty, department, or availability.
2. Patients can book, view, or cancel upcoming appointments.
3. Doctors can manage schedule availability and appointment instructions.
4. Admins can manage doctors, patients, and bookings.

## Project structure

- Frontend: React + javascript + Vite UI
- Backend: Node.js + Express API
- Database: MySQL

## Setup

Install Node.js and XAMPP first.

Create a MySQL database named `hospital_booking`, then configure `Backend/.env` with your local values.

Backend environment example:

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



Run the backend:

```bash
cd Backend
npm install
npm run start
```

Run the frontend:

```bash
cd Frontend
npm install
npm run dev
```

## Helpful routes

- `GET /health`
- `GET /doctors/all-doctors`
- `POST /appointments/book-appointment`
- `POST /user/login`
- `GET /stats/at-a-glance`

## Notes

The scheduling model is intended to support dynamic slot generation, conflict prevention, and real-time updates when appointments are booked or canceled.




