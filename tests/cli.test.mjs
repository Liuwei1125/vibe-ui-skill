import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const skillRoot = resolve(import.meta.dirname, '..');
const cli = join(skillRoot, 'scripts', 'design.mjs');
const publishCli = join(skillRoot, 'scripts', 'publish-kit.mjs');
const syncCli = join(skillRoot, 'scripts', 'sync-open-design.mjs');
const resourcesRepo = resolve(skillRoot, '..', '..', 'vibe-ui-resources');
const requiredRepositoryFiles = [
  'AGENTS.md',
  'CHANGELOG.md',
  'LICENSE',
  'SECURITY.md',
  '.gitignore',
  '.github/workflows/ci.yml',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/feature_request.md',
  '.github/pull_request_template.md',
  'docs/release-checklist.md',
  'docs/publish-checklist.md',
];

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? skillRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}${result.stderr}`,
  };
}

function runPublish(args, options = {}) {
  const result = spawnSync(process.execPath, [publishCli, ...args], {
    cwd: options.cwd ?? skillRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}${result.stderr}`,
  };
}

function runSync(args, options = {}) {
  const result = spawnSync(process.execPath, [syncCli, ...args], {
    cwd: options.cwd ?? skillRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}${result.stderr}`,
  };
}

function withTempProject(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'vibe-ui-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('bundles Open Design systems as a local single-file resource with attribution', () => {
  const resourcePath = join(skillRoot, 'resource', 'open-design-systems.json');
  const attributionPath = join(skillRoot, 'resource', 'open-design-attribution.md');

  assert.equal(existsSync(resourcePath), true, 'open-design systems resource should exist');
  assert.equal(existsSync(attributionPath), true, 'Open Design attribution should exist');

  const resource = JSON.parse(readFileSync(resourcePath, 'utf8'));
  assert.equal(resource.source.repo, 'nexu-io/open-design');
  assert.match(resource.source.commit, /^[0-9a-f]{40}$/);
  assert.equal(resource.systems.length, 150);
  assert.equal(resource.systems.filter((system) => !system.body.startsWith('#')).length, 0);

  const linear = resource.systems.find((system) => system.id === 'linear-app');
  assert.ok(linear, 'linear-app should be included');
  assert.equal(linear.namespacedId, 'open-design:linear-app');
  assert.match(linear.body, /^# Design System Inspired by Linear/m);
  assert.ok(Array.isArray(linear.swatches));

  const attribution = readFileSync(attributionPath, 'utf8');
  assert.match(attribution, /Open Design/i);
  assert.match(attribution, /Apache-2\.0|Apache License/i);
  assert.match(attribution, /VoltAgent|awesome-design-md/i);
});

test('lists and searches Open Design systems without mixing default curated output', () => {
  const listResult = run(['list', '--source', 'open-design']);
  assert.equal(listResult.status, 0, listResult.output);
  assert.match(listResult.stdout, /open-design:linear-app/);
  assert.doesNotMatch(listResult.stdout, /^- linear:/m);

  const searchResult = run(['search', 'revolut fintech pricing', '--source', 'open-design']);
  assert.equal(searchResult.status, 0, searchResult.output);
  assert.match(searchResult.stdout, /open-design:revolut/);
  assert.match(searchResult.stdout, /Source: open-design/);
});

test('applies an Open Design system and records provenance', () => withTempProject((projectDir) => {
  const result = run(['use', 'open-design:linear-app'], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Applied design: open-design:linear-app/);

  const design = readFileSync(join(projectDir, 'DESIGN.md'), 'utf8');
  assert.match(design, /^# Design System Inspired by Linear/m);

  const generated = readFileSync(join(projectDir, 'DESIGN.generated.md'), 'utf8');
  assert.match(generated, /Source collection: Vibe UI bundled upstream source/);
  assert.match(generated, /Upstream project: Open Design/);
  assert.match(generated, /nexu-io\/open-design/);
  assert.match(generated, /Commit: [0-9a-f]{40}/);

  const state = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'current-design.json'), 'utf8'));
  assert.equal(state.id, 'open-design:linear-app');
  assert.equal(state.source, 'open-design');
  assert.equal(state.sourceId, 'linear-app');
  assert.match(state.commit, /^[0-9a-f]{40}$/);
}));

test('exposes Vibe UI template recipes backed by Open Design source ids', () => {
  const templateResult = run(['template', 'open-design:saas-landing']);
  assert.equal(templateResult.status, 0, templateResult.output);
  assert.match(templateResult.stdout, /Vibe UI template recipe: open-design:saas-landing/);
  assert.doesNotMatch(templateResult.stdout, /Open Design .* recipe/i);
  assert.match(templateResult.stdout, /Hero/);
  assert.match(templateResult.stdout, /P0 self-check/i);

  const promptResult = run(['generate', 'landing', '--template', 'open-design:saas-landing']);
  assert.equal(promptResult.status, 0, promptResult.output);
  assert.match(promptResult.stdout, /Template recipe: open-design:saas-landing/);
  assert.match(promptResult.stdout, /Required sections/i);
  assert.match(promptResult.stdout, /P0 self-check/i);
});

test('exposes expanded Vibe UI template recipes and template index metadata', () => {
  const indexPath = join(skillRoot, 'resource', 'open-design-template-index.json');
  const sourcesPath = join(skillRoot, 'resource', 'open-design-template-sources.json');
  const manifestPath = join(skillRoot, 'resource', 'resources-sync-manifest.json');

  assert.equal(existsSync(indexPath), true, 'template index should exist');
  assert.equal(existsSync(sourcesPath), true, 'template sources should exist for offline-full packaging');
  assert.equal(existsSync(manifestPath), true, 'resources sync manifest should exist');

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  assert.equal(index.schemaVersion, 'vibe-ui/open-design-template-index/v1');
  assert.equal(index.templates.length, 111);
  assert.ok(index.templates.some((template) => template.id === 'pricing-page'));
  assert.ok(index.templates.some((template) => template.id === 'waitlist-page'));

  const recipes = JSON.parse(readFileSync(join(skillRoot, 'resource', 'open-design-template-recipes.json'), 'utf8'));
  assert.equal(recipes.schemaVersion, 'vibe-ui/open-design-template-recipes/v3');
  const ids = recipes.templates.map((template) => template.id);
  assert.ok(ids.includes('vibe:commerce-home'));
  assert.ok(ids.includes('vibe:product-launch'));
  assert.ok(ids.includes('vibe:pricing-page'));

  const commerceResult = run(['template', 'vibe:commerce-home']);
  assert.equal(commerceResult.status, 0, commerceResult.output);
  assert.match(commerceResult.stdout, /Vibe UI template recipe: vibe:commerce-home/);
  assert.match(commerceResult.stdout, /Featured product grid/i);
  assert.match(commerceResult.stdout, /Forbidden signals/i);
  assert.match(commerceResult.stdout, /product prices/i);

  const generateResult = run(['generate', 'landing', '--template', 'shopping-home']);
  assert.equal(generateResult.status, 0, generateResult.output);
  assert.match(generateResult.stdout, /Template recipe: vibe:commerce-home/);
  assert.match(generateResult.stdout, /Book a demo/);
});

test('read recommends commerce template for shopping briefs instead of default SaaS landing', () => withTempProject((projectDir) => {
  const brief = 'Luma Market shopping homepage for curated home goods, kitchenware, fragrance, storage, gifts, product prices, categories, editor picks, FAQ, no SaaS copy';
  const result = run(['read', brief, '--page', 'landing', '--design', 'airbnb'], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Recommended template: vibe:commerce-home/);

  const read = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'brief-read.json'), 'utf8'));
  assert.equal(read.recommended.template.id, 'vibe:commerce-home');
  assert.ok(read.sectionStrategy.some((section) => /Featured product grid/i.test(section)));
  assert.equal(read.proofStrategy.mode, 'product-evidence');
}));

test('package plan includes template index by default and template sources only in offline-full', () => {
  const standard = runPublish(['--platform', 'all', '--package', 'standard', '--dry-run', '--json']);
  assert.equal(standard.status, 0, standard.output);
  const standardPlan = JSON.parse(standard.stdout);
  assert.ok(standardPlan.files.includes('resource/open-design-template-index.json'));
  assert.ok(standardPlan.files.includes('resource/open-design-template-recipes.json'));
  assert.ok(standardPlan.files.includes('resource/resources-sync-manifest.json'));
  assert.ok(!standardPlan.files.includes('resource/open-design-template-sources.json'));
  assert.equal(standardPlan.includes.openDesignTemplateIndex, true);
  assert.equal(standardPlan.includes.openDesignTemplateSources, false);

  const offlineFull = runPublish(['--platform', 'all', '--package', 'offline-full', '--dry-run', '--json']);
  assert.equal(offlineFull.status, 0, offlineFull.output);
  const offlineFullPlan = JSON.parse(offlineFull.stdout);
  assert.ok(offlineFullPlan.files.includes('resource/open-design-template-sources.json'));
  assert.equal(offlineFullPlan.includes.openDesignTemplateSources, true);
});

test('sync script can consume the local Vibe UI resources repository snapshot', { skip: !existsSync(resourcesRepo) }, () => withTempProject((projectDir) => {
  const result = runSync(['--resources-repo', resourcesRepo, '--out', projectDir]);
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Synced Vibe UI resources/);

  for (const file of [
    'open-design-systems.json',
    'open-design-template-index.json',
    'open-design-template-recipes.json',
    'open-design-template-sources.json',
    'resources-sync-manifest.json',
    'open-design-attribution.md',
  ]) {
    assert.equal(existsSync(join(projectDir, file)), true, `${file} should be synced`);
  }

  const recipes = JSON.parse(readFileSync(join(projectDir, 'open-design-template-recipes.json'), 'utf8'));
  assert.equal(recipes.schemaVersion, 'vibe-ui/open-design-template-recipes/v3');
  assert.ok(recipes.templates.some((template) => template.id === 'vibe:commerce-home'));
}));

test('craft lint flags common AI UI failure modes and report groups findings', () => withTempProject((projectDir) => {
  writeFileSync(join(projectDir, 'DESIGN.md'), [
    '# Test Design',
    'primary: #111827',
    'surface: #ffffff',
    'radius-md: 8px',
  ].join('\n'));
  mkdirSync(join(projectDir, 'src'));
  writeFileSync(join(projectDir, 'src', 'page.html'), `
    <main>
      <section>
        <h1 style="text-transform: uppercase">Launch faster ✨</h1>
        <p>Lorem ipsum users ship 10x faster.</p>
        <button style="background:#6366f1">Get started</button>
      </section>
    </main>
  `);

  const checkResult = run(['check', 'src'], { cwd: projectDir });
  assert.equal(checkResult.status, 0, checkResult.output);
  assert.match(checkResult.stdout, /default LLM accent|AI-default indigo/i);
  assert.match(checkResult.stdout, /emoji/i);
  assert.match(checkResult.stdout, /invented metric/i);
  assert.match(checkResult.stdout, /filler copy|Lorem/i);
  assert.match(checkResult.stdout, /letter-spacing/i);

  const reportResult = run(['report', 'src'], { cwd: projectDir });
  assert.equal(reportResult.status, 0, reportResult.output);
  const report = readFileSync(join(projectDir, 'DESIGN-REPORT.md'), 'utf8');
  for (const heading of ['Color', 'Typography', 'Layout', 'Components', 'Copy/content', 'Brand safety', 'Accessibility']) {
    assert.match(report, new RegExp(`## ${heading}`));
  }
}));

