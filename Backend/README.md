# Backend - Hospital Booking API

Express + Sequelize backend configured for MySQL (XAMPP).

## Prerequisites

- Node.js 18+
- XAMPP (MySQL running)

## Environment Variables

Create `.env` in this folder:

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

## Install and Run

```bash
npm install
npm run start
```

## API Highlights

- `GET /` API status
- `GET /health` DB connectivity
- `POST /user/signup`
- `POST /user/login`
- `GET /doctors/all-doctors`
- `POST /appointments/book-appointment`
- `POST /appointments/check-slot-availability`

## Database Notes

- Tables are synced automatically by Sequelize on startup.
- Slot booking is now stored in MySQL (`slots` table), no MongoDB required.

## database
 the database schema is found in the backend folder