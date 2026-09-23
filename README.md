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

In development, the Vite dev server proxies any request starting with `/api` to the backend, so the frontend can use relative URLs. HTTP requests go through the shared axios instance in `frontend/src/api.ts` (base URL `/api`), e.g. `api.get('/health')`. The home page (`frontend/src/pages/HomePage.tsx`) calls `GET /api/health` and shows the backend status.

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
        ├── main.tsx        # renders the router
        ├── router.tsx      # route definitions
        ├── api.ts          # shared axios instance
        ├── components/
        │   └── Layout.tsx  # shared header/nav + <Outlet />
        └── pages/
            ├── HomePage.tsx
            └── NotFoundPage.tsx
```

## Routing

The frontend uses [React Router](https://reactrouter.com/) (data mode). All routes are defined in `frontend/src/router.tsx` as children of the shared `Layout`. To add a page:

1. Create a component in `frontend/src/pages/`.
2. Register it in the `children` array in `frontend/src/router.tsx`, e.g. `{ path: 'about', element: <AboutPage /> }`.
3. Optionally add a `NavLink` to it in `frontend/src/components/Layout.tsx`.

Unknown paths render `NotFoundPage` via the `*` route.

## Scripts

Run from the repo root:

| Command         | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm run dev`   | Run backend and frontend in watch mode                        |
| `npm run build` | Build backend (`backend/dist`) and frontend (`frontend/dist`) |
| `npm start`     | Run the built backend                                         |

Run a single app with `-w`:

```bash
npm run dev -w backend
npm run dev -w frontend
npm run lint -w frontend
```

## Configuration

| Variable | Default | Description         |
| -------- | ------- | ------------------- |
| `PORT`   | `3001`  | Backend listen port |

If you change the backend port, update the proxy target in `frontend/vite.config.ts` as well.
