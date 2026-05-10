import { execFileSync } from 'node:child_process';

function git(args, opts = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', opts.captureStderr ? 'pipe' : 'ignore'],
    ...opts,
  });
}

export function inRepo() {
  try {
    git(['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

export function repoRoot() {
  return git(['rev-parse', '--show-toplevel']).trim();
}

export function resolveBase(base) {
  if (base) return base;
  for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
    try {
      git(['rev-parse', '--verify', '--quiet', candidate]);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    'could not find a base ref (tried origin/main, origin/master, main, master). Pass --base.',
  );
}

export function mergeBase(base, head) {
  return git(['merge-base', base, head]).trim();
}

export function changedFiles(base, head) {
  const out = git(['diff', '--name-status', '-z', `${base}...${head}`]);
  return parseNameStatus(out);
}

export function untrackedFiles() {
  const out = git(['ls-files', '--others', '--exclude-standard', '-z']);
  return out
    .split('\0')
    .filter(Boolean)
    .map((path) => ({ status: '?', path }));
}

export function fileDiff(base, head, path) {
  return git(['diff', '--unified=10', `${base}...${head}`, '--', path]);
}

export function fileAt(ref, path) {
  return git(['show', `${ref}:${path}`]);
}

export function commitsBetween(base, head) {
  const sep = '';
  const fmt = ['%H', '%an', '%ad', '%s'].join(sep);
  const out = git(['log', '--date=short', `--pretty=format:${fmt}`, `${base}..${head}`]);
  if (!out.trim()) return [];
  return out.split('\n').map((line) => {
    const [hash, author, date, subject] = line.split(sep);
    return { hash: hash.slice(0, 7), author, date, subject };
  });
}

export function repoName() {
  try {
    const url = git(['config', '--get', 'remote.origin.url']).trim();
    return url.replace(/\.git$/, '').split(/[\/:]/).slice(-2).join('/');
  } catch {
    return null;
  }
}

export function currentBranch() {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  } catch {
    return null;
  }
}

function parseNameStatus(raw) {
  const tokens = raw.split('\0').filter((s) => s !== '');
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const status = tokens[i++];
    if (status.startsWith('R') || status.startsWith('C')) {
      const from = tokens[i++];
      const to = tokens[i++];
      out.push({ status: status[0], path: to, from });
    } else {
      const path = tokens[i++];
      out.push({ status: status[0], path });
    }
  }
  return out;
}
