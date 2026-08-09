#!/usr/bin/env node
/**
 * PreToolUse guard for the Bash tool.
 *
 * Blocks clearly-destructive commands and forced staging of secret files.
 * - Reads the hook JSON from stdin ({ tool_input: { command } }).
 * - Exit 2  => block the command; stderr is fed back to the agent.
 * - Exit 0  => allow.
 *
 * Fails OPEN (exit 0) on any internal/parse error so a bug here never bricks
 * the shell. This is defense-in-depth, not the only safeguard.
 */
import { readFileSync } from 'node:fs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let command = '';
try {
  const input = JSON.parse(readStdin() || '{}');
  command = String(input?.tool_input?.command ?? '');
} catch {
  process.exit(0);
}

if (!command.trim()) process.exit(0);

const c = command.replace(/\s+/g, ' ').trim();

// rm with BOTH recursive and force (rm -rf, -fr, -Rf, --recursive --force).
function isRmRecursiveForce(s) {
  if (!/\brm\b/.test(s)) return false;
  const hasR = /\brm\b[^&|;]*\s-[a-zA-Z]*r/i.test(s) || /--recursive\b/.test(s);
  const hasF = /\brm\b[^&|;]*\s-[a-zA-Z]*f/i.test(s) || /--force\b/.test(s);
  return hasR && hasF;
}

const RULES = [
  { test: () => isRmRecursiveForce(c), why: 'rm -rf (recursive force delete)' },
  { re: /\brm\s+-[a-zA-Z]*\s*\/(?:\s|$|\*)/i, why: 'rm targeting filesystem root' },
  { re: /\bgit\s+reset\s+--hard\b/i, why: 'git reset --hard (discards committed/staged work)' },
  { re: /\bgit\s+clean\s+-[a-zA-Z]*d[a-zA-Z]*f|\bgit\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*d/i, why: 'git clean -fd/-fdx (deletes untracked files)' },
  { re: /\bgit\s+push\b[^&|;]*(--force\b|--force-with-lease\b|\s-f\b)/i, why: 'git push --force / --force-with-lease / -f' },
  { re: /\bgit\s+checkout\s+--\s+\.(?:\s|$)/i, why: 'git checkout -- . (discards local changes)' },
  { re: /\bgit\s+add\s+(?:-f|--force)\b[^&|;]*\.env/i, why: 'force-adding a .env file (would commit secrets)' },
  { re: /\bdocker\s+system\s+prune\b[^&|;]*(-a\b|--all\b|--volumes\b)/i, why: 'docker system prune -a/--volumes (removes images/volumes)' },
  { re: /\bdocker\s+volume\s+(rm|prune)\b/i, why: 'docker volume rm/prune (deletes data volumes)' },
  { re: /\b(DROP|TRUNCATE)\s+(DATABASE|TABLE|SCHEMA)\b/i, why: 'destructive SQL (DROP/TRUNCATE)' },
  { re: /\bprisma\s+migrate\s+reset\b/i, why: 'prisma migrate reset (drops & recreates the database)' },
  { re: /\bprisma\s+db\s+push\b[^&|;]*--accept-data-loss\b/i, why: 'prisma db push --accept-data-loss' },
  { re: /\bmkfs\b|\bdd\b[^&|;]*\bof=\/dev\//i, why: 'disk-destroying command (mkfs/dd to a device)' },
  { re: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/, why: 'fork bomb' },
];

for (const rule of RULES) {
  const hit = rule.test ? rule.test() : rule.re.test(c);
  if (hit) {
    process.stderr.write(
      `❌ Blocked by the Claude Code safety guard: ${rule.why}\n` +
        `Command: ${command}\n` +
        `Destructive/irreversible commands are not run automatically. If this is ` +
        `genuinely intended, run it yourself in a terminal.\n`,
    );
    process.exit(2);
  }
}

process.exit(0);
