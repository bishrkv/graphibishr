# Bishr KV Portfolio

This portfolio now saves admin work items permanently to `data/works.json` through a small local Node.js server.

## Run

```powershell
npm start
```

Then open `http://localhost:3000`.

## What changed

- Admin add/edit/delete actions now persist to disk.
- Works are loaded from `GET /api/works`.
- Saves are written through `PUT /api/works`.