test('Vibe Gate exposes workflow, invariants, and persisted brief contract without borrowed names', () => {
  const antiPatternPath = join(skillRoot, 'resource', 'ui-anti-patterns.json');
  assert.equal(existsSync(antiPatternPath), true, 'Vibe Gate anti-pattern resource should exist');
  const antiPatterns = JSON.parse(readFileSync(antiPatternPath, 'utf8'));
  assert.ok(antiPatterns.patterns.some((pattern) => pattern.id === 'default-llm-indigo'));
  assert.ok(antiPatterns.patterns.some((pattern) => pattern.fix));
  assert.doesNotMatch(antiPatterns.source, /Kami/i);

  const invariantsResult = run(['invariants', 'open-design:linear-app']);
  assert.equal(invariantsResult.status, 0, invariantsResult.output);
  assert.match(invariantsResult.stdout, /Vibe Gate invariants/i);
  assert.match(invariantsResult.stdout, /open-design:linear-app/);
  assert.match(invariantsResult.stdout, /Do not/i);
  assert.match(invariantsResult.stdout, /P0 self-check/i);
  assert.doesNotMatch(invariantsResult.stdout, /Kami/i);

  const workflowResult = run([
    'workflow',
    'landing',
    '--design',
    'open-design:linear-app',
    '--template',
    'open-design:saas-landing',
    '--target',
    'src',
  ]);
  assert.equal(workflowResult.status, 0, workflowResult.output);
  assert.match(workflowResult.stdout, /Vibe UI workflow/i);
  assert.match(workflowResult.stdout, /Vibe Gate/i);
  assert.match(workflowResult.stdout, /Step 1/i);
  assert.match(workflowResult.stdout, /invariants open-design:linear-app/);
  assert.match(workflowResult.stdout, /brief-check landing/);
  assert.match(workflowResult.stdout, /generate landing --template open-design:saas-landing/);
  assert.match(workflowResult.stdout, /report src/);
  assert.doesNotMatch(workflowResult.stdout, /Kami/i);
});

