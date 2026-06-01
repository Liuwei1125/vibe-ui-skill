# Release Checklist

## Preflight

- [ ] Confirm `package.json` version is current.
- [ ] Confirm `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, `SECURITY.md`, and `LICENSE` are current.
- [ ] Confirm `SKILL.md` describes the current workflow.
- [ ] Confirm `AGENTS.md` names the current repository rules.
- [ ] Confirm `resource/open-design-attribution.md` is present when upstream resources are bundled.
- [ ] Confirm no `.DS_Store`, `node_modules/`, `dist/`, release zip, or staging directory is staged.

## Verification

- [ ] `npm run release:check`
- [ ] `npm run release:dry-run`
- [ ] `npm run release:smoke`
- [ ] `node scripts/publish-kit.mjs --platform all --package minimal --check`
- [ ] `node scripts/publish-kit.mjs --platform all --package standard --check`
- [ ] `node scripts/publish-kit.mjs --platform all --package offline-full --check`

## Package

- [ ] `npm run release:zip`
- [ ] `unzip -l dist/publish/vibe-ui-minimal-skill.zip | head`
- [ ] Confirm `minimal` excludes `resource/open-design-systems.json`.
- [ ] Confirm `offline-full` includes `resource/open-design-systems.json`.
- [ ] Confirm package zips do not contain `.DS_Store` or staging directories.

## GitHub

- [ ] Push `main`.
- [ ] Create and push a `v1.0.0` tag.
- [ ] Draft GitHub Release.
- [ ] Attach package zip files only through GitHub Releases if needed.

## Naming And Attribution

- [ ] Vibe UI-owned workflow features use `Vibe UI`, `Vibe Gate`, and `Vibe UI template recipes`.
- [ ] Open Design / Kami names appear only as upstream attribution, source filters, resource ids, provenance, or original upstream resource content.
- [ ] Included styles are described as inspiration, not official brand systems.
