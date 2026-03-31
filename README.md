# Pendulum Animation Codex

Standalone educational pendulum simulator built with TypeScript, Canvas 2D, and Vite.

Recommended GitHub repository name: `nonlinear-pendulum-simulator`

## What it includes

- Deterministic fixed-step pendulum simulation
- Angular and Cartesian simulation modes
- Selectable graphs with fixed 10,000-point ring buffers
- Live instantaneous and derived metrics
- In-canvas force and energy overlays
- Optional compressed time-axis plotting to keep graphs on one screen
- Documentation for physics assumptions and validation checks

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Vite is configured with a relative `base` path so the output is static-deploy friendly.

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that builds the app and publishes `dist/` to GitHub Pages on every push to `main`.

Suggested setup:

```bash
git init
git add .
git commit -m "Initial pendulum simulator"
git branch -M main
gh repo create nonlinear-pendulum-simulator --public --source=. --remote=origin --push
```

Then in GitHub:

1. Open the repository settings.
2. Go to `Pages`.
3. Set the source to `GitHub Actions` if GitHub prompts for a Pages source.
4. Push future changes to `main` and let the workflow deploy automatically.

The final site URL will typically be:

```text
https://<your-github-username>.github.io/nonlinear-pendulum-simulator/
```

## Determinism statement

The simulator advances only through a fixed `dt` and a deterministic update order. Given the same parameters, initial state, and step size, the app will generate the same sampled trajectory and graph data across runs in the same runtime environment.