test('brief-check writes a Vibe Gate contract for project handoff', () => withTempProject((projectDir) => {
  const briefResult = run(['brief-check', 'landing', '--design', 'open-design:linear-app', '--template', 'open-design:saas-landing'], { cwd: projectDir });
  assert.equal(briefResult.status, 0, briefResult.output);
  assert.match(briefResult.stdout, /Vibe Gate execution contract/i);
  assert.match(briefResult.stdout, /Materials status/i);
  assert.match(briefResult.stdout, /Anti-pattern watchlist/i);
  assert.match(briefResult.stdout, /Verification commands/i);
  assert.match(briefResult.stdout, /open-design:saas-landing/);
  assert.match(briefResult.stdout, /\.vibe-ui\/vibe-gate-contract\.json/);
  assert.doesNotMatch(briefResult.stdout, /Kami/i);

  const contract = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'vibe-gate-contract.json'), 'utf8'));
  assert.equal(contract.qualityGate.name, 'Vibe Gate');
  assert.equal(contract.pageType, 'landing');
  assert.equal(contract.design.id, 'open-design:linear-app');
  assert.equal(contract.template.id, 'open-design:saas-landing');
  assert.ok(contract.antiPatternWatchlist.some((pattern) => pattern.id === 'default-llm-indigo'));
  assert.ok(contract.verificationCommands.some((command) => command.includes('report')));
}));

