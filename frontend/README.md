# ScoutAI frontend

React + TypeScript + Vite. Start it with `make web` from the repo root (see the root README), or `npm run dev` here.

- Talks to the API at `VITE_API_BASE` (set in `.env`, default `http://127.0.0.1:8000`).
- Uploads go straight from the browser to S3 with a presigned URL. The bucket's CORS rules (in `infra/main.tf`) allow `http://localhost:5173` and `http://127.0.0.1:5173`.
- `npm run lint` and `npm run build` check types and lint.
