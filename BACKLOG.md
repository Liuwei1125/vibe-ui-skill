# Vibe UI Backlog

The resource-backed upgrade is implemented in the working skill:

- Local upstream source bundle: `resource/open-design-systems.json`
- Attribution: `resource/open-design-attribution.md`
- Template recipes: `resource/open-design-template-recipes.json`
- Vibe Gate watchlist: `resource/ui-anti-patterns.json`
- Execution checks: `workflow`, `invariants`, `brief-check`, persisted contract, report score/decision/blockers, and Bad/Fix/Evidence guidance
- Source filters: `--source built-in|open-design|all`
- Namespaced ids: `open-design:<slug>`
- Static browser filters and copy commands
- Craft lint/report categories
- Publish package modes: `minimal`, `standard`, `offline-full`
- Real zip assembly for all publish package modes
- Publish preflight checks through `scripts/publish-kit.mjs --check`
- GitHub-ready public docs, issue templates, PR template, security policy, and CI workflow

## High Priority Follow-ups

### 1. Publish Metadata Polish

Tighten release metadata before the first public GitHub release.

Acceptance notes:
- Add screenshots or short terminal captures for README usage examples.
- Add GitHub Release body text for `v1.0.0`.
- Confirm repository topics, description, and homepage URL.
- Confirm generated zip artifacts are attached only to GitHub Releases, not committed.

### 2. Publish Preflight Enhancements

`scripts/publish-kit.mjs --check` now validates required files, generated artifacts, resource boundaries, and package size. Extend it when platform limits are known.

Acceptance notes:
- Add platform-specific file count and zip size limits when ClawHub/SkillHub/OneTool document them.
- Validate optional icon dimensions and size when present.
- Emit a compact Markdown summary for release notes.
- Add a failure fixture test for missing required files.

### 3. Richer Upstream Sync Metadata

Improve `scripts/sync-open-design.mjs`.

Acceptance notes:
- Preserve upstream category groups.
- Add update diff output showing added, removed, and changed systems.
- Support `--commit <sha>` for deterministic historical sync.
- Validate resource schema after write.

### 4. Browser Visual Samples

Upgrade generated browser cards with richer preview signals.

Acceptance notes:
- Show 4-8 swatches per upstream source system.
- Add source/category/page-type filter chips.
- Add template recipe cards grouped separately.
- Keep output dependency-free.

### 5. Release Artifact Audit Command

Add a small deterministic audit command for already-built zips.

Acceptance notes:
- Check `dist/publish/*.zip` contents without extracting into the repo.
- Confirm `minimal` excludes `resource/open-design-systems.json`.
- Confirm `offline-full` includes `resource/open-design-systems.json`.
- Confirm no `.DS_Store`, `dist/`, or `stage-*` paths appear inside archives.

## Medium Priority

### 6. Project-Level Custom Registry

Support project-local `.vibe-ui/registry.json` for private styles.

Acceptance notes:
- Merge project registry with built-in and upstream source catalogs.
- Clearly handle id conflicts.
- Keep built-in styles available.

### 7. Use Submitted Styles

Allow `use <design_id>` to apply designs stored under `.vibe-ui/submissions`.

Acceptance notes:
- `submit acme ./DESIGN.md` stores the design.
- `use acme` applies the submitted design.
- State file records that the source is user-submitted.
- Brand/provenance warning remains visible.

### 8. Stronger URL Extraction

Make `extract-url` produce more useful DESIGN.md drafts from public page evidence.

Acceptance notes:
- Parse CSS variables.
- Extract visible color values.
- Detect font families where possible.
- Summarize button/card/radius/shadow cues.
- Keep outputs clearly marked as drafts requiring human review.

## Completed Publish Work

These items used to be backlog items and are now part of the release surface:

- `npm run release:check`
- `npm run release:dry-run`
- `npm run release:smoke`
- `npm run release:zip`
- `node scripts/publish-kit.mjs --platform all --package minimal --check`
- `node scripts/publish-kit.mjs --platform all --package standard --check`
- `node scripts/publish-kit.mjs --platform all --package offline-full --check`