test('read writes Design Read and lightweight product context for a natural-language brief', () => withTempProject((projectDir) => {
  const brief = 'AI release governance landing for healthcare compliance security and clinical safety teams';
  const result = run([
    'read',
    brief,
    '--page',
    'landing',
    '--design',
    'cursor',
    '--template',
    'open-design:saas-landing',
  ], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Vibe UI Design Read/);
  assert.match(result.stdout, /Dials: density/);
  assert.match(result.stdout, /Proof strategy: evidence-first/);
  assert.match(result.stdout, /\.vibe-ui\/brief-read\.json/);
  assert.match(result.stdout, /\.vibe-ui\/product-context\.json/);

  const read = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'brief-read.json'), 'utf8'));
  assert.equal(read.schemaVersion, 'vibe-ui/brief-read/v1');
  assert.equal(read.pageType, 'landing');
  assert.equal(read.productType, 'regulated healthcare product');
  assert.ok(read.audience.includes('security teams'));
  assert.ok(read.audience.includes('compliance and risk teams'));
  assert.ok(read.audience.includes('clinical safety teams'));
  assert.ok(read.dials.density >= 7);
  assert.equal(read.proofStrategy.mode, 'evidence-first');
  assert.equal(read.recommended.design.id, 'cursor');
  assert.equal(read.recommended.template.id, 'open-design:saas-landing');

  const product = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'product-context.json'), 'utf8'));
  assert.equal(product.schemaVersion, 'vibe-ui/product-context/v1');
  assert.equal(product.source, 'Vibe UI brief read. Lightweight PRODUCT.md-style strategic context.');
  assert.equal(product.proofStrategy.mode, 'evidence-first');
  assert.ok(product.buyerAnxiety.some((item) => /patient safety|evidence/i.test(item)));
}));

