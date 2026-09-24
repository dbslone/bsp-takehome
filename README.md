# BSP Takehome

A full-stack TypeScript app:

- **backend/** - Node.js + Express API
- **frontend/** - React app built with Vite

## Prerequisites

- Node.js 22 or newer (includes npm)

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

| Variable   | Default | Description                                                          |
| ---------- | ------- | -------------------------------------------------------------------- |
| `PORT`     | `3001`  | Backend listen port                                                  |
| `DATA_DIR` | `data`  | Directory for brief files, relative to the backend working directory |

If you change the backend port, update the proxy target in `frontend/vite.config.ts` as well.
