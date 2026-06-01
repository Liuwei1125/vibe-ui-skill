# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 - 2026-06-01

### Added

- Initial Vibe UI skill for local-first `DESIGN.md` workflows.
- 18 curated built-in styles for high-confidence style selection.
- 150 bundled upstream `DESIGN.md` systems for offline search and application.
- Vibe UI template recipes for landing pages, dashboards, and docs pages.
- Vibe Gate workflow with `workflow`, `invariants`, `brief-check`, persisted contracts, and report guidance.
- Static browser generation for built-in styles, upstream source systems, and template recipes.
- Design consistency reporting with score, decision, blockers, top fixes, and Bad/Fix/Evidence fields.
- English `README.md` and Chinese `README.zh-CN.md`.
- Publish package modes for `minimal`, `standard`, and `offline-full`.
- Publish preflight checks with `scripts/publish-kit.mjs --check`.
- GitHub-ready repository governance files, issue templates, PR template, and CI workflow.

### Security

- No default network requests in normal Vibe UI CLI usage.
- No model API calls.
- Brand-safety guardrails for inspiration-based visual styles.

### Attribution

- Added upstream provenance and license notes in `resource/open-design-attribution.md`.
