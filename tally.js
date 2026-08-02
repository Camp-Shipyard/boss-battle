#!/usr/bin/env node
// BOSS BATTLE token tally.
//
// Run it from inside your boss-battle folder, after you /exit Claude:
//     node tally.js
//
// It lists EVERY Claude Code session recorded for this folder, scores each one, and
// separates the unscored setup session from the scored battle attempts.
//
// ---------------------------------------------------------------------------
// How it finds your sessions
// Claude Code writes one transcript per session to
//   ~/.claude/projects/<mangled-folder>/<session-uuid>.jsonl
// and every transcript records its own "cwd". We match on that recorded cwd rather
// than re-deriving the mangled folder name — the mangling rule is undocumented
// (`/`, `.` and `_` all become `-`, and that list is not guaranteed complete).
//
// How a session is scored
//   score = input + output + cache_creation + cache_read
// Cache reads are ~92% of a typical total, because every turn re-reads the whole
// conversation. That is why more turns costs super-linearly more tokens.
//
// How setup is told apart from a battle attempt
// A battle attempt is a session where Claude actually edited the site — a Write or
// Edit tool call against a .html or .css file in this folder. The setup session
// (clone, git, Vercel) touches none of those, so it drops out of the ranking
// automatically. This doubles as the anti-cheat check: a camper who hand-edits the
// files produces a session with NO such tool call, and it will not rank.
// ---------------------------------------------------------------------------

const fs = require('fs');
const os = require('os');
const path = require('path');

const CWD_PROBE_BYTES = 65536; // enough to catch "cwd" on an early line
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SITE_FILE = /\.(html|css)$/i;

const projectsDir = path.join(os.homedir(), '.claude', 'projects');
const here = fs.realpathSync(process.cwd()); // Claude Code records the RESOLVED path

// Read only the head of a file to test its recorded cwd — transcripts can be many MB
// and we do not want to fully parse every session on the machine.
function recordedCwd(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(CWD_PROBE_BYTES);
    const read = fs.readSync(fd, buf, 0, CWD_PROBE_BYTES, 0);
    const head = buf.slice(0, read).toString('utf8');
    const match = head.match(/"cwd":"([^"]*)"/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function tallyFile(file) {
  let input = 0;
  let output = 0;
  let cacheWrite = 0;
  let cacheRead = 0;
  let turns = 0;
  let firstSeen = null;
  let lastSeen = null;
  const edited = new Set();

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (e) {
      continue; // partial or blank line
    }

    if (entry.timestamp) {
      if (firstSeen === null) firstSeen = entry.timestamp;
      lastSeen = entry.timestamp;
    }

    const message = entry.message;
    if (!message) continue;

    const usage = message.usage;
    if (usage) {
      turns += 1;
      input += usage.input_tokens || 0;
      output += usage.output_tokens || 0;
      cacheWrite += usage.cache_creation_input_tokens || 0;
      cacheRead += usage.cache_read_input_tokens || 0;
    }

    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (!block || block.type !== 'tool_use') continue;
        if (!EDIT_TOOLS.has(block.name)) continue;
        const target = block.input && block.input.file_path;
        if (typeof target === 'string' && SITE_FILE.test(target)) {
          edited.add(path.basename(target));
        }
      }
    }
  }

  return {
    file,
    turns,
    input,
    output,
    cacheWrite,
    cacheRead,
    total: input + output + cacheWrite + cacheRead,
    firstSeen,
    lastSeen,
    edited: [...edited].sort(),
  };
}

function findSessions() {
  if (!fs.existsSync(projectsDir)) return [];
  const found = [];

  for (const dirName of fs.readdirSync(projectsDir)) {
    const dir = path.join(projectsDir, dirName);
    let stat;
    try {
      stat = fs.statSync(dir);
    } catch (e) {
      continue;
    }
    if (!stat.isDirectory()) continue;

    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch (e) {
      continue;
    }

    for (const fileName of entries) {
      if (!fileName.endsWith('.jsonl')) continue;
      const file = path.join(dir, fileName);
      if (recordedCwd(file) === here) found.push(file);
    }
  }

  return found;
}

const pad = (n) => String(n).padStart(11);

function clock(iso) {
  if (!iso) return 'unknown time';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'unknown time' : d.toLocaleString();
}

// ---------------------------------------------------------------------------

console.log('FOLDER   ' + here);

const files = findSessions();

if (files.length === 0) {
  console.log('');
  console.log('No Claude session found for this folder yet.');
  console.log('Make sure you are inside your boss-battle folder, run `claude`,');
  console.log('quit with /exit, then run this again.');
  process.exit(0);
}

const sessions = files
  .map(tallyFile)
  .sort((a, b) => String(a.firstSeen).localeCompare(String(b.firstSeen)));

console.log('SESSIONS ' + sessions.length);
console.log('');

let attemptNo = 0;
for (const s of sessions) {
  const isAttempt = s.edited.length > 0;
  if (isAttempt) attemptNo += 1;
  s.attemptNo = isAttempt ? attemptNo : null;

  console.log(
    isAttempt ? '--- BATTLE ATTEMPT ' + attemptNo + ' ---' : '--- setup / no site edits (not scored) ---'
  );
  console.log('  session      ' + path.basename(s.file, '.jsonl'));
  console.log('  started      ' + clock(s.firstSeen));
  console.log('  ended        ' + clock(s.lastSeen));
  console.log('  turns        ' + s.turns);
  console.log('  edited       ' + (s.edited.join(', ') || '(nothing)'));
  console.log('  new input    ' + pad(s.input));
  console.log('  output       ' + pad(s.output));
  console.log('  cache write  ' + pad(s.cacheWrite));
  console.log('  cache read   ' + pad(s.cacheRead));
  console.log('  TOTAL        ' + pad(s.total));
  console.log('');
}

const attempts = sessions.filter((s) => s.attemptNo !== null);

if (attempts.length === 0) {
  console.log('No scored attempt yet — no session has edited a .html or .css file.');
  console.log('Remember: Claude has to make the change. Hand-editing does not count.');
  process.exit(0);
}

const best = attempts.reduce((a, b) => (b.total < a.total ? b : a));
console.log('BATTLE ATTEMPTS  ' + attempts.length);
console.log('BEST ATTEMPT     #' + best.attemptNo);
console.log('BEST TOTAL       ' + best.total);

if (attempts.length > 2) {
  console.log('');
  console.log('⚠️  More than 2 scored attempts recorded for this folder.');
  console.log('   The contest allows 2. Check with the scorekeeper.');
}
