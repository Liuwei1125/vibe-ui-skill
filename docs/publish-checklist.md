# Publish Checklist

## Repository Files

- [x] `README.md`
- [x] `README.zh-CN.md`
- [x] `SKILL.md`
- [x] `AGENTS.md`
- [x] `CHANGELOG.md`
- [x] `LICENSE`
- [x] `SECURITY.md`
- [x] `.github/workflows/ci.yml`
- [x] `.github/ISSUE_TEMPLATE/bug_report.md`
- [x] `.github/ISSUE_TEMPLATE/feature_request.md`
- [x] `.github/pull_request_template.md`

## Release Commands

Run before publishing:

```bash
npm run release:check
npm run release:dry-run
npm run release:smoke
node scripts/publish-kit.mjs --platform all --package minimal --check
node scripts/publish-kit.mjs --platform all --package standard --check
node scripts/publish-kit.mjs --platform all --package offline-full --check
```

Create package zips:

```bash
npm run release:zip
```

## Package Modes

- [x] `minimal`: core skill, registry, CLI, prompts, icon, and Vibe Gate watchlist.
- [x] `standard`: minimal plus attribution, template recipes, and curated source design files.
- [x] `offline-full`: standard plus the 150-system upstream offline bundle.

## Marketplace Update

- [ ] Default upload: `dist/publish/vibe-ui-standard-skill.zip`.
- [ ] Small runtime upload: `dist/publish/vibe-ui-minimal-skill.zip`.
- [ ] Full offline upload: `dist/publish/vibe-ui-offline-full-skill.zip`.
- [ ] Version field matches `package.json`.
- [ ] Update notes are copied from the matching `CHANGELOG.md` section.

## Safety Checks

- [ ] No `.DS_Store` files.
- [ ] No `node_modules/`.
- [ ] No `dist/` committed to git.
- [ ] No generated zip committed to git.
- [ ] Attribution remains present for bundled upstream resources.
- [ ] Naming boundary is preserved for Vibe UI-owned features.
