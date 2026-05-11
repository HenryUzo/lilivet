# Lili Vet Hospital Backend

Production-ready Express and TypeScript API for two public-facing flows:

- Progressive 6-step appointment booking wizard with autosaved drafts.
- Standalone new-patient registration form.

No frontend code is included. Public submissions create pending requests for clinic review; they do not confirm appointments automatically.

## Stack

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma
- Zod
- Multer
- Nodemailer
- npm

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API defaults to `http://localhost:4000`.

Swagger UI is available at `http://localhost:4000/api/docs`.
Raw OpenAPI JSON is available at `http://localhost:4000/api/openapi.json`.

## Scripts

- `npm run dev` - start the API in watch mode.
- `npm run build` - compile TypeScript into `dist/`.
- `npm start` - run the compiled API.
- `npm run lint` - run TypeScript type checks.
- `npm run prisma:migrate` - create/apply local migrations.
- `npm run prisma:deploy` - apply migrations in deployed environments.
- `npm run prisma:seed` - seed realistic sample data.

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` - Neon pooled PostgreSQL connection string. Use the pooler host and include SSL settings.
- `DIRECT_URL` - Neon direct PostgreSQL connection string for Prisma migrations.
- `CORS_ORIGIN` - frontend origin list separated by commas, or `*` for development.
- `UPLOAD_DIR` - local upload folder.
- `MAX_UPLOAD_MB` - upload limit. Defaults to 10.
- `DRAFT_EXPIRY_HOURS` - draft expiry window.
- `UNATTACHED_FILE_EXPIRY_HOURS` - expiry window for files uploaded through `/api/files` before they are attached to a request.
- `DUPLICATE_WINDOW_HOURS` - short duplicate-detection window.
- `CLINIC_NOTIFICATION_EMAIL`, `MAIL_FROM`, and SMTP settings for Nodemailer.
- `JWT_SECRET` - long random secret for signing staff JWTs. Use at least 32 characters.
- `JWT_EXPIRES_IN` - staff token lifetime, for example `8h`.
- `JWT_ISSUER` and `JWT_AUDIENCE` - JWT scope values used when signing and verifying staff tokens.
- `STAFF_SEED_EMAIL` and `STAFF_SEED_PASSWORD` - admin staff credentials used by the seed script.

In production, the server refuses to start if `JWT_SECRET` or `STAFF_SEED_PASSWORD` is still using the default bootstrap value.

## Important API Rules

- Database and API use `Owner`, even if the frontend labels this section as parent information.
- Appointment requests are created with `PENDING_REVIEW`.
- The wizard stores partial draft data separately from final appointment requests.
- Urgent care requests are treated as clinic-review requests, not life-threatening emergency confirmations.
- Uploads accept only PDF, JPG, and PNG, up to `MAX_UPLOAD_MB`.
- Uploads validate both the declared MIME type and the file signature bytes on the server.
- `preferredSelections` stores up to three preferred dates, each with one to three `HH:mm` time slots, and must be sent with an IANA `timezone`.
- Appointment list date filtering is performed against normalized `YYYY-MM-DD` preferred-date keys so pagination stays consistent across pages.
- Duplicate detection flags likely duplicates using phone/email plus pet name within the configured short time window.

## Routes

Appointment drafts:

- `POST /api/appointment-drafts`
- `GET /api/appointment-drafts/:sessionToken`
- `PATCH /api/appointment-drafts/:sessionToken/step-1`
- `PATCH /api/appointment-drafts/:sessionToken/step-2`
- `PATCH /api/appointment-drafts/:sessionToken/step-3`
- `PATCH /api/appointment-drafts/:sessionToken/step-4`
- `PATCH /api/appointment-drafts/:sessionToken/step-5`
- `POST /api/appointment-drafts/:sessionToken/files`
- `POST /api/appointment-drafts/:sessionToken/submit`

Appointment requests:

- `GET /api/appointment-requests`
- `GET /api/appointment-requests/:id`
- `PATCH /api/appointment-requests/:id/status`

New-patient requests:

- `POST /api/new-patient-requests`
- `GET /api/new-patient-requests`
- `GET /api/new-patient-requests/:id`

Files:

- `POST /api/files`

Staff auth:

- `POST /api/staff/auth/login`

Protected staff routes require:

```text
Authorization: Bearer <token>
```

Protected routes:

- `GET /api/appointment-requests`
- `GET /api/appointment-requests/:id`
- `PATCH /api/appointment-requests/:id/status`
- `GET /api/new-patient-requests`
- `GET /api/new-patient-requests/:id`

## Sample Requests

See:

- `docs/sample-curl.md`
- `docs/postman-collection.json`

## File Upload Flow

Appointment wizard uploads can be sent directly to:

```text
POST /api/appointment-drafts/:sessionToken/files
```

Standalone new-patient uploads can be created first:

```text
POST /api/files
```

Pass returned file ids as `uploadedFileIds` when creating `POST /api/new-patient-requests`.

## Notes for Production

- Use `npm run prisma:deploy` in deployed environments.
- This project uses the classic Prisma 5 datasource in `prisma/schema.prisma`; do not add `prisma.config.ts`.
- Store uploaded files on durable storage before scaling horizontally. The storage provider is abstracted in `src/storage/`.
- Protect list/detail/status routes with staff authentication before exposing beyond internal clinic users.
- `/health` is a readiness check and now probes the database before returning `200`.