test('brief-check persists Vibe Gate 2.0 dials, preflight, and read-aware anti-patterns', () => withTempProject((projectDir) => {
  const brief = 'AI release governance landing for healthcare compliance security and clinical safety teams';
  const result = run([
    'brief-check',
    'landing',
    '--design',
    'cursor',
    '--template',
    'open-design:saas-landing',
    '--brief',
    brief,
  ], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Design Read:/);
  assert.match(result.stdout, /Page-specific preflight:/);
  assert.match(result.stdout, /weak-proof-strategy/);
  assert.match(result.stdout, /fake-logo-wall/);
  assert.match(result.stdout, /visible-design-scaffold/);

  const contract = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'vibe-gate-contract.json'), 'utf8'));
  assert.equal(contract.schemaVersion, 'vibe-ui/vibe-gate-contract/v2');
  assert.equal(contract.designRead.proofStrategy.mode, 'evidence-first');
  assert.ok(contract.designRead.dials.density >= 7);
  assert.ok(contract.template.pagePreflight.length >= 1);
  const ids = contract.antiPatternWatchlist.map((pattern) => pattern.id);
  assert.ok(ids.includes('weak-proof-strategy'));
  assert.ok(ids.includes('fake-logo-wall'));
  assert.ok(ids.includes('visible-design-scaffold'));

  const read = JSON.parse(readFileSync(join(projectDir, '.vibe-ui', 'brief-read.json'), 'utf8'));
  assert.equal(read.brief, brief);
}));

test('generate reminds agents to run the Vibe Gate before implementation', () => withTempProject((projectDir) => {
  const useResult = run(['use', 'open-design:linear-app'], { cwd: projectDir });
  assert.equal(useResult.status, 0, useResult.output);

  const result = run(['generate', 'landing', '--template', 'open-design:saas-landing'], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Vibe Gate required before implementation/i);
  assert.match(result.stdout, /node scripts\/design\.mjs invariants open-design:linear-app/);
  assert.match(result.stdout, /node scripts\/design\.mjs brief-check landing --design open-design:linear-app --template open-design:saas-landing/);
  assert.doesNotMatch(result.stdout, /Kami/i);
}));

test('generate includes hidden Design Read guidance from the persisted brief context', () => withTempProject((projectDir) => {
  const brief = 'AI release governance landing for healthcare compliance security and clinical safety teams';
  assert.equal(run(['use', 'cursor'], { cwd: projectDir }).status, 0);
  assert.equal(run(['read', brief, '--page', 'landing', '--design', 'cursor', '--template', 'open-design:saas-landing'], { cwd: projectDir }).status, 0);

  const result = run(['generate', 'landing', '--template', 'open-design:saas-landing'], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /Design Read guidance for generation:/);
  assert.match(result.stdout, /Audience: .*security teams.*compliance and risk teams.*clinical safety teams/);
  assert.match(result.stdout, /Dials: density/);
  assert.match(result.stdout, /Proof strategy: evidence-first/);
  assert.match(result.stdout, /Do not render Design Read, dials, or internal scaffold text in the production UI/);
}));

