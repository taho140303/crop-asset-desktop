# Contributing

Thanks for your interest in contributing to Crop Asset Desktop! We welcome bug
reports, documentation improvements, and code contributions.

## Welcome

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. For
security issues, follow [SECURITY.md](SECURITY.md) rather than opening a public
issue.

## Report a bug

Open a bug report using the GitHub issue template. Include steps to reproduce,
expected and actual behavior, app version, operating system, and relevant
screenshots or logs. Remove private data from logs before sharing.

## Propose a feature

Use the feature request issue template. Explain the user need, the proposed
solution, and alternatives considered. For substantial work, discuss the
proposal in an issue before implementation.

## Development setup

### Prerequisites

- Node.js `22.22.1` (the version in `.nvmrc` and `.node-version`), with pnpm 9
  or later.
- Rust stable toolchain and Cargo, managed with [rustup](https://rustup.rs/).
- Tauri v2 platform prerequisites. On Linux, install the distribution's WebKitGTK
  4.1 development package (`webkit2gtk-4.1`), GTK 3, librsvg, and required build
  tools. Consult the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)
  for distribution-specific packages. On macOS install Xcode Command Line Tools;
  on Windows install Microsoft C++ Build Tools and WebView2.

### Clone and install

Fork the repository on GitHub, then clone your fork (replace `YOUR_USERNAME`):

```sh
git clone git@github.com:YOUR_USERNAME/crop-asset-desktop.git
cd crop-asset-desktop
pnpm install
```

To work directly from an authorized checkout, use the upstream SSH URL:

```sh
git clone git@github.com:taho140303/crop-asset-desktop.git
```

Run `pnpm dev` for the Vite frontend or `pnpm tauri dev` for the desktop app.
Run `pnpm build` for the production TypeScript and frontend build.

## Coding standards

Follow conventions in nearby code and keep changes focused. TypeScript is
configured for strict checking; preserve type safety and avoid `any` unless
justified. Use the repository's `.editorconfig` (UTF-8, LF, two-space
indentation). There is currently no formatter or linter script in
`package.json`; if one is introduced later, run the configured formatting and
lint checks rather than adding tools just for a contribution.

## Branches and commits

Create a descriptive branch from the current default branch, using
`feat/<short-description>` for features or `fix/<short-description>` for fixes
(for example, `feat/export-settings` or `fix/crop-boundary`). Documentation-only
work may use `docs/<short-description>`. Do not commit directly to the default
branch. Write clear commit messages; Conventional Commit prefixes such as
`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, and `test:` are encouraged.

## Pull requests and review

Push your branch to your fork and open a pull request against the upstream
default branch. Explain the motivation and user-visible changes, link related
issues, list validation performed, and include screenshots for UI changes. Keep
the PR focused and respond constructively to review feedback. At least one
maintainer approval is required before merge; do not merge your own contribution
unless explicitly authorized.

## Release process

Maintainers prepare releases after approved changes are merged. The release
process is to review merged changes, update the version and release
notes/summary, create and publish a versioned release, and attach platform build
artifacts. Contributors should include concise user-facing release-note details
in their pull request summary; maintainers determine what is included in each
release.

## Validation checklist

Before submitting, run:

```sh
pnpm build
```

Also test affected behavior in `pnpm tauri dev` when applicable. Report checks
that you could not run and the reason.

By submitting a contribution, you agree that it may be distributed under the
project's [MIT License](LICENSE).

## Debugging CI

### The `continue-on-error` trap (historical)

Before Sprint 7.60, `lint.yml` had `continue-on-error: true` at the job level.
This meant the **run-level** conclusion could be ✅ even when the **job** failed,
so pull requests showed red check-runs despite a green run. **This was removed in
Sprint 7.60.**

To verify CI status, always check step-level conclusions:

```bash
gh run view <run-id> --json jobs \
  --jq '.jobs[] | {name, conclusion, steps: [.steps[] | {name, conclusion}]}'
```

### Required status checks

Branch `main` requires:

- **Build and check** (from `ci.yml`)
- **Prettier and Markdown lint** (from `lint.yml`)

PRs must pass both before merging. `pnpm-lock.yaml` is intentionally excluded
from Prettier via `.prettierignore` (machine-generated).
