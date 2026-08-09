#!/usr/bin/env node
/**
 * PostToolUse hook for Edit/Write/MultiEdit.
 *
 * Fast, single-file feedback on the file the agent just changed:
 *   1) Prettier --write  (auto-format)
 *   2) ESLint --fix       (auto-fix + report remaining problems, incl. the
 *                          Clean Architecture import rules)
 *   3) Light secret scan  (high-confidence patterns only)
 *
 * It deliberately does NOT run the test suite or a whole-project type-check —
 * those belong to the pre-push gate and CI. Exit 2 reports problems back to the
 * agent so it can fix them; fails OPEN on internal errors.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let filePath = '';
try {
  const input = JSON.parse(readStdin() || '{}');
  filePath = String(input?.tool_input?.file_path ?? '');
} catch {
  process.exit(0);
}

if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) || !existsSync(filePath)) {
  process.exit(0);
}

// Nearest workspace root: a dir that has both package.json and a flat ESLint config.
function findWorkspace(file) {
  let dir = dirname(resolve(file));
  while (dir && dir !== dirname(dir)) {
    if (
      existsSync(resolve(dir, 'package.json')) &&
      existsSync(resolve(dir, 'eslint.config.mjs'))
    ) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

const ws = findWorkspace(filePath);
if (!ws) process.exit(0); // e.g. a hook/config file outside a lintable workspace
const rel = relative(ws, resolve(filePath));

const isWin = process.platform === 'win32';
function run(bin, args) {
  return execFileSync(bin, args, {
    cwd: ws,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
  });
}

// 1) Format (best-effort; never fail the hook on formatting).
try {
  run('npx', ['prettier', '--write', rel]);
} catch {
  /* prettier not configured for this file type — ignore */
}

// 2) Lint the single file (autofix, then report anything remaining).
try {
  run('npx', ['eslint', '--fix', rel]);
} catch (e) {
  const out =
    (e.stdout ? e.stdout.toString() : '') +
    (e.stderr ? e.stderr.toString() : '');
  process.stderr.write(
    `❌ ESLint problems in ${rel}\n\n${out}\n` +
      `Fix these before continuing (this includes Clean Architecture import rules).\n`,
  );
  process.exit(2);
}

// 3) High-confidence secret scan (no fuzzy heuristics = no noise).
const SECRETS = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, why: 'private key' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, why: 'AWS access key id' },
  { re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/, why: 'Slack token' },
  { re: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/, why: 'GitHub token' },
];
try {
  const content = readFileSync(resolve(ws, rel), 'utf8');
  for (const s of SECRETS) {
    if (s.re.test(content)) {
      process.stderr.write(
        `❌ Possible hardcoded ${s.why} in ${rel}. Remove it and load the value ` +
          `from validated environment configuration instead.\n`,
      );
      process.exit(2);
    }
  }
} catch {
  /* ignore read errors */
}

process.exit(0);
