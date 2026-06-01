#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const packageMode = args.flags.package || 'standard';
const platform = args.flags.platform || 'all';
const dryRun = Boolean(args.flags['dry-run']);
const checkOnly = Boolean(args.flags.check);
const jsonOutput = Boolean(args.flags.json);
const outDir = resolve(skillRoot, 'dist', 'publish');

if (!['minimal', 'standard', 'offline-full'].includes(packageMode)) {
  fail('Unsupported package mode. Use one of: minimal, standard, offline-full.');
}

const plan = await buildPackagePlan(packageMode, platform);

if (checkOnly) {
  const report = await checkPackagePlan(plan);
  printCheck(report, { json: jsonOutput });
  if (!report.ok) process.exit(1);
} else if (dryRun) {
  printPlan(plan, { json: jsonOutput });
} else {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, `publish-plan-${packageMode}.json`), `${JSON.stringify(plan, null, 2)}\n`);
  const zipPath = await assembleZip(plan);
  printPlan(plan, { json: jsonOutput });
  console.log(`wrote: ${relative(process.cwd(), join(outDir, `publish-plan-${packageMode}.json`))}`);
  console.log(`zip: ${relative(process.cwd(), zipPath)}`);
}

async function buildPackagePlan(mode, targetPlatform) {
  const registry = JSON.parse(await readFile(join(skillRoot, 'registry.json'), 'utf8'));
  const openDesignPath = join(skillRoot, 'resource', 'open-design-systems.json');
  const openDesign = existsSync(openDesignPath) ? JSON.parse(await readFile(openDesignPath, 'utf8')) : null;
  const files = await collectPackageFiles(mode, registry);
  return {
    packageMode: mode,
    platform: targetPlatform,
    generatedAt: new Date().toISOString(),
    root: skillRoot,
    counts: {
      files: files.length,
      builtInDesigns: registry.designs.length,
      openDesignSystems: mode === 'offline-full' ? openDesign?.systems?.length || 0 : 0,
    },
    includes: {
      skill: true,
      registry: true,
      prompts: true,
      designCli: true,
      publishKit: true,
      vibeGateAntiPatterns: true,
      curatedSourceDesigns: mode !== 'minimal',
      openDesignAttribution: mode !== 'minimal',
      openDesignTemplateRecipes: mode !== 'minimal',
      openDesignSystems: mode === 'offline-full',
    },
    files,
  };
}

async function collectPackageFiles(mode, registry) {
  const required = [
    'SKILL.md',
    'README.md',
    'README.zh-CN.md',
    'CHANGELOG.md',
    'LICENSE',
    'SECURITY.md',
    'package.json',
    'registry.json',
    'resource/ui-anti-patterns.json',
    'scripts/design.mjs',
    'scripts/publish-kit.mjs',
    ...await listFiles('prompts'),
  ];
  if (existsSync(join(skillRoot, 'icon.png'))) required.push('icon.png');
  if (mode !== 'minimal') {
    required.push('resource/open-design-attribution.md');
    required.push('resource/open-design-template-recipes.json');
  }
  if (mode === 'offline-full') required.push('resource/open-design-systems.json');
  if (mode !== 'minimal') {
    for (const design of registry.designs) {
      required.push(join(registry.resourceRoot, design.sourceId, 'DESIGN.md'));
    }
  }
  return unique(required)
    .filter((file) => existsSync(join(skillRoot, file)))
    .sort();
}

