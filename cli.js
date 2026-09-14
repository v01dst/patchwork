#!/usr/bin/env node
/**
 * Patchwork CLI — `patchwork-dashboard init [dir]`
 *
 * Scaffolds a ready-to-configure Patchwork dashboard into [dir] (default: ./patchwork):
 *   1. Copies the complete app (source, migrations, tests, configs).
 *   2. Creates `.env.local` from `.env.example` (never overwrites an existing one).
 *   3. Offers to run `npm install`.
 *   4. Prints the exact remaining setup steps (Supabase project → migrations → keys → dev).
 *
 * Zero runtime dependencies. Requires Node 18+.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXCLUDE = new Set([
  '.git',
  'node_modules',
  '.next',
  'out',
  'coverage',
  '.vercel',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  'package-lock.json',
  'npm-debug.log',
  '.DS_Store',
  'cli.js', // the CLI itself is provided by the npm package, not scaffolded
]);

const color = (enabled, code, s) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = (s) => color(process.stdout.isTTY, '1', s);
const dim = (s) => color(process.stdout.isTTY, '2', s);
const green = (s) => color(process.stdout.isTTY, '32', s);
const yellow = (s) => color(process.stdout.isTTY, '33', s);
const red = (s) => color(process.stdout.isTTY, '31', s);

function usage() {
  console.log(`
${bold('patchwork-dashboard init')} ${dim('[dir] [options]')}

Scaffold a production-grade developer project dashboard (Next.js + Supabase).

${bold('Options:')}
  ${dim('--force')}        Write into an existing non-empty directory
  ${dim('--no-install')}   Skip the npm install prompt
  ${dim('--help, -h')}     Show this help
  ${dim('--version, -v')}  Show the CLI version
`);
}

function fail(msg) {
  console.error(red(`✗ ${msg}`));
  process.exit(1);
}

function ask(question) {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (d) => resolve(String(d).trim().toLowerCase() !== 'n' && String(d).trim() !== ''));
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function nextSteps(targetDir, installed) {
  const rel = path.relative(process.cwd(), targetDir);
  const dir = rel && !rel.startsWith('..') ? rel : targetDir;
  const pkg = (name) => bold(name);
  const steps = [
    `Create a free Supabase project at ${pkg('https://supabase.com/dashboard')}`,
    `In the Supabase ${bold('SQL Editor')}, run both migrations in order:\n` +
      `     ${dim('supabase/migrations/20260829000000_init_patchwork.sql')}  ${dim('# tables, indexes, RLS')}\n` +
      `     ${dim('supabase/migrations/20260829120000_atomic_rpc.sql')}      ${dim('# atomic RPC functions (REQUIRED)')}\n` +
      `   ${dim('or: supabase db push, with the Supabase CLI')}`,
    `Paste your Supabase keys into ${bold('.env.local')}:\n` +
      `     ${dim('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,')}\n` +
      `     ${dim('SUPABASE_SERVICE_ROLE_KEY, PATCHWORK_API_SECRET')}`,
  ];
  if (!installed) steps.push(`Install dependencies:  ${pkg(`cd ${dir} && npm install`)}`);
  steps.push(`Start the dev server:  ${pkg(`cd ${dir} && npm run dev`)}`);

  console.log(`
${bold('Next steps')} ${dim('(full guide: README.md)')}`);
  steps.forEach((s, i) => console.log(`  ${bold(`${i + 1}.`)} ${s}\n`));
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help')) return usage();
  if (argv.includes('-v') || argv.includes('--version')) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
      return console.log(pkgJson.version || '1.0.0');
    } catch {
      return console.log('1.0.0');
    }
  }

  const command = argv[0];
  if (command && command !== 'init') {
    usage();
    return fail(`Unknown command "${command}". Supported: init`);
  }

  const flags = argv.slice(command ? 1 : 0);
  const positional = flags.filter((a) => !a.startsWith('-'));
  const force = flags.includes('--force');
  const noInstall = flags.includes('--no-install');

  const sourceDir = __dirname;
  const targetDir = path.resolve(process.cwd(), positional[0] || 'patchwork');

  if (!fs.existsSync(path.join(sourceDir, 'package.json'))) {
    return fail('Could not locate the Patchwork source. Reinstall the package.');
  }

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      return fail(
        `Directory "${targetDir}" is not empty. Choose another name or re-run with ${bold('--force')}.`
      );
    }
  }

  console.log(`
${bold('🧩 Patchwork init')} ${dim(`→ ${targetDir}`)}
`);

  // 1) Copy the app.
  console.log(dim('• Copying app files...'));
  try {
    copyDir(sourceDir, targetDir);
  } catch (err) {
    return fail(`Failed to copy files: ${err.message}`);
  }
  console.log(green(`✓ Scaffolded into ${targetDir}`));

  // 2) Create .env.local (never overwrite).
  const envLocal = path.join(targetDir, '.env.local');
  const envExample = path.join(targetDir, '.env.example');
  if (fs.existsSync(envLocal)) {
    console.log(yellow('• .env.local already exists — left untouched'));
  } else if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envLocal);
    console.log(green('✓ Created .env.local from .env.example'));
  } else {
    console.log(yellow('• .env.example missing — create .env.local manually'));
  }

  // 3) Offer npm install.
  let installed = false;
  const shouldInstall = noInstall
    ? false
    : await ask(bold('Run `npm install` now? (Y/n) '));
  if (shouldInstall) {
    console.log(dim('\n• Running npm install (this can take a minute)...'));
    const res = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: targetDir,
      stdio: 'inherit',
    });
    if (res.status === 0) {
      installed = true;
      console.log(green('\n✓ Dependencies installed'));
    } else {
      console.log(yellow('\n• npm install failed — run it manually later'));
    }
  }

  // 4) Print exact remaining steps.
  nextSteps(targetDir, installed);
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));
