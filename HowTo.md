# HowTo — Build, Bump & Publish

A concise guide for releasing `@sysid/mmdlint` to npm. All commands run from the repo root; `make help` lists every target.

## Prerequisites

- **Node.js** ≥ 20 (`node --version`)
- **npm** account with publish rights to `@sysid` (`npm login`)
- [**bump-my-version**](https://github.com/callowayproject/bump-my-version) on `PATH` (`pipx install bump-my-version`)
- **gh** CLI authenticated, and `GITHUB_TOKEN` exported — used to create the GitHub release

```bash
make install   # npm install
```

## Install locally

To use the `mmdlint` command on your machine straight from this repo:

```bash
make link      # build + npm link → global `mmdlint` symlinked to dist/
make unlink    # remove it
```

`npm link` symlinks the package into your global prefix (`$(npm config get prefix)`), so rebuilds (`make build`) take effect with no re-link. Once published, anyone can instead install the released version with `npm install -g @sysid/mmdlint`.

## Build

```bash
make build     # npx tsc → dist/
make clean      # rm -rf dist
```

`dist/` is gitignored and is regenerated on publish (`prepublishOnly` runs the build). Before any release, run the full gate:

```bash
make check     # lint + typecheck + test (biome, tsc --noEmit, vitest)
```

## Bump

Version lives in `VERSION` and `package.json`, kept in sync by `.bumpversion.toml`. Pick the SemVer level:

```bash
make bump-patch   # 0.1.0 → 0.1.1
make bump-minor   # 0.1.0 → 0.2.0
make bump-major   # 0.1.0 → 1.0.0
```

Each target (requires `GITHUB_TOKEN`):

1. `bump-my-version bump --commit --tag` — edits `VERSION` + `package.json`, commits, tags `v<new>`
2. `git push && git push --tags`
3. `gh release create v<new> --generate-notes`

## Publish

```bash
make publish   # runs `check`, verifies npm login, then `npm publish --access public`
```

`publish` does **not** bump — release order is: `make check` → `make bump-<level>` → `make publish`.

## One-shot release

```bash
make bump-patch && make publish
```
