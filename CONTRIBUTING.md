# Contributing

Thanks for your interest in contributing to Crop Asset Desktop! We welcome bug reports, documentation improvements, and code contributions.

## Welcome

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. For security issues, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.

## Report a bug

Open a bug report using the GitHub issue template. Include steps to reproduce, expected and actual behavior, app version, operating system, and relevant screenshots or logs. Remove private data from logs before sharing.

## Propose a feature

Use the feature request issue template. Explain the user need, the proposed solution, and alternatives considered. For substantial work, discuss the proposal in an issue before implementation.

## Development setup

### Prerequisites

- Node.js `22.22.1` (the version in `.nvmrc` and `.node-version`), with pnpm 9 or later.
- Rust stable toolchain and Cargo, managed with [rustup](https://rustup.rs/).
- Tauri v2 platform prerequisites. On Linux, install the distribution's WebKitGTK 4.1 development package (`webkit2gtk-4.1`), GTK 3, librsvg, and the required build tools; consult the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for exact packages for your distribution. On macOS install Xcode Command Line Tools; on Windows install Microsoft C++ Build Tools and WebView2.

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

Run `pnpm dev` for the Vite frontend or `pnpm tauri dev` for the desktop app. Run `pnpm build` for the production TypeScript and frontend build.

## Coding standards

Follow the conventions in nearby code and keep changes focused. TypeScript is configured for strict checking; preserve type safety and avoid `any` unless justified. Use the repository's `.editorconfig` (UTF-8, LF, two-space indentation). There is currently no formatter or linter script in `package.json`; if one is introduced later, run the configured formatting and lint checks rather than adding tools just for a contribution.

## Branches and commits

Create a descriptive branch from the current default branch, for example `feat/export-settings`, `fix/crop-boundary`, or `docs/contributing`. Do not commit directly to the default branch. Write clear commit messages; Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, and `test:` are encouraged.

## Pull requests and review

Push your branch to your fork and open a pull request against the upstream default branch. Explain the motivation and user-visible changes, link related issues, list validation performed, and include screenshots for UI changes. Keep the PR focused and respond constructively to review feedback. Maintainer approval is required before merge; do not merge your own contribution unless explicitly authorized. Maintainers handle release notes and release publication.

## Validation checklist

Before submitting, run:

```sh
pnpm build
```

Also test the affected behavior in `pnpm tauri dev` when applicable. Report checks that you could not run and the reason.

By submitting a contribution, you agree that it may be distributed under the project's [MIT License](LICENSE).
