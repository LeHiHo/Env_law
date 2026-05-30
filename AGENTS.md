# AGENTS.md

## Workflow

1. Analyze first.
2. Make a plan.
3. Make minimal changes only.
4. Run tests.
5. Summarize changes.

## Rules

- Never use `any`.
- Do not modify unrelated files.
- Keep functions under 50 lines.
- Ask before deleting files.

## Planning Docs

- When a plan is finalized, save it as a Korean markdown file under `docs/plans/`.
- Use the `YYYY-MM-DD-topic.md` filename format.
- Keep the plan concise and implementation-ready.
- After implementation, append a completion report to the same document and preserve it.
- Include a one-line commit-log-style summary in the completion report.
- Follow the Conventional Commits header style: `<type>[optional scope]: <description>`.
- Prefer the common Conventional Commits and Angular-style types:
  - `feat:` for a new feature.
  - `fix:` for a bug fix.
  - `docs:` for documentation-only changes.
  - `style:` for formatting or code style changes that do not affect behavior.
  - `refactor:` for code changes that neither fix a bug nor add a feature.
  - `perf:` for performance improvements.
  - `test:` for adding or correcting tests.
  - `build:` for build system or dependency changes.
  - `ci:` for CI configuration or pipeline changes.
  - `chore:` for maintenance work that does not modify production code.
  - `revert:` for reverting a previous change.
- Use `env:` only for this project when the change is primarily about local environment variables, secrets wiring, or runtime configuration; otherwise prefer `build:`, `ci:`, or `chore:`.
- Mark breaking changes with `!` before the colon, for example `feat(api)!: change response shape`.
