# AGENTS.md

This repository publishes the Vibe UI skill as a local-first `DESIGN.md` workflow for AI UI generation.

## Source Of Truth

- Runtime skill instructions: `SKILL.md`
- Public documentation: `README.md` and `README.zh-CN.md`
- CLI implementation: `scripts/design.mjs`
- Package builder: `scripts/publish-kit.mjs`
- Upstream provenance: `resource/open-design-attribution.md`

## Naming Rules

- Vibe UI-owned workflow features must use Vibe UI names such as `Vibe UI`, `Vibe Gate`, and `Vibe UI template recipes`.
- Open Design / Kami names may appear only as upstream attribution, source filters, resource ids, repository provenance, or original upstream resource content.
- Do not rename `open-design:*` ids unless a migration is explicitly planned.

## Development Rules

- Keep `SKILL.md` concise and procedural; put large offline resources under `resource/`.
- Do not commit `dist/`, `node_modules/`, `.DS_Store`, generated package zips, or temporary staging directories.
- Changes to CLI behavior must include or update tests in `tests/cli.test.mjs`.
- Changes to public release behavior must update `CHANGELOG.md` and the release checklist when relevant.
- Preserve `resource/open-design-attribution.md` whenever upstream resources are included.

## Verification

Run before finishing or publishing:

```bash
npm run release:check
npm run release:dry-run
npm run release:smoke
```

For release artifacts:

```bash
npm run release:zip
```

## Do Not Forget

- Vibe Gate is the quality gate name.
- `brief-check` writes `.vibe-ui/vibe-gate-contract.json`.
- `minimal` packages exclude the 150-system upstream offline bundle.
- `offline-full` packages include `resource/open-design-systems.json`.
