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
- `npm run owners:audit` - print duplicate-owner groups by normalized phone without modifying data.
- `npm run owners:merge` - merge duplicate-owner groups by normalized phone. This is destructive and should be run only after reviewing the audit output.

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` - Neon pooled PostgreSQL connection string. Use the pooler host and include SSL settings.
- `DIRECT_URL` - Neon direct PostgreSQL connection string for Prisma migrations.
- `CORS_ORIGIN` - frontend origin list separated by commas, or `*` for development.
- `STORAGE_PROVIDER` - `local` for development or `s3` for durable object storage.
- `UPLOAD_DIR` - local upload folder.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` - required when `STORAGE_PROVIDER=s3`.
- `S3_KEY_PREFIX` - optional object key prefix. Defaults to `uploads`.
- `S3_PUBLIC_BASE_URL` - optional public base URL if you want upload records to include a direct public URL.
- `S3_FORCE_PATH_STYLE` - optional boolean for S3-compatible providers that require path-style requests.
- `MAX_UPLOAD_MB` - upload limit. Defaults to 10.
- `DRAFT_EXPIRY_HOURS` - draft expiry window.
- `UNATTACHED_FILE_EXPIRY_HOURS` - expiry window for files uploaded through `/api/files` before they are attached to a request.
- `DUPLICATE_WINDOW_HOURS` - short duplicate-detection window.
- `CLINIC_NOTIFICATION_EMAIL` - one clinic notification recipient, or a comma-separated list.
- `MAIL_FROM` and SMTP settings for Nodemailer.
- `STAFF_DASHBOARD_URL` - staff dashboard origin used in secure staff invitation links, for example `https://your-staff-dashboard.example`.
- `JWT_SECRET` - long random secret for signing staff JWTs. Use at least 32 characters.
- `JWT_EXPIRES_IN` - staff token lifetime, for example `8h`.
- `JWT_ISSUER` and `JWT_AUDIENCE` - JWT scope values used when signing and verifying staff tokens.
- `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`, and `GOOGLE_CALENDAR_ID` - Google Calendar OAuth credentials and the shared clinic calendar ID used when staff confirms appointments.
- `PET_CARE_NEWSLETTER_ENABLED` - feature flag for the Pet Care newsletter Brevo double-opt-in endpoint. Defaults to `false`.
- `BREVO_API_KEY` - server-only Brevo API key. Add this directly in Render; do not expose it to frontend code.
- Pet Care veterinary review invitations use the same Brevo API key and `MAIL_FROM` sender. The assigned reviewer must have an email address in the staff dashboard before an invitation can be sent.
- `BREVO_PET_CARE_LIST_ID` - Brevo list id for `Lili Vet Pet Care Subscribers`.
- `BREVO_DOI_TEMPLATE_ID` - Brevo double-opt-in confirmation template id.
- `BREVO_DOI_REDIRECT_URL` - HTTPS page Brevo should send users to after confirmation.
- `BREVO_PET_PREFERENCE_ATTRIBUTE` - Brevo contact attribute used for `DOG`, `CAT`, or `BOTH`. Defaults to `PET_PREFERENCE`.
- `BREVO_API_BASE_URL` - Brevo API base URL. Defaults to `https://api.brevo.com/v3`.
- `STAFF_SEED_EMAIL` and `STAFF_SEED_PASSWORD` - admin staff credentials used by the seed script.

In production, the server refuses to start if `JWT_SECRET` or `STAFF_SEED_PASSWORD` is still using the default bootstrap value.

When `PET_CARE_NEWSLETTER_ENABLED=true`, startup validates all required Brevo configuration and fails closed if anything is missing. When the feature is disabled, blank Brevo values do not block the rest of the API.

## Important API Rules

- Database and API use `Owner`, even if the frontend labels this section as parent information.
- Appointment requests are created with `PENDING_REVIEW`.
- Staff confirmation stores an explicit confirmed start/end/timezone separate from the client's preferred selections.
- Confirmed appointments sync one-way into the configured shared Google Calendar. Calendar sync failures do not roll back the staff confirmation; they are stored on the request and can be retried.
- The wizard stores partial draft data separately from final appointment requests.
- Urgent care requests are treated as clinic-review requests, not life-threatening emergency confirmations.
- Uploads accept only PDF, JPG, and PNG, up to `MAX_UPLOAD_MB`.
- Uploads validate both the declared MIME type and the file signature bytes on the server.
- `preferredSelections` stores up to three preferred dates, each with one to three `HH:mm` time slots, and must be sent with an IANA `timezone`.
- Appointment list date filtering is performed against normalized `YYYY-MM-DD` preferred-date keys so pagination stays consistent across pages.
- Duplicate detection flags likely duplicates using phone/email plus pet name within the configured short time window.
- Owner phone normalization is backfilled and indexed in production-safe fashion. Existing duplicate owners are tolerated during rollout and should be cleaned up in a follow-up data pass before enforcing uniqueness.
- Staff access uses a database-backed permission model. Current `ADMIN` users migrate to `SUPER_ADMIN`; existing `STAFF` users retain appointment and new-patient access. Super Admins manage invitations and permissions from the dashboard. Set `STAFF_DASHBOARD_URL` before sending invitations in production.

