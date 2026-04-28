# ReadyABC

A children's literacy learning platform — Express + PostgreSQL + Prisma, with a
plain-JS frontend served by Express.

Built as a starting point for the full-stack endterm project. Kid-facing UI is
bright, large, and animated; parent dashboard is calm.

## Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL 16
- **ORM:** Prisma (migrations, type-safe queries, transactions)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing
- **Frontend:** plain HTML / CSS / JS (no build step), served by Express
- **Routing:** client-side hash router

## Run with Docker (recommended)

Single command — spins up Postgres, runs migrations, seeds curriculum, starts the app:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Run locally without Docker

You need a Postgres 16 server reachable via `DATABASE_URL`.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env if your Postgres uses different credentials

# 3. Apply migrations and seed the curriculum
npm run prisma:migrate     # creates tables
npm run db:seed            # inserts units, lessons, exercises, badges

# 4. Start the server
npm start
```

Useful Prisma commands:

| Command                       | What it does                                  |
|-------------------------------|-----------------------------------------------|
| `npm run prisma:generate`     | Regenerate the Prisma Client after schema edits |
| `npm run prisma:migrate`      | Create + apply a new migration in dev          |
| `npm run prisma:studio`       | Open the GUI database browser                  |
| `npm run db:seed`             | Re-seed curriculum (idempotent)                |
| `npm run db:reset`            | Wipe DB and replay all migrations + seed       |

## Admin panel

A platform admin user is created automatically by the seeder.

**Default admin credentials** (change in production!):

```
Email:    admin@readyabc.local
Password: admin123
```

Override via env vars before seeding:

```bash
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=supersecret npm run db:seed
```

Log in with these credentials at the normal `/login` page — the app detects the
`ADMIN` role and redirects you straight to `/admin`. You'll see:

- **Stat cards:** parents, learners, active today, lessons completed this week,
  total lessons, badges awarded, average completion rate, curriculum size
- **Parents table:** name, email, child count, join date
- **Learners table:** avatar, name, age, parent, XP, streak, progress bar, badges

Backend routes (`/api/v1/admin/*`) require both `authRequired` and `adminRequired`
middleware — non-admin tokens get a 403.

## Try it

1. Open `http://localhost:3000`
2. Register a parent → land on dashboard
3. Add a child (name, age 3–8, avatar)
4. Open the child profile → tap the first lesson
5. Answer the exercises → see results screen with stars, XP, badges, confetti
6. Notifications are written to the DB on each badge — visible via `prisma studio`

## Database schema (high level)

```
User (parent/admin)
 └─< Child
      ├─< Completion >─ Lesson ─< Exercise
      └─< ChildBadge  >─ Badge
 └─< Notification

Unit ─< Lesson ─< Exercise
```

Key design decisions:

- **No unique constraint on `(childId, lessonId)`** in `completions` — children may re-do lessons, and we want to keep history for the parent's progress chart.
- **Indexed lookups** on `parentId`, `(childId, lessonId)`, `(childId, completedAt)`, and `(userId, isRead)` to keep the parent dashboard queries fast.
- **`Exercise.options` is JSON** — different exercise types have different option shapes (strings for phonics/sight words, `{label, emoji}` for vocabulary). A polymorphic JSON field is simpler than a per-type table for a prototype.
- **Cascading deletes** so removing a parent cleanly removes their children, completions, badges, and notifications.

## API surface (v1)

All under `/api/v1`. Auth via `Authorization: Bearer <token>`.

| Method | Path                                    | Auth | Purpose                              |
|--------|-----------------------------------------|------|--------------------------------------|
| POST   | `/auth/register`                        | no   | Parent signup                        |
| POST   | `/auth/login`                           | no   | Parent login                         |
| GET    | `/auth/me`                              | yes  | Current parent                       |
| GET    | `/children`                             | yes  | List my children                     |
| POST   | `/children`                             | yes  | Create a child profile               |
| GET    | `/children/:id`                         | yes  | Read one child (mine only)           |
| DELETE | `/children/:id`                         | yes  | Delete a child                       |
| GET    | `/children/:id/curriculum`              | yes  | Units + lessons annotated locked/done|
| GET    | `/lessons/:id`                          | yes  | Lesson with exercises (no answers)   |
| POST   | `/exercises/:id/submit`                 | yes  | Check a single answer                |
| POST   | `/lessons/:id/complete`                 | yes  | Finalise XP, stars, badges, streak   |
| GET    | `/badges`                               | yes  | Full badge catalog                   |
| GET    | `/admin/stats`                          | admin| Platform-wide counts and activity    |
| GET    | `/admin/parents`                        | admin| Paginated parent list                |
| GET    | `/admin/children`                       | admin| Paginated learners with progress     |
| GET    | `/health`                               | no   | Health check                         |

## What's implemented vs. the assignment

**Done**
- Parent register/login, JWT, "me" endpoint
- Bcrypt password hashing (cost 10)
- Child profile CRUD with strict ownership checks
- Curriculum: 2 units, 4 lessons, 9 exercises across 3 types (phonics, sight words, vocabulary)
- Sequential lesson unlocking
- XP, stars (1–3), streak (with calendar-day diff), 4 badges with auto-award
- Lesson completion runs in a Prisma transaction so XP / streak / badges / notifications never end up half-written
- Notifications persisted on badge unlock (foundation for the WebSocket layer)
- Child UI with mascot, large rounded buttons, confetti, star drop animation
- Calm parent dashboard with kid cards

**Stubbed / next steps for the full project**
- Refresh tokens, password reset, email verification
- Admin role + curriculum CRUD UI (the `Role` enum and `isPublished` flag are already in the schema)
- WebSocket push to deliver notifications in real time
- Handwriting/tracing exercise (canvas)
- Charts on parent dashboard (Recharts/Chart.js): weekly XP, lesson completion line
- Tests: backend unit + integration ≥ 60% coverage, frontend component tests, 1 E2E (Playwright/Cypress)
- Swagger / OpenAPI at `/docs`
- CI pipeline + deploy (Render/Railway + Vercel/Netlify or single host)
- Audio cues, accessibility audit, Lighthouse ≥ 80 perf / ≥ 90 a11y

## Project layout

```
readyabc/
├─ docker-compose.yml         # Postgres + app
├─ Dockerfile                 # app image
├─ .env.example
├─ package.json
├─ prisma/
│  ├─ schema.prisma           # all models + relations + indexes
│  ├─ seed.js                 # curriculum + badges seeder (idempotent)
│  └─ migrations/             # generated by `prisma migrate dev`
├─ src/
│  ├─ server.js               # Express bootstrap + graceful Prisma shutdown
│  ├─ middleware/auth.js      # JWT helpers + authRequired
│  ├─ data/prisma.js          # singleton Prisma client
│  └─ routes/
│     ├─ auth.js
│     ├─ children.js
│     └─ curriculum.js        # units, lessons, submit, complete (transactional), badges
└─ public/
   ├─ index.html
   ├─ css/styles.css
   └─ js/
      ├─ api.js
      ├─ views.js
      └─ app.js
```

## Notes for the defence

- **Why Prisma?** Type-safe query builder, declarative schema, automatic migrations, great DX. The schema file IS the ERD.
- **Why JSON for `Exercise.options`?** Different exercise types have different option shapes. JSON keeps the schema simple; we validate at the API layer.
- **Why a transaction in `lesson/complete`?** XP, streak, completion record, badge awards, and notifications must succeed or fail together. Without it, a crash mid-handler could leave a child with XP but no completion record (or vice versa).
- **Why isolate `answer` server-side?** The lesson endpoint strips the `answer` field via destructuring before sending — children can't cheat by inspecting the network tab.
- **Lesson unlocking** uses a flat-ordered list across units, so completing the last lesson of unit 1 unlocks the first of unit 2.
- **Streak math** uses calendar-day diffs (`Math.round((today - last)/86400000)`) so timezones don't cause off-by-one errors mid-day.