test('Vibe Gate report writes score, decision, blockers, and Bad Fix Evidence guidance', () => withTempProject((projectDir) => {
  writeFileSync(join(projectDir, 'DESIGN.md'), [
    '# Test Design',
    'primary: #111827',
    'surface: #ffffff',
    'radius-md: 8px',
  ].join('\n'));
  mkdirSync(join(projectDir, 'src'));
  writeFileSync(join(projectDir, 'src', 'page.html'), `
    <main>
      <section>
        <h1 style="text-transform: uppercase">Unlock 10x growth ✨</h1>
        <p>Lorem ipsum for your product.</p>
        <button style="background:#6366f1">Get started</button>
      </section>
    </main>
  `);

  const result = run(['report', 'src'], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);
  const report = readFileSync(join(projectDir, 'DESIGN-REPORT.md'), 'utf8');
  assert.match(report, /## Vibe Gate/);
  assert.match(report, /Quality gate score:/);
  assert.match(report, /Decision: Needs revision/);
  assert.match(report, /Blocking issues/);
  assert.match(report, /Top fixes before handoff/);
  assert.match(report, /Bad:/);
  assert.match(report, /Fix:/);
  assert.match(report, /Evidence:/);
  assert.match(report, /default-llm-indigo|invented-metric|emoji-icon/i);
  assert.doesNotMatch(report, /Kami/i);
}));

test('report, critique, and polish form a deterministic Vibe Gate 2.0 revision loop', () => withTempProject((projectDir) => {
  const brief = 'AI release governance landing for healthcare compliance security and clinical safety teams';
  writeFileSync(join(projectDir, 'DESIGN.md'), [
    '# Cursor-like Test Design',
    'primary: #111827',
    'surface: #ffffff',
    'radius-md: 8px',
  ].join('\n'));
  mkdirSync(join(projectDir, 'src'));
  writeFileSync(join(projectDir, 'src', 'page.html'), `
    <main>
      <section class="hero rounded-full">
        <span class="pill">Design Read Density 8</span>
        <h1 style="font-size: 96px; letter-spacing: -1px">Unlock seamless AI compliance</h1>
        <p>Your product helps teams transform workflows with powerful automation.</p>
        <button style="background:#6366f1">Get started</button>
        <button>Learn more</button>
      </section>
      <section>
        <p>Trusted by Google, Microsoft, Stripe, Linear, and OpenAI logo customers.</p>
      </section>
    </main>
  `);
  assert.equal(run(['read', brief, '--page', 'landing', '--design', 'cursor', '--template', 'open-design:saas-landing'], { cwd: projectDir }).status, 0);
  assert.equal(run(['brief-check', 'landing', '--design', 'cursor', '--template', 'open-design:saas-landing'], { cwd: projectDir }).status, 0);

  const reportResult = run(['report', 'src'], { cwd: projectDir });
  assert.equal(reportResult.status, 0, reportResult.output);
  const report = readFileSync(join(projectDir, 'DESIGN-REPORT.md'), 'utf8');
  assert.match(report, /## Vibe Gate 2\.0 Synthesis/);
  assert.match(report, /Design Read execution:/);
  assert.match(report, /Buyer anxiety coverage:/);
  assert.match(report, /Proof strategy credibility: Needs revision/);
  assert.match(report, /visible-design-scaffold/);
  assert.match(report, /fake-logo-wall/);

  const critiqueResult = run(['critique', 'src'], { cwd: projectDir });
  assert.equal(critiqueResult.status, 0, critiqueResult.output);
  assert.match(critiqueResult.stdout, /Vibe UI critique:/);
  assert.match(critiqueResult.stdout, /Director notes:/);
  const critiqueDir = join(projectDir, '.vibe-ui', 'critique');
  const critiqueFile = readdirSync(critiqueDir).find((file) => /^critique-.*\.md$/.test(file));
  assert.ok(critiqueFile, 'critique should write a timestamped markdown report');
  const critique = readFileSync(join(critiqueDir, critiqueFile), 'utf8');
  assert.match(critique, /## Design Read/);
  assert.match(critique, /## Deterministic Findings/);
  assert.match(critique, /## Next Polish Prompt/);

  const polishResult = run(['polish', 'src'], { cwd: projectDir });
  assert.equal(polishResult.status, 0, polishResult.output);
  assert.match(polishResult.stdout, /Vibe UI polish prompt:/);
  assert.match(polishResult.stdout, /Polish this UI using Vibe Gate 2\.0/);
  assert.match(polishResult.stdout, /Design Read to preserve:/);
  assert.match(polishResult.stdout, /Do not render Design Read, dials, or internal scaffold text/);
}));

test('browse writes a filterable static browser for built-in systems, Open Design systems, and recipes', () => withTempProject((projectDir) => {
  const result = run(['browse', '--source', 'all', '--out', 'browser'], { cwd: projectDir });
  assert.equal(result.status, 0, result.output);

  const data = JSON.parse(readFileSync(join(projectDir, 'browser', 'designs.json'), 'utf8'));
  assert.equal(data.designs.filter((design) => design.source === 'open-design').length, 150);
  assert.ok(data.designs.some((design) => design.id === 'linear'));
  assert.ok(data.templates.some((template) => template.id === 'open-design:saas-landing'));

  const html = readFileSync(join(projectDir, 'browser', 'index.html'), 'utf8');
  assert.match(html, /data-filter-source/);
  assert.match(html, /Open Design/);
  assert.match(html, /copy command/i);
}));

test('publish kit supports minimal, standard, and offline-full package modes', () => {
  for (const mode of ['minimal', 'standard', 'offline-full']) {
    const result = runPublish(['--platform', 'all', '--package', mode, '--dry-run']);
    assert.equal(result.status, 0, result.output);
    assert.match(result.stdout, new RegExp(`packageMode: ${mode}`));
  }

  const result = runPublish(['--platform', 'all', '--package', 'standard']);
  assert.equal(result.status, 0, result.output);
  assert.match(result.stdout, /zip: .*vibe-ui-standard-skill\.zip/);
  assert.equal(existsSync(join(skillRoot, 'dist', 'publish', 'vibe-ui-standard-skill.zip')), true);
  assert.equal(existsSync(join(skillRoot, 'dist', 'publish', 'stage-standard')), false, 'publish staging directory should be cleaned after zipping');
  rmSync(join(skillRoot, 'dist', 'publish', 'vibe-ui-standard-skill.zip'), { force: true });
  rmSync(join(skillRoot, 'dist', 'publish', 'publish-plan-standard.json'), { force: true });
  rmSync(join(skillRoot, 'dist', 'publish', 'stage-standard'), { recursive: true, force: true });
});

test('publish kit check validates package boundaries without writing artifacts', () => {
  for (const mode of ['minimal', 'standard', 'offline-full']) {
    const result = runPublish(['--platform', 'all', '--package', mode, '--check', '--json']);
    assert.equal(result.status, 0, result.output);
    const check = JSON.parse(result.stdout);
    assert.equal(check.ok, true);
    assert.equal(check.packageMode, mode);
    assert.equal(check.errors.length, 0);
    assert.ok(check.files > 0);
    assert.ok(check.totalBytes > 0);
    assert.ok(check.checks.some((item) => item.name === 'SKILL.md present'));
    assert.ok(check.checks.some((item) => item.name === 'No generated artifacts'));
  }

  const minimal = JSON.parse(runPublish(['--platform', 'all', '--package', 'minimal', '--check', '--json']).stdout);
  assert.ok(minimal.checks.some((item) => item.name === 'Open Design systems excluded from minimal'));

  const offlineFull = JSON.parse(runPublish(['--platform', 'all', '--package', 'offline-full', '--check', '--json']).stdout);
  assert.ok(offlineFull.checks.some((item) => item.name === 'Open Design systems included in offline-full'));
  assert.equal(existsSync(join(skillRoot, 'dist', 'publish', 'stage-minimal')), false);
  assert.equal(existsSync(join(skillRoot, 'dist', 'publish', 'stage-offline-full')), false);
});

test('repository publishing metadata and release scripts are ready for GitHub', () => {
  for (const file of requiredRepositoryFiles) {
    assert.equal(existsSync(join(skillRoot, file)), true, `${file} should exist`);
  }

  const packageJson = JSON.parse(readFileSync(join(skillRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.version, '1.1.0');
  assert.equal(packageJson.private, false);
  assert.equal(packageJson.license, 'MIT');
  assert.match(packageJson.description, /DESIGN\.md/i);
  assert.equal(packageJson.scripts['design:read'], 'node scripts/design.mjs read');
  assert.equal(packageJson.scripts['design:critique'], 'node scripts/design.mjs critique');
  assert.equal(packageJson.scripts['design:polish'], 'node scripts/design.mjs polish');
  assert.equal(packageJson.scripts['release:check'], 'npm test && node --check scripts/design.mjs && node --check scripts/publish-kit.mjs && node --check scripts/sync-open-design.mjs && node scripts/publish-kit.mjs --platform all --package minimal --check && node scripts/publish-kit.mjs --platform all --package standard --check && node scripts/publish-kit.mjs --platform all --package offline-full --check');
  assert.equal(packageJson.scripts['release:dry-run'], 'node scripts/publish-kit.mjs --platform all --package minimal --dry-run && node scripts/publish-kit.mjs --platform all --package standard --dry-run && node scripts/publish-kit.mjs --platform all --package offline-full --dry-run');
  assert.equal(packageJson.scripts['release:zip'], 'npm run release:check && node scripts/publish-kit.mjs --platform all --package minimal && node scripts/publish-kit.mjs --platform all --package standard && node scripts/publish-kit.mjs --platform all --package offline-full');
  assert.match(packageJson.scripts['release:smoke'], /mktemp -d/);
  assert.match(packageJson.scripts['release:smoke'], /root=\$\(pwd\)/);
  assert.match(packageJson.scripts['release:smoke'], /read .*AI release governance landing/i);
  assert.match(packageJson.scripts['release:smoke'], /brief-check landing --design linear/);
  assert.match(packageJson.scripts['release:smoke'], /generate landing --template open-design:saas-landing/);
  assert.match(packageJson.scripts['release:smoke'], /report DESIGN\.md/);
  assert.match(packageJson.scripts['release:smoke'], /critique DESIGN\.md/);
  assert.match(packageJson.scripts['release:smoke'], /polish DESIGN\.md/);
  assert.doesNotMatch(packageJson.scripts['release:smoke'], /\/Users\//);

  const agents = readFileSync(join(skillRoot, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Vibe Gate/);
  assert.match(agents, /Design Read/);
  assert.match(agents, /critique/);
  assert.match(agents, /Open Design \/ Kami/);
  assert.match(agents, /npm run release:check/);
  assert.match(agents, /Do not commit `dist\/`/);

  const changelog = readFileSync(join(skillRoot, 'CHANGELOG.md'), 'utf8');
  assert.match(changelog, /## 1\.1\.0 - 2026-06-04/);
  assert.match(changelog, /read/);
  assert.match(changelog, /critique/);
  assert.match(changelog, /polish/);
  assert.match(changelog, /## 1\.0\.0 - 2026-06-01/);
  assert.match(changelog, /Vibe Gate/);
  assert.match(changelog, /README\.zh-CN\.md/);

  const releaseNotes = readFileSync(join(skillRoot, 'RELEASE.md'), 'utf8');
  assert.match(releaseNotes, /## v1\.1\.0 Update/);
  assert.match(releaseNotes, /Vibe Gate 2\.0/);
  assert.match(releaseNotes, /read -> brief-check -> generate -> report -> critique\/polish/);

  const readme = readFileSync(join(skillRoot, 'README.md'), 'utf8');
  assert.match(readme, /Version 1\.1\.0/);
  assert.match(readme, /Design Read/);
  assert.match(readme, /Vibe Gate 2\.0/);
  assert.match(readme, /node scripts\/design\.mjs read/);
  assert.match(readme, /node scripts\/design\.mjs critique/);
  assert.match(readme, /node scripts\/design\.mjs polish/);

  const zhReadme = readFileSync(join(skillRoot, 'README.zh-CN.md'), 'utf8');
  assert.match(zhReadme, /版本 1\.1\.0/);
  assert.match(zhReadme, /Design Read/);
  assert.match(zhReadme, /Vibe Gate 2\.0/);
  assert.match(zhReadme, /node scripts\/design\.mjs read/);
  assert.match(zhReadme, /node scripts\/design\.mjs critique/);
  assert.match(zhReadme, /node scripts\/design\.mjs polish/);

  const workflow = readFileSync(join(skillRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /npm run release:check/);
  assert.match(workflow, /npm run release:dry-run/);

  const gitignore = readFileSync(join(skillRoot, '.gitignore'), 'utf8');
  assert.match(gitignore, /^dist\/$/m);
  assert.match(gitignore, /^node_modules\/$/m);
  assert.match(gitignore, /^\.DS_Store$/m);
  assert.match(gitignore, /^\.vibe-ui\/$/m);
  assert.match(gitignore, /^\/DESIGN\.md$/m);
  assert.match(gitignore, /^\/DESIGN\.generated\.md$/m);
});

test('publish package plans include public repository docs and exclude generated artifacts', () => {
  const result = runPublish(['--platform', 'all', '--package', 'minimal', '--dry-run', '--json']);
  assert.equal(result.status, 0, result.output);
  const plan = JSON.parse(result.stdout);
  for (const file of ['README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'LICENSE', 'SECURITY.md']) {
    assert.ok(plan.files.includes(file), `${file} should be in minimal package`);
  }
  assert.ok(plan.files.includes('resource/ui-anti-patterns.json'));
  assert.equal(plan.files.some((file) => file.startsWith('dist/')), false);
  assert.equal(plan.files.some((file) => file.includes('.DS_Store')), false);
});
