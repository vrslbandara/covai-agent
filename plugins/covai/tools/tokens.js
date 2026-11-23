// COVAI: total the tokens used by the current Claude Code session for one work item run.
// Usage: node tokens.js <workspace> <work item id>
// Reads the session log path that the COVAI guard hook saves in <workspace>/.covai/session.json,
// then sums the usage of every model response from the start of the
// "/covai:ifs-dev-task <id>" run (or the whole session if that start is not found).
// Subagent work is included when its log sits next to the session log.
const fs = require('fs');
const path = require('path');

const [, , workspace = process.cwd(), id = ''] = process.argv;
let info;
try { info = JSON.parse(fs.readFileSync(path.join(workspace, '.covai', 'session.json'), 'utf8')); }
catch { console.log(JSON.stringify({ error: 'No .covai/session.json yet. Token usage not available.' })); process.exit(0); }

const main = info.transcript_path;
if (!main || !fs.existsSync(main)) { console.log(JSON.stringify({ error: 'Session log not found.' })); process.exit(0); }

function readJsonl(f) {
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const entries = readJsonl(main);
// Find the start of this work item's run: the last user message that invoked the skill with this id.
let start = 0;
const marker = new RegExp('ifs-dev-task[^\\n]*\\b' + id + '\\b');
entries.forEach((e, i) => {
  if (e.type === 'user' && id && marker.test(JSON.stringify(e.message || ''))) start = i;
});
const startTime = entries[start] && entries[start].timestamp;

// Subagent logs: <session-id>/subagents/*.jsonl next to the main log.
const subDir = path.join(path.dirname(main), path.basename(main, '.jsonl'), 'subagents');
let subEntries = [];
if (fs.existsSync(subDir)) {
  for (const f of fs.readdirSync(subDir).filter(f => f.endsWith('.jsonl')))
    subEntries = subEntries.concat(readJsonl(path.join(subDir, f)).filter(e => !startTime || (e.timestamp && e.timestamp >= startTime)));
}

const seen = new Map();
for (const e of entries.slice(start).concat(subEntries)) {
  const u = e.message && e.message.usage;
  if (e.type !== 'assistant' || !u) continue;
  const key = (e.message.id || '') + ':' + (e.requestId || '');
  seen.set(key, u); // the last entry for a message holds its final usage
}

const t = { input: 0, output: 0, cache_write: 0, cache_read: 0 };
for (const u of seen.values()) {
  t.input += u.input_tokens || 0;
  t.output += u.output_tokens || 0;
  t.cache_write += u.cache_creation_input_tokens || 0;
  t.cache_read += u.cache_read_input_tokens || 0;
}
t.total = t.input + t.output + t.cache_write + t.cache_read;
t.responses = seen.size;
t.scope = start > 0 ? `from the start of /covai:ifs-dev-task ${id}` : 'whole session';
console.log(JSON.stringify(t));