async function checkPackagePlan(plan) {
  const checks = [];
  const fileSet = new Set(plan.files);
  const totalBytes = await packageByteSize(plan.files);
  const blockedPatterns = [
    /^dist\//,
    /^node_modules\//,
    /^\.git\//,
    /^\.vibe-ui\//,
    /^\.DS_Store$/,
    /\/\.DS_Store$/,
    /\/stage-[^/]+/,
    /\.zip$/,
    /^DESIGN\.md$/,
    /^DESIGN\.generated\.md$/,
  ];

  checks.push(namedCheck('SKILL.md present', fileSet.has('SKILL.md')));
  checks.push(namedCheck('package.json present', fileSet.has('package.json')));
  checks.push(namedCheck('README.md present', fileSet.has('README.md')));
  checks.push(namedCheck('README.zh-CN.md present', fileSet.has('README.zh-CN.md')));
  checks.push(namedCheck('Vibe Gate anti-patterns present', fileSet.has('resource/ui-anti-patterns.json')));
  checks.push(namedCheck('No generated artifacts', plan.files.every((file) => !blockedPatterns.some((pattern) => pattern.test(file)))));
  checks.push(namedCheck('No duplicate files', plan.files.length === fileSet.size));
  checks.push(namedCheck('All planned files exist', plan.files.every((file) => existsSync(join(skillRoot, file)))));
  checks.push(namedCheck('Package file count is non-empty', plan.files.length > 0));
  checks.push(namedCheck('Package size under 25 MB', totalBytes <= 25 * 1024 * 1024));

  if (plan.packageMode === 'minimal') {
    checks.push(namedCheck('Open Design attribution excluded from minimal', !fileSet.has('resource/open-design-attribution.md')));
    checks.push(namedCheck('Open Design template recipes excluded from minimal', !fileSet.has('resource/open-design-template-recipes.json')));
    checks.push(namedCheck('Open Design systems excluded from minimal', !fileSet.has('resource/open-design-systems.json')));
  } else {
    checks.push(namedCheck('Open Design attribution included', fileSet.has('resource/open-design-attribution.md')));
    checks.push(namedCheck('Open Design template recipes included', fileSet.has('resource/open-design-template-recipes.json')));
  }

  if (plan.packageMode === 'offline-full') {
    checks.push(namedCheck('Open Design systems included in offline-full', fileSet.has('resource/open-design-systems.json')));
    checks.push(namedCheck('Offline-full resource count is 150', plan.counts.openDesignSystems === 150));
  } else {
    checks.push(namedCheck('Open Design systems excluded outside offline-full', !fileSet.has('resource/open-design-systems.json')));
  }

  const errors = checks.filter((item) => !item.ok).map((item) => item.name);
  return {
    ok: errors.length === 0,
    packageMode: plan.packageMode,
    platform: plan.platform,
    files: plan.counts.files,
    totalBytes,
    checks,
    errors,
  };
}

async function packageByteSize(files) {
  let total = 0;
  for (const file of files) {
    total += (await stat(join(skillRoot, file))).size;
  }
  return total;
}

function namedCheck(name, ok) {
  return { name, ok: Boolean(ok) };
}

async function listFiles(dir) {
  const root = join(skillRoot, dir);
  if (!existsSync(root)) return [];
  const output = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const file = join(dir, entry.name);
    const full = join(skillRoot, file);
    if (entry.isDirectory()) {
      const nested = await listFiles(file);
      output.push(...nested);
    } else if ((await stat(full)).isFile() && extname(full) !== '.DS_Store') {
      output.push(file);
    }
  }
  return output;
}

function printPlan(plan, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  console.log(`packageMode: ${plan.packageMode}`);
  console.log(`platform: ${plan.platform}`);
  console.log(`files: ${plan.counts.files}`);
  console.log(`builtInDesigns: ${plan.counts.builtInDesigns}`);
  console.log(`openDesignSystems: ${plan.counts.openDesignSystems}`);
  console.log('includes:');
  for (const [key, value] of Object.entries(plan.includes)) {
    console.log(`- ${key}: ${value}`);
  }
}

function printCheck(report, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`packageMode: ${report.packageMode}`);
  console.log(`platform: ${report.platform}`);
  console.log(`files: ${report.files}`);
  console.log(`totalBytes: ${report.totalBytes}`);
  console.log(`ok: ${report.ok}`);
  console.log('checks:');
  for (const check of report.checks) {
    console.log(`- ${check.ok ? 'ok' : 'fail'} ${check.name}`);
  }
  if (report.errors.length) {
    console.log('errors:');
    for (const error of report.errors) console.log(`- ${error}`);
  }
}

async function assembleZip(plan) {
  const stageRoot = join(outDir, `stage-${plan.packageMode}`);
  const stageSkillRoot = join(stageRoot, 'vibe-ui');
  const zipPath = join(outDir, `vibe-ui-${plan.packageMode}-skill.zip`);
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageSkillRoot, { recursive: true });
  for (const file of plan.files) {
    const source = join(skillRoot, file);
    const target = join(stageSkillRoot, file);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target);
  }
  await rm(zipPath, { force: true });
  const result = spawnSync('zip', ['-qr', zipPath, 'vibe-ui'], {
    cwd: stageRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`zip failed: ${result.stderr || result.stdout}`);
  }
  await rm(stageRoot, { recursive: true, force: true });
  return zipPath;
}

function parseArgs(rawArgs) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rawArgs[index + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        index += 1;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function unique(values) {
  return [...new Set(values)];
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