## Owner Duplicate Cleanup

Use the one-off duplicate owner script before enforcing unique normalized phones:

```bash
npm run owners:audit
```

To restrict the audit or merge to one phone group:

```bash
npm run owners:audit -- --phone=2105550101
npm run owners:merge -- --phone=2105550101
```

The merge mode:
- keeps the oldest owner in each normalized-phone group as canonical
- reassigns appointment requests and new-patient requests to the canonical owner
- reassigns pets to the canonical owner
- merges matching pets by case-insensitive `name + species`
- fills missing canonical owner and pet fields conservatively

Run the audit first. Review the JSON output before using `owners:merge`.

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
- `POST /api/appointment-requests/:id/calendar-sync`

New-patient requests:

- `POST /api/new-patient-requests`
- `GET /api/new-patient-requests`
- `GET /api/new-patient-requests/:id`

Pet Care newsletter:

- `POST /api/pet-care/newsletter-subscriptions`

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
- `POST /api/appointment-requests/:id/calendar-sync`
- `GET /api/new-patient-requests`
- `GET /api/new-patient-requests/:id`

## Google Calendar Setup

This integration is one-way in v1: the backend writes confirmed appointments into one shared clinic Google Calendar after staff confirms a slot in the admin dashboard.

1. Create or choose a dedicated clinic Google account that owns the shared calendar.
2. Create an OAuth client in Google Cloud with Calendar API enabled.
3. Generate a refresh token for that clinic account with Calendar write access.
4. Set these environment variables in the deployed backend:

```text
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=
```

5. Staff can then confirm appointments from the dashboard by entering:
   - confirmed start datetime
   - confirmed end datetime
   - confirmed timezone

When sync succeeds, the request stores the Google event id and URL. If sync fails, the request remains confirmed and the dashboard exposes a retry action.

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

## Pet Care Newsletter Setup

The public Pet Care newsletter uses Brevo double opt-in. The browser sends the signup to this backend, and only the backend talks to Brevo.

Manual Brevo setup required:

1. Create or choose the main list: `Lili Vet Pet Care Subscribers`.
2. Create a contact attribute named `PET_PREFERENCE` with allowed values `DOG`, `CAT`, and `BOTH`.
3. Create and approve a double-opt-in confirmation template.
4. Verify the sender and sending domain in Brevo.
5. Set the confirmation redirect URL to `https://liliveterinaryhospital.com/pet-care?subscription=confirmed`.
6. Add the env vars in Render, keeping `BREVO_API_KEY` server-only.
7. Set `PET_CARE_NEWSLETTER_ENABLED=true` only after the list id, template id, redirect URL, and API key are configured.

Sample request:

```bash
curl -X POST "https://lilivet.onrender.com/api/pet-care/newsletter-subscriptions" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","petPreference":"DOG","consent":true,"source":"pet-care-library","website":""}'
```

Successful requests return `202 Accepted` with `status: "confirmation_required"`. The response intentionally does not reveal whether an address already exists. Brevo failures return a generic `503`; logs include a safe correlation id and masked/hash email only.

## Pet Care Publishing Workflow

Pet Care articles are managed by administrators at `/pet-care` in the staff dashboard. The enforced lifecycle is:

```text
DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED -> ARCHIVED
```

- A veterinary reviewer must be assigned before an article can enter review.
- Approval records the medical review date and sets the next review deadline one year later.
- Only approved, medically reviewed articles can be published.
- Editing approved or published medical content returns it to draft for a new review.
- Public endpoints return published articles only: `GET /api/pet-care/articles` and `GET /api/pet-care/articles/:slug`.

For the first production rollout, deploy the migration and then import the existing checked-in library:

```text
npm run prisma:deploy
npm run pet-care:seed
```

The seed is idempotent. It preserves the current article slugs and marks the existing catalog as published with its named reviewer and recorded review dates.

## Notes for Production

- Use `npm run prisma:deploy` in deployed environments.
- This project uses the classic Prisma 5 datasource in `prisma/schema.prisma`; do not add `prisma.config.ts`.
- Store uploaded files on durable storage before scaling horizontally. The storage provider is abstracted in `src/storage/`.
- Protect list/detail/status routes with staff authentication before exposing beyond internal clinic users.
- `/health` is a readiness check and now probes the database before returning `200`.
