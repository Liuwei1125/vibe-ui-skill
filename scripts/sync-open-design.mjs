#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const outDir = args.flags.out ? resolve(args.flags.out) : join(skillRoot, 'resource');
const resourceRepo = await resolveResourceRepo(args.flags['resources-repo']);

await mkdir(outDir, { recursive: true });

if (resourceRepo) {
  await syncFromResourceRepo(resourceRepo, outDir);
} else if (args.flags['upstream-open-design']) {
  await syncFromUpstream(outDir);
} else {
  fail([
    'No Vibe UI resources repository found.',
    'Pass `--resources-repo /path/to/vibe-ui-resources`, set VIBE_UI_RESOURCES_REPO, clone https://github.com/Liuwei1125/vibe-ui-resources next to this repo, or pass `--upstream-open-design` for a maintenance-only direct upstream sync.',
  ].join('\n'));
}

async function syncFromResourceRepo(repoDir, targetDir) {
  const generatedDir = join(repoDir, 'generated');
  const noticesPath = join(repoDir, 'THIRD_PARTY_NOTICES.md');
  const manifestPath = join(generatedDir, 'sync-manifest.json');
  const required = [
    ['open-design-systems.json', 'open-design-systems.json'],
    ['open-design-template-index.json', 'open-design-template-index.json'],
    ['open-design-template-recipes.json', 'open-design-template-recipes.json'],
    ['open-design-template-sources.json', 'open-design-template-sources.json'],
    ['sync-manifest.json', 'resources-sync-manifest.json'],
  ];
  for (const [source, target] of required) {
    const sourcePath = join(generatedDir, source);
    if (!existsSync(sourcePath)) fail(`Missing generated resource: ${sourcePath}\nRun \`npm run sync:open-design\` in ${repoDir} first.`);
    await cp(sourcePath, join(targetDir, target));
  }
  if (!existsSync(noticesPath)) fail(`Missing THIRD_PARTY_NOTICES.md in ${repoDir}`);
  await cp(noticesPath, join(targetDir, 'open-design-attribution.md'));

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  console.log(`Synced Vibe UI resources from ${repoDir}`);
  console.log(`- OpenDesign commit: ${manifest.source?.commit}`);
  console.log(`- DESIGN.md systems: ${manifest.counts?.designSystems}`);
  console.log(`- design templates: ${manifest.counts?.designTemplates}`);
  console.log(`- template recipes: ${manifest.counts?.templateRecipes}`);
  console.log(`- output: ${targetDir}`);
}

async function syncFromUpstream(targetDir) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'vibe-ui-open-design-'));
  const openDesignDir = join(tempRoot, 'open-design');
  const resourcesDir = join(tempRoot, 'vibe-ui-resources');
  try {
    run('git', ['clone', '--depth', '1', 'https://github.com/nexu-io/open-design.git', openDesignDir], tempRoot);
    run('git', ['clone', '--depth', '1', 'https://github.com/Liuwei1125/vibe-ui-resources.git', resourcesDir], tempRoot);
    run(process.execPath, ['scripts/sync-open-design.mjs', '--source', openDesignDir], resourcesDir);
    await syncFromResourceRepo(resourcesDir, targetDir);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function resolveResourceRepo(explicit) {
  const candidates = [
    explicit,
    process.env.VIBE_UI_RESOURCES_REPO,
    join(skillRoot, '..', '..', 'vibe-ui-resources'),
    join(skillRoot, '..', 'vibe-ui-resources'),
  ].filter(Boolean).map((item) => resolve(item));
  for (const candidate of candidates) {
    if (
      existsSync(join(candidate, 'generated', 'open-design-systems.json')) &&
      existsSync(join(candidate, 'generated', 'open-design-template-recipes.json')) &&
      existsSync(join(candidate, 'THIRD_PARTY_NOTICES.md'))
    ) {
      return candidate;
    }
  }
  return null;
}

function run(command, argv, cwd) {
  const result = spawnSync(command, argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    fail(`${command} ${argv.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  if (result.stdout.trim()) process.stdout.write(result.stdout);
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
