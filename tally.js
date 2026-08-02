#!/usr/bin/env node
// BOSS BATTLE token tally.
//
// Lists EVERY Claude Code session recorded for this folder — not just the newest —
// so a run can be scored AND the number of attempts can be audited.
//
// Run it from inside your boss-battle folder:
//     node tally.js
//
// How it finds your sessions: Claude Code writes a transcript per session to
// ~/.claude/projects/<mangled-folder>/<session-uuid>.jsonl, and every transcript
// records its own "cwd". We match on that recorded cwd rather than trying to
// re-derive the mangled folder name (the mangling rule is undocumented — `/`, `.`
// and `_` all become `-`, and that list is not guaranteed complete).
//
// Each session's score is the sum of all four usage fields:
//     input + output + cache_creation + cache_read
// Cache reads are ~92% of a typical total, because every turn re-reads the whole
// conversation. That is why more turns costs super-linearly more tokens.

const fs = require('fs');
const os = require('os');
const path = require('path');

const CWD_PROBE_BYTES = 65536; // enough to catch "cwd" on an early line

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
    const match = buf.slice(0, read).toString('utf8').match(/"cwd":"([^"]*)"/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function tallyFile(file) {
  const totals = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, turns: 0 };
  let firstSeen = null;
  let lastSeen = null;

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
    const usage = entry.message && entry.message.usage;
    if (!usage) continue;
    totals.turns += 1;
    totals.input += usage.input_tokens || 0;
    totals.output += usage.output_tokens || 0;
    totals.cacheWrite += usage.cache_creation_input_tokens || 0;
    totals.cacheRead += usage.cache_read_input_tokens || 0;
  }

  const total =
    totals.input + totals.output + totals.cacheWrite + totals.cacheRead;
  return { ...totals, total, firstSeen, lastSeen, file };
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

    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.endsWith('.jsonl')) continue;
      const file = path.join(dir, fileName);
      if (recordedCwd(file) !== here) continue;
      found.push(file);
    }
  }

  return found;
}

function fmt(n) {
  return String(n).padStart(11);
}

function clock(iso) {
  if (!iso) return 'unknown time';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'unknown time' : d.toLocaleString();
}

const files = findSessions();

console.log('FOLDER   ' + here);

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

console.log('ATTEMPTS ' + sessions.length);
console.log('');

sessions.forEach((s, i) => {
  console.log('--- ATTEMPT ' + (i + 1) + ' ---');
  console.log('  session      ' + path.basename(s.file, '.jsonl'));
  console.log('  started      ' + clock(s.firstSeen));
  console.log('  ended        ' + clock(s.lastSeen));
  console.log('  turns        ' + s.turns);
  console.log('  new input    ' + fmt(s.input));
  console.log('  output       ' + fmt(s.output));
  console.log('  cache write  ' + fmt(s.cacheWrite));
  console.log('  cache read   ' + fmt(s.cacheRead));
  console.log('  TOTAL        ' + fmt(s.total));
  console.log('');
});

const best = sessions.reduce((a, b) => (b.total < a.total ? b : a));
console.log('BEST ATTEMPT   #' + (sessions.indexOf(best) + 1));
console.log('BEST TOTAL     ' + best.total);

if (sessions.length > 2) {
  console.log('');
  console.log('⚠️  More than 2 sessions recorded for this folder.');
  console.log('   The contest allows 2 attempts. Check with the scorekeeper.');
}
