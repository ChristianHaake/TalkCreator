import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const reference = '25_Development/standards/haak3-webapps/reference/creator';
const ledger = 'creator-source.lock.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function git(cwd, ...args) {
  return execFileSync('git', ['--no-replace-objects', '-C', cwd, ...args], {
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function relativeName(value) {
  if (typeof value !== 'string' || !value.split('/').every(part =>
    /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(part) && !part.endsWith('.') &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part))) {
    throw new Error('Invalid relative path: ' + JSON.stringify(value));
  }
  return value;
}

function loadSource(repo, commit) {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(commit) ||
      git(repo, 'cat-file', '-t', commit).toString().trim() !== 'commit') {
    throw new Error('Expected a full Git commit ID');
  }
  const tree = new Map();
  for (const entry of git(repo, 'ls-tree', '-rz', commit, '--', reference).toString().split('\0').filter(Boolean)) {
    const match = /^(100644|100755) blob ([0-9a-f]+)\t(.+)$/u.exec(entry);
    if (match) tree.set(match[3].slice(reference.length + 1), match[2]);
  }
  function blob(file) {
    if (!tree.has(file)) throw new Error('Missing regular source file: ' + file);
    return git(repo, 'cat-file', 'blob', tree.get(file));
  }
  const manifest = JSON.parse(blob('manifest.json'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('Invalid reference manifest');
  const files = new Map();
  const paths = new Set();
  for (const entry of manifest.files) {
    const target = relativeName(entry.target);
    const key = target.toLowerCase();
    if (key === ledger || key.startsWith(ledger + '/') || paths.has(key)) throw new Error('Duplicate or reserved target: ' + target);
    paths.add(key);
    files.set(target, blob(relativeName(entry.source)));
  }
  for (const name of paths) {
    let dir = path.posix.dirname(name);
    while (dir !== '.') {
      if (paths.has(dir)) throw new Error('Overlapping target: ' + name);
      dir = path.posix.dirname(dir);
    }
  }
  const checksums = Object.fromEntries([...files].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, bytes]) => [name, hash(bytes)]));
  return { files, lock: { version: 1, commit, files: checksums } };
}

// Inspect each component before reading or moving a path in the destination.
function inspect(root, relative) {
  let current = root;
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) return undefined;
    if (index !== parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error('Unsafe destination: ' + relative);
    }
  }
  return fs.readFileSync(current);
}

function encode(lock) {
  return Buffer.from(JSON.stringify(lock, null, 2) + '\n');
}

export function synchronize(repository, commit, destination = process.cwd()) {
  const root = fs.realpathSync(destination);
  if (root !== fs.realpathSync(git(root, 'rev-parse', '--show-toplevel').toString().trim())) {
    throw new Error('Run from the application repository root');
  }
  const next = loadSource(repository, commit);
  // Git supplies a separate administration directory for each linked worktree.
  const gitDir = git(root, 'rev-parse', '--absolute-git-dir').toString().trim();
  const lockPath = path.join(gitDir, 'creator-sync.lock');
  fs.mkdirSync(lockPath);
  let work;
  let retainBackup = false;
  try {
    const previousBytes = inspect(root, ledger);
    let previous = new Map();
    if (previousBytes) {
      const prior = loadSource(repository, JSON.parse(previousBytes).commit);
      if (!previousBytes.equals(encode(prior.lock))) throw new Error('Modified synchronization ledger');
      previous = prior.files;
    }
    const actions = [];
    const portableNames = new Map();
    for (const name of new Set([...previous.keys(), ...next.files.keys()])) {
      const key = name.toLowerCase();
      if (portableNames.has(key)) throw new Error('Case-only rename requires an intermediate version: ' + name);
      portableNames.set(key, name);
      const current = inspect(root, name);
      const before = previous.get(name);
      if (before ? !current?.equals(before) : current !== undefined) {
        throw new Error('Local change or unmanaged destination: ' + name);
      }
      const after = next.files.get(name);
      if (!before || !after || !before.equals(after)) actions.push({ name, before, after });
    }
    const nextBytes = encode(next.lock);
    if (!previousBytes?.equals(nextBytes)) actions.push({ name: ledger, before: previousBytes, after: nextBytes });
    if (!actions.length) return 0;

    // Preflight is complete. Stage all new bytes on the destination filesystem.
    work = fs.mkdtempSync(path.join(root, '.creator-sync-'));
    for (const [i, action] of actions.entries()) {
      if (action.after) fs.writeFileSync(path.join(work, 'new-' + i), action.after);
    }
    const undo = [];
    try {
      for (const [i, { name, before, after }] of actions.entries()) {
        const target = path.join(root, name);
        if (before) {
          const backup = path.join(work, 'old-' + i);
          fs.renameSync(target, backup);
          undo.push(() => fs.renameSync(backup, target));
        }
        if (after) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.renameSync(path.join(work, 'new-' + i), target);
          undo.push(() => fs.unlinkSync(target));
        }
      }
    } catch (error) {
      try {
        for (const rollback of undo.reverse()) rollback();
      } catch (rollbackError) {
        retainBackup = true;
        throw new AggregateError([error, rollbackError], 'Rollback incomplete. Backups retained at ' + work);
      }
      throw error;
    }
    return actions.length;
  } finally {
    if (work && !retainBackup) fs.rmSync(work, { recursive: true, force: true });
    fs.rmdirSync(lockPath);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node sync-creator.mjs <Agent-Memory checkout> <full commit ID>');
    console.log('Changed files including ledger: ' + synchronize(process.argv[2], process.argv[3]));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
