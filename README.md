# BSP Takehome

A full-stack TypeScript app. The running app is at [https://bsp-takehome.onrender.com/](https://bsp-takehome.onrender.com/).

- **backend/** - Node.js + Express API
- **frontend/** - React app built with Vite

**Contents**

- [Prerequisites](#prerequisites)
- [Local database](#local-database)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Routing](#routing)
- [UI](#ui)
- [Scripts](#scripts)
- [Linting and formatting](#linting-and-formatting)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Architecture](#architecture)
  - [How a brief moves through the app](#how-a-brief-moves-through-the-app)
  - [Data schema](#data-schema)
  - [API](#api)
  - [Adding a brief field](#adding-a-brief-field)
- [Key tradeoffs](#key-tradeoffs)
- [What this does not include](#what-this-does-not-include)
- [What I would do next with more time](#what-i-would-do-next-with-more-time)
- [What I would add for production](#what-i-would-add-for-production)
- [Where AI coding tools helped](#where-ai-coding-tools-helped)
- [Docs](#docs)

## Prerequisites

- Node.js 22 or newer (includes npm)
- Docker, for the local Postgres database

## Local database

Briefs and uploaded files are stored in Postgres. Start a database and copy the example environment file:

```bash
docker compose up -d
cp .env.example .env
```

`.env.example` sets `DATABASE_URL` to `postgres://bsp:bsp@localhost:5432/bsp`. The backend dev script loads that file. Production does not: the host injects `DATABASE_URL` and `PORT`.

## Getting started

Install dependencies for both apps from the repo root (npm workspaces):

```bash
npm install
```

Start the backend and frontend together:

```bash
npm run dev
```

| App      | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3001 |

In development, the Vite dev server proxies any request starting with `/api` to the backend, so the frontend can use relative URLs. HTTP requests go through the shared axios instance in `frontend/src/api.ts` (base URL `/api`), e.g. `api.get('/health')`. The header shows that health check as a status button. The home page lists briefs from `GET /api/briefs`.

## Project structure

```
.
├── package.json        # workspaces + root scripts
├── backend/
│   ├── src/index.ts    # Express server entry point
│   └── tsconfig.json
└── frontend/
    ├── index.html
    ├── vite.config.ts  # dev server + /api proxy
    └── src/
        ├── main.tsx        # theme provider + router
        ├── router.tsx      # route definitions
        ├── api.ts          # shared axios instance
        ├── types.ts        # brief response types
        ├── theme.ts        # MUI theme (light/dark color schemes)
        ├── components/
        │   ├── Layout.tsx              # shared app bar/nav + <Outlet />
        │   ├── ColorModeToggle.tsx     # light/dark mode switch
        │   ├── BackendStatusButton.tsx # header backend health status
        │   └── AddBriefDialog.tsx      # create-brief modal
        └── pages/
            ├── HomePage.tsx    # briefs list
            ├── BriefPage.tsx   # /brief/:id
            └── NotFoundPage.tsx
```

## Routing

The frontend uses [React Router](https://reactrouter.com/) (data mode). All routes are defined in `frontend/src/router.tsx` as children of the shared `Layout`. To add a page:

1. Create a component in `frontend/src/pages/`.
2. Register it in the `children` array in `frontend/src/router.tsx`, e.g. `{ path: 'about', element: <AboutPage /> }`.
3. Optionally add a `NavLink` to it in `frontend/src/components/Layout.tsx`.

Unknown paths render `NotFoundPage` via the `*` route.

## UI

The frontend uses [MUI](https://mui.com/material-ui/) (Material UI) with the Inter font. The theme lives in `frontend/src/theme.ts`. It defines separate light and dark color schemes and sets component defaults, such as flat buttons with no text transform and bordered paper instead of shadows. Change it there instead of styling individual components.

The theme uses CSS variables, so style with theme tokens (for example `sx={{ color: 'text.secondary' }}` or `theme.vars.palette.*`) and colors will follow the active mode. Import components from their own path (`import Button from '@mui/material/Button'`).

The mode starts from the OS preference. The toggle in the app bar (`ColorModeToggle`) switches between light and dark, and MUI saves the choice in `localStorage`.

## Scripts

Run from the repo root:

| Command                | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Run backend and frontend in watch mode                        |
| `npm run build`        | Build backend (`backend/dist`) and frontend (`frontend/dist`) |
| `npm start`            | Run the built backend                                         |
| `npm test`             | Run the backend tests                                         |
| `npm run lint`         | Lint the whole repo with oxlint                               |
| `npm run lint:fix`     | Lint and auto-fix what oxlint can                             |
| `npm run format`       | Format the whole repo with Prettier                           |
| `npm run format:check` | Check formatting without writing changes                      |

Run a single app with `-w`:

```bash
npm run dev -w backend
npm run dev -w frontend
npm run lint -w frontend
```

## Linting and formatting

- [oxlint](https://oxc.rs/docs/guide/usage/linter) is configured in `.oxlintrc.json` at the repo root. Shared rules sit at the top level, and frontend (React) and backend (Node) rules go in `overrides`.
- [Prettier](https://prettier.io/) is configured in `.prettierrc.json`.
- A [husky](https://typicode.github.io/husky/) pre-commit hook runs [lint-staged](https://github.com/lint-staged/lint-staged). On staged files, it formats with Prettier and runs `oxlint --fix --deny-warnings`, so lint errors and warnings block the commit. The hook is installed automatically by `npm install` through the `prepare` script.

## Configuration

| Variable             | Default                                  | Description                                                                                                                                                                            |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       |                                          | Postgres connection string. Required.                                                                                                                                                  |
| `DATABASE_SSL`       |                                          | Set to `true` to connect with TLS without verifying the server certificate. Also enabled when `DATABASE_URL` includes `sslmode=require`, `verify-ca`, or `verify-full`.                |
| `OPENROUTER_API_KEY` |                                          | OpenRouter API key used to analyze briefs. Without it, each analysis is saved with an error status.                                                                                    |
| `OPENROUTER_MODEL`   | `nvidia/nemotron-3-super-120b-a12b:free` | Primary OpenRouter model. Other free models are used as fallbacks.                                                                                                                     |
| `PORT`               | `3001`                                   | Backend listen port                                                                                                                                                                    |
| `STATIC_DIR`         | `frontend/dist`                          | Built frontend to serve. Resolved from the repo layout, not the process working directory. Skipped when that folder has no `index.html`, which is the case during local `npm run dev`. |

If you change the backend port, update the proxy target in `frontend/vite.config.ts` as well.

## Deployment

The deployed app is [https://bsp-takehome.onrender.com/](https://bsp-takehome.onrender.com/) (Render).

One Node process serves the API and the built frontend. The Dockerfile builds both workspaces and starts the backend with `npm start`. Railway, Render, and Fly.io can build that image directly. Create a Postgres database on the host and set `DATABASE_URL`. For hosted databases that require TLS, include `sslmode=require` in the URL or set `DATABASE_SSL=true`. Point the platform health check at `GET /api/health`.

- **Railway:** New project from this repo (it uses the Dockerfile). Add Postgres and set the app's `DATABASE_URL` from that database. The app listens on `PORT`.
- **Render:** New Web Service with the Docker environment, plus a Render Postgres instance. Use the internal database URL as `DATABASE_URL`.
- **Fly.io:** `fly launch` from this repo, then `fly postgres create` and `fly postgres attach` so `DATABASE_URL` is set. Do not run a second process for the frontend.

Set `OPENROUTER_API_KEY` on the host or every analysis is saved as an error. The default models are free-tier OpenRouter models, about 20 requests per minute and 50 per day, so a busy demo can hit that cap and show an analysis error instead of a result.

## Architecture

One Node process serves the API and, when `frontend/dist` exists, the built UI. In development, Vite on port 5173 proxies `/api` to the backend. Postgres stores briefs and analyses. Migrations in `backend/migrations/` run on startup.

### How a brief moves through the app

1. **Submit.** The add-brief dialog posts multipart form data to `POST /api/briefs`. Title, description, content type, target audience, and notes may be blank. A PDF, DOCX, or plain text file is required, at most 10 MB.
2. **Store.** The route checks the file bytes and the text lengths, then inserts a row in `briefs`. The file is stored on that row (`file_bytes`), not in object storage.
3. **Analyze.** Saving the brief queues an analysis and returns immediately (`201` on create, `200` on update). The model call continues after the response. `SYSTEM_PROMPT` in [`backend/src/analysis/run.ts`](backend/src/analysis/run.ts) is the prompt. The request asks OpenRouter for JSON matching the schema from [`backend/src/analysis/schema.ts`](backend/src/analysis/schema.ts). PDFs are sent to OpenRouter's file parser. DOCX is converted to text with mammoth. Plain text is sent as text.
4. **Validate.** The response is parsed as JSON and checked with `ModelResponse.safeParse` before anything is treated as an analysis. On success, blank brief fields are filled from the model's `extracted` object and the rest is stored as `result`. On timeout, malformed JSON, or a schema mismatch, the analysis row is saved as `error` with a short message. The UI never receives an unvalidated result.
5. **Render.** The brief page loads `GET /api/briefs/:id` and `GET /api/briefs/:id/analysis`. While the latest analysis is `pending`, the panel polls every 3 seconds. A successful result renders themes, audience, strengths, risks, and next actions. An error renders the saved message and keeps the previous successful result on screen.

Editing a brief supersedes a pending run: the old row becomes `error` (`Superseded by a newer analysis`), its model call is aborted, and a new pending row is inserted. Failure behavior for uploads, HTTP, analysis, and each screen is listed in [`docs/edge-cases.md`](docs/edge-cases.md).

### Data schema

`briefs`

| Column                                                             | Meaning                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| `id`                                                               | UUID primary key                                      |
| `title`, `description`, `content_type`, `target_audience`, `notes` | Text. Empty string when the user left the field blank |
| `file_name`, `file_mime`, `file_size`, `file_bytes`                | The uploaded file                                     |
| `created_at`, `updated_at`                                         | Timestamps                                            |

`brief_analyses`

| Column                       | Meaning                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| `id`, `brief_id`             | UUID, and a foreign key to `briefs` with `ON DELETE CASCADE`            |
| `status`                     | `pending`, `succeeded`, or `error`. At most one `pending` row per brief |
| `model`                      | OpenRouter model id, when the call started                              |
| `result`                     | Validated analysis JSON, without the `extracted` object                 |
| `error`, `raw_response`      | Set when status is `error`                                              |
| `created_at`, `completed_at` | Timestamps                                                              |

The JSON in `result` matches `BriefAnalysis` in [`backend/src/analysis/schema.ts`](backend/src/analysis/schema.ts): `themes`, `audience`, `strengths`, `risks` (`kind` and `severity`), and `nextActions` (`priority`). The model also returns `extracted` (title, description, content type, audience, notes). That object is applied to blank columns on `briefs` and is not stored on the analysis.

API responses use camelCase (`contentType`, `targetAudience`, `createdAt`). The database uses snake_case.

### API

All routes are under `/api`. Errors are `{ "error": "..." }` plus an HTTP status. A 500 body does not include the stack trace.

| Method   | Path                       | Result                                                                                                                              |
| -------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/health`              | `{ "status": "ok" }`, or `503` when Postgres is down                                                                                |
| `GET`    | `/api/briefs`              | List of briefs, newest first, without file bytes                                                                                    |
| `POST`   | `/api/briefs`              | Create a brief and queue analysis. `201` with the brief. `analysisError` is set when the brief was saved but analysis did not start |
| `GET`    | `/api/briefs/:id`          | One brief, or `404`                                                                                                                 |
| `PATCH`  | `/api/briefs/:id`          | Update text fields and, optionally, replace the file. Queues a new analysis when something changed                                  |
| `DELETE` | `/api/briefs/:id`          | `204`. Aborts an in-flight model call                                                                                               |
| `GET`    | `/api/briefs/:id/file`     | Download the file                                                                                                                   |
| `GET`    | `/api/briefs/:id/analysis` | `{ latest, latestSucceeded }`                                                                                                       |
| `POST`   | `/api/briefs/:id/analysis` | Start a run. `202` with the pending row, or `409` if one is already pending                                                         |

### Adding a brief field

To add a text field such as `budget`:

1. Add a numbered SQL file in `backend/migrations/` with the new column. Do not put `CREATE` or `ALTER` in TypeScript. Startup applies pending files.
2. Add the property to `Brief`, `BriefText`, and `BriefPatch` in [`backend/src/store/types.ts`](backend/src/store/types.ts).
3. Add a row to `FIELDS` in [`backend/src/briefFields.ts`](backend/src/briefFields.ts) so create, update, and length checks pick it up. Clip it in `clipBriefText`.
4. Include the column in `BRIEF_COLUMNS`, the insert, the update, and `fillBlankBriefFields` in [`backend/src/store/briefs.ts`](backend/src/store/briefs.ts). Map the snake_case column in `asBrief`.
5. If the model should read it from the file, add it to `ExtractedBrief` in [`backend/src/analysis/schema.ts`](backend/src/analysis/schema.ts), mention it in `SYSTEM_PROMPT`, and add a line in the form-field block in [`backend/src/analysis/run.ts`](backend/src/analysis/run.ts).
6. Mirror the property on `Brief` and `BriefFormValues` in [`frontend/src/types.ts`](frontend/src/types.ts) and [`frontend/src/briefForm.ts`](frontend/src/briefForm.ts), add an input in [`frontend/src/components/brief/BriefFormFields.tsx`](frontend/src/components/brief/BriefFormFields.tsx), and show it from [`frontend/src/components/brief/BriefSidebar.tsx`](frontend/src/components/brief/BriefSidebar.tsx) or the home table.

A new analysis section (rather than a brief field) is a change to `BriefAnalysis` in the schema, the prompt, and a component under `frontend/src/components/analysis/`. The same Zod object is what the UI types expect.

## Key tradeoffs

- **A file is required, and the text fields are optional.** Creative briefs usually arrive as a document. The model fills blank title, description, content type, audience, and notes from that file, and it does not overwrite a value the user already saved. Someone with only a sentence and no file cannot submit.
- **Free OpenRouter models, not Anthropic or OpenAI.** Those two APIs are not dependably free. The comparison is in [`docs/llm-provider-comparison.md`](docs/llm-provider-comparison.md). The default model is `nvidia/nemotron-3-super-120b-a12b:free`, with other free models as fallbacks, overridable with `OPENROUTER_MODEL`. Output quality varies, and the free tier is rate limited. The schema is checked in our process because those models do not guarantee JSON.
- **The HTTP request does not wait for the model.** Create and update return as soon as the pending row exists. The page polls. A 90 second OpenRouter timeout, a bad JSON body, or a schema mismatch becomes an analysis error the user can read. There is no automatic retry. A wrong shape is a failed analysis, not a second guess.
- **One process and one database.** The API and the built frontend ship in the same image, and uploaded files live in Postgres. That is enough for a demo. It is a poor fit for large files or more than one app instance serving the same uploads from disk, which is why the bytes are in the database rather than on local disk.

## What this does not include

- Accounts, login, or permissions. Anyone who can open the app can read and edit every brief.
- Live multi-user review. Two people can use the app at once, but there is no shared cursor, comment thread, or push update.
- A cheaper-versus-richer model route. Every brief uses the same OpenRouter model list.
- Image or asset URL metadata. The upload path accepts PDF, DOCX, and plain text only.
- Error tracking beyond server logs and the analysis `error` column. `GET /api/health` is the observability that is actually built.
- Paid models, a retry when validation fails, and object storage for files.

## What I would do next with more time

- Let a brief be saved from the form alone, with the file optional, so a producer can start from a logline.
- Ship a few sample briefs of different quality so the risks and missing-information sections are obvious in a demo.
- Add comments on a brief, which is the collaboration feature this team would ask for first.
- Send a short or vague brief to the fast free model and a long one to a stronger paid model, using the same schema either way.
- Accept an image or a link to a frame, board, or cut as part of the brief.

## What I would add for production

The repo already runs oxlint with warnings denied, Prettier, a pre-commit hook, and GitHub Actions that lint, check formatting, run `npm test`, and `npm run build` (that build typechecks both apps). Beyond that:

- Integration tests against Postgres for create, the one-pending-analysis rule, and "a superseded run cannot overwrite a newer result." The current tests cover parsing, validation, and field limits without a database.
- A small set of fixture briefs, reviewed by a person, so a prompt or schema change is judged on whether the team could act on the output, not only on whether the JSON parses.
- Secret scanning and dependency review on pull requests. Production secrets stay in the host's environment, as they do here.
- Structured logs, an error tracker, and rate limits on create and on the model call. The health check is not a substitute for those.
- Auth in front of the briefs, and file bytes in object storage once uploads are larger than a demo. A second app instance can already read files, because the bytes are in Postgres. It cannot cancel a model call running in another process: that abort map is in memory.
- For AI-assisted changes: the prompt and the Zod schema stay in the repo and are reviewed like code. A change to validation, error copy, or the prompt needs a test, and CI must pass typecheck, lint, and tests before merge. A model response that fails the schema is never stored as success and never rendered. Cursor rules in `.cursor/rules` are the local version of that bar; they are not a substitute for CI.

## Where AI coding tools helped

Cursor was used to implement the app, with the conventions in `.cursor/rules` (workspaces, Express and React structure, small files). The model choice was written up first in [`docs/llm-provider-comparison.md`](docs/llm-provider-comparison.md), and the integration follows that note: OpenRouter, a JSON schema generated from Zod, PDF parsing on the provider, DOCX converted locally.

What was checked by hand, in tests, or in CI rather than taken from generated code:

- Model output is validated with `ModelResponse.safeParse` before it is stored. [`backend/src/analysis/schema.test.ts`](backend/src/analysis/schema.test.ts) rejects a risk severity outside the enum.
- Timeouts, invalid JSON, and schema failures are saved on the analysis row and shown in the panel. The cases are listed in [`docs/edge-cases.md`](docs/edge-cases.md).
- `npm test` covers that schema, field limits, and the analysis helpers. `.github/workflows/ci.yml` runs lint with warnings denied, Prettier, those tests, and `npm run build`.

The prompt asks for themes, audience, strengths, risks, and next actions that are specific to the brief. A generic summary would still pass the schema, so the useful part is the prompt and the way the UI presents severity and priority, not the validator alone.

## Docs

- [Edge cases](docs/edge-cases.md). Uploads, HTTP errors, analysis failures, and what each screen shows when something goes wrong.
- [LLM provider comparison](docs/llm-provider-comparison.md). Why the demo uses OpenRouter free models instead of Anthropic or OpenAI.
