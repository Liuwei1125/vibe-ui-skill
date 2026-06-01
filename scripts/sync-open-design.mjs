#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = 'nexu-io/open-design';
const branch = 'main';
const apiBase = `https://api.github.com/repos/${repo}`;

const commit = await fetchJson(`${apiBase}/commits/${branch}`).then((data) => data.sha);
const tree = await fetchJson(`${apiBase}/git/trees/${commit}?recursive=1`);
const designEntries = tree.tree
  .filter((entry) => /^design-systems\/[^/]+\/DESIGN\.md$/.test(entry.path))
  .sort((a, b) => a.path.localeCompare(b.path));

const systems = [];
for (const entry of designEntries) {
  const slug = entry.path.split('/')[1];
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${commit}/${entry.path}`;
  const body = await fetchText(rawUrl);
  systems.push(buildSystem(slug, entry.path, body));
}

const resourceDir = join(skillRoot, 'resource');
await mkdir(resourceDir, { recursive: true });
await writeFile(join(resourceDir, 'open-design-systems.json'), `${JSON.stringify({
  schemaVersion: 'vibe-ui/open-design-systems/v1',
  generatedAt: new Date().toISOString(),
  source: {
    repo,
    branch,
    commit,
    designSystemsPath: 'design-systems',
    license: 'Apache-2.0',
  },
  systems,
}, null, 2)}\n`);

await writeFile(join(resourceDir, 'open-design-attribution.md'), buildAttribution(commit, systems.length));

console.log(`Synced ${systems.length} Open Design systems from ${repo}@${commit}`);

async function fetchJson(url) {
  const response = await fetchWithRetry(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vibe-ui-open-design-sync',
    },
  });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status} ${response.statusText} ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'vibe-ui-open-design-sync' } });
  if (!response.ok) throw new Error(`Raw request failed: ${response.status} ${response.statusText} ${url}`);
  return response.text();
}

async function fetchWithRetry(url, options, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || ![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === attempts) {
        return response;
      }
      lastError = new Error(`Retryable HTTP ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await sleep(250 * attempt);
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSystem(id, path, body) {
  const title = heading(body) || yamlName(body) || `Design System Inspired by ${humanize(id)}`;
  const normalizedBody = body.startsWith('#') ? body : `# ${title}\n\n${body}`;
  const category = metadataLine(normalizedBody, 'Category') || 'Open Design';
  const summary = metadataSummary(normalizedBody) || firstParagraph(normalizedBody) || title;
  const swatches = extractSwatches(normalizedBody);
  const text = `${id} ${title} ${category} ${summary} ${normalizedBody}`;
  return {
    id,
    namespacedId: `open-design:${id}`,
    name: stripInspiredPrefix(title),
    title,
    category,
    description: summary.replace(/\s+/g, ' ').trim(),
    sourcePath: path,
    source: 'open-design',
    repo,
    commit,
    body: normalizedBody,
    swatches,
    keywords: keywordHints(text),
  };
}

function heading(text) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
}

function yamlName(text) {
  return text.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim() || '';
}

function metadataLine(text, label) {
  return text.match(new RegExp(`^>\\s*${label}:\\s*(.+)$`, 'mi'))?.[1]?.trim() || '';
}

function metadataSummary(text) {
  const lines = text.split('\n');
  const categoryIndex = lines.findIndex((line) => /^>\s*Category:/i.test(line));
  if (categoryIndex < 0) return '';
  for (let index = categoryIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].replace(/^>\s*/, '').trim();
    if (line) return line;
  }
  return '';
}

function firstParagraph(text) {
  return text
    .replace(/^#.*$/m, '')
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^>.*$/gm, '').trim())
    .find(Boolean) || '';
}

function extractSwatches(text) {
  const colors = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((match) => normalizeHex(match[0]));
  return [...new Set(colors)].slice(0, 12);
}

function normalizeHex(value) {
  return value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase()
    : value.toLowerCase();
}

function stripInspiredPrefix(value) {
  return value.replace(/^Design System Inspired by\s+/i, '').trim();
}

function humanize(value) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function keywordHints(text) {
  const normalized = text.toLowerCase();
  const hints = [
    'ai', 'llm', 'saas', 'dashboard', 'landing', 'pricing', 'docs', 'developer',
    'fintech', 'crypto', 'ecommerce', 'retail', 'media', 'consumer', 'productivity',
    'design', 'creative', 'automotive', 'dark', 'light', 'editorial', 'minimal',
    'gradient', 'enterprise', 'mobile', 'marketing', 'brand',
  ];
  return hints.filter((hint) => normalized.includes(hint));
}

function buildAttribution(sourceCommit, count) {
  return `# Open Design Attribution

Vibe UI bundles ${count} local DESIGN.md resources from Open Design for offline search and application.

## Source

- Project: Open Design
- Repository: https://github.com/nexu-io/open-design
- Source path: design-systems/*/DESIGN.md
- Synced commit: ${sourceCommit}
- License: Apache-2.0

## Upstream Notes

Open Design documents that its bundled design systems include hand-authored starters, 70 imported product systems from VoltAgent/awesome-design-md / getdesign under MIT terms, the kami system adapted from tw93/kami under MIT terms, and 57 design skills from bergside/awesome-design-skills.

These resources are aesthetic references for agentic UI generation. They are not official brand design systems, do not grant trademark rights, and should not be used to copy logos, proprietary assets, official claims, or brand identities.
`;
}
