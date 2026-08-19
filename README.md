# ReachInbox Full-Stack Email Scheduler

A production-grade, highly-resilient, full-stack email job scheduling SaaS application. Built with React (TypeScript + Vite + Tailwind CSS) on the frontend, and Node.js (Express + Prisma ORM + BullMQ + Redis + PostgreSQL) on the backend.

---

## 1. System Architecture

The application uses an event-driven, decoupled queue architecture to schedule and deliver large-scale email campaigns reliably, preventing dropped jobs, rate limit violations, or duplicate sends.

```
+------------------+     JWT / HTTP     +----------------------+
|  React Frontend  | <----------------> |  Express Backend API |
+------------------+                    +----------------------+
                                                    |
                                                    | Read/Write
                                                    v
                                         +---------------------+
                                         | PostgreSQL Database | <-----+
                                         +---------------------+       |
                                                    |                  |
                                                    | Enqueue / Read   | DB Sync
                                                    v                  |
                                         +---------------------+       |
                                         |     Redis Cache     |       |
                                         +---------------------+       |
                                                    |                  |
                                                    | Listen / Process |
                                                    v                  |
                                         +---------------------+       |
                                         |    BullMQ Worker    | ------+
                                         +---------------------+
                                                    |
                                                    | Dispatch (SMTP)
                                                    v
                                         +---------------------+
                                         |  Ethereal SMTP Mail |
                                         +---------------------+
```

---

## 2. Key Resiliency Features

### A. Restart Persistence
All scheduled campaigns and individual recipient email jobs are persisted in the PostgreSQL database and Redis.
* BullMQ uses Redis key-value storage which survives backend container/service restarts.
* When the Express server boots up, the BullMQ worker connects to Redis and automatically picks up pending/delayed jobs.
* We do **not** recreate jobs from scratch on start. We use **deterministic job IDs** formatted as:
  ```
  emailJob.id
  ```
  Since BullMQ ignores jobs with duplicate IDs that already exist in the queue, we guarantee no jobs are duplicated or dropped on server restarts.

### B. Idempotency & Race-Condition Prevention
To prevent duplicate sends under high worker concurrency, server crashes, or retries:
1. When the worker picks up an email job, it executes an atomic database transaction.
2. It transitions the `status` field of the email record from `scheduled` to `processing` in a single query.
3. If the query returns that the status was not `scheduled` (meaning it has already been processed or is being sent by another worker thread), the worker aborts sending.

### C. Concurrency Configuration
Worker processing capacity is fully customizable through environment variables:
* **`WORKER_CONCURRENCY`**: Enforces the number of parallel jobs a single worker can process. Defaults to `5`.

### D. Spacing Delay Enforcements
At the worker layer, we maintain spacing between dispatches using Redis:
* **`EMAIL_DELAY_MS`**: Enforces a minimum interval between sends (e.g. 2 seconds) globally across all workers. If the time elapsed since the last sent email is less than the delay, the worker thread sleeps for the remainder before executing the next SMTP request.

### E. Hourly Rate Limiting & Auto-Rescheduling (Handling 1000+ Emails)
When a campaign contains a large volume of recipients (e.g. 1000+ emails):
1. **Static Scheduling**: At composition time, the backend statically spaces out the recipient list across hours based on the campaign's `hourlyLimit` and `delayBetweenEmails`.
2. **Dynamic Guard**: In the worker, before sending, we increment an hourly Redis counter:
   `rate-limit:campaign:{campaignId}:YYYY-MM-DD-HH`.
3. **Rescheduling**: If the counter exceeds the campaign limit, the worker:
   * Reverts the database status of that job to `scheduled`.
   * Calculates the milliseconds remaining until the start of the next hour.
   * Enqueues a new delayed job in BullMQ with the delay, ensuring no jobs are dropped and limits are never exceeded.

---

## 3. Environment Variables (`.env`)

Create a `.env` file in the root of the workspace. A reference is provided in `.env.example`:

```env
# Database Settings
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox_db?schema=public"

# Redis Settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Google OAuth Settings (Obtain from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Ethereal Email Settings (Generate from https://ethereal.email)
# Leave blank/placeholder to auto-create credentials in terminal on startup!
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=placeholder-user
ETHEREAL_PASSWORD=placeholder-password

# JWT Settings
JWT_SECRET=supersecretreachinboxschedulerkey123456!

# Application Settings
PORT=5000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Concurrency & Enforcements
WORKER_CONCURRENCY=5
EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
```

---

## 4. Run Locally

### Step 1: Boot Databases (PostgreSQL & Redis)
Ensure Docker is running, then execute:
```bash
docker compose up -d
```

### Step 2: Set up Backend
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Generate Prisma Client bindings:
   ```bash
   npm run prisma:generate
   ```
3. Run Database Migrations (make sure Docker database is active):
   ```bash
   npm run prisma:migrate
   ```
4. Start the Express server & worker:
   ```bash
   npm run dev
   ```
   *(Note: If Ethereal credentials are set to placeholders, Ethereal test credentials will be generated and printed in the server logs on start!)*

### Step 3: Set up Frontend
1. Open a new terminal:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:5173`.

---

## 5. API Documentation

All routes except OAuth portals require a JWT token in the headers: `Authorization: Bearer <JWT>`.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/auth/google` | Initiates Google OAuth consent redirection | No |
| **GET** | `/api/auth/google/callback` | Callback URL for Google OAuth verification | No |
| **GET** | `/api/auth/me` | Gets the current user profile from token | Yes |
| **POST** | `/api/auth/logout` | Simple endpoint acknowledging session logout | No |
| **POST** | `/api/emails/schedule` | Creates campaign and enqueues BullMQ jobs | Yes |
| **GET** | `/api/emails/scheduled` | Retrieves scheduled or processing jobs | Yes |
| **GET** | `/api/emails/sent` | Retrieves history logs (sent or failed) | Yes |
| **GET** | `/api/emails/stats` | Aggregates KPI stats for dashboard | Yes |
| **GET** | `/api/emails/campaigns` | Retrieves list of all user campaigns | Yes |
| **GET** | `/api/health` | Service health check | No |

---

## 6. Testing & Demonstration Guide

### 1. Google OAuth
* Click the "Sign In with Google" button on `http://localhost:5173`.
* You will redirect to Google's consent screen. Once approved, the backend processes callback, issues a JWT, and redirects to Dashboard.

### 2. Campaign Creation & CSV Upload
* Click the **Compose Email** button in the sidebar.
* Input a Subject and Body.
* Create a `.csv` or `.txt` file with content like:
  ```csv
  email
  john@test.com
  sarah@test.com
  duplicate@test.com
  duplicate@test.com
  invalid-email-address
  ```
* Upload the file. The modal will report:
  * **2 Valid** emails
  * **1 Duplicate** detected (filtered)
  * **1 Invalid** format detected (filtered)
* Select your scheduling settings (e.g. 5 seconds delay, 2 emails/hour).
* Click **Confirm & Schedule**.

### 3. Verification & Surviving Restarts
* Navigate to the **Scheduled Queue** tab to view your emails in queue.
* In the console terminal running the backend, stop the process (`Ctrl + C`).
* Notice that the Redis and Postgres containers are still active.
* Start the backend process again (`npm run dev`).
* Verify that the worker picks up the jobs from Redis and runs them on time without duplication.
* Once emails are sent, verify them in the **Sent Log** tab, and click **View Preview** to inspect the rendered mock email on Ethereal!
