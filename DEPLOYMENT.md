# Deployment

The production site is deployed from `main` through GitHub Pages.

## Release checks

Every deployment runs:

```bash
npm install
npm run lint
npm test
npm run build
```

The application uses `HashRouter` and relative Vite assets, so dashboard routes and static files work when hosted under the repository path.

## Data warning

FAI v0.2 stores team data locally in the active browser. Export a CSV backup before clearing browser storage or switching devices. Shared authenticated cloud storage is tracked separately and must not use anonymous public write policies.
