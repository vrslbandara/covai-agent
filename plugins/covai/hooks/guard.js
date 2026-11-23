// COVAI guard: blocks risky git commands in COVAI workspaces (folders with .covai/workspace.md).
// Exit code 2 blocks the tool call and shows the message to Claude.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const cwd = input.cwd || process.cwd();
  if (!fs.existsSync(path.join(cwd, '.covai', 'workspace.md'))) process.exit(0);

  // Remember the session log so tools/tokens.js can total the token usage.
  try {
    if (input.transcript_path)
      fs.writeFileSync(path.join(cwd, '.covai', 'session.json'),
        JSON.stringify({ transcript_path: input.transcript_path, session_id: input.session_id || '' }));
  } catch {}

  const protectedRe = /^(master|main|master-.*|del-.*)$/;
  const block = msg => { process.stderr.write('COVAI guard: ' + msg + '\n'); process.exit(2); };

  // ADO MCP calls: work items read only; code org may only create a pull request.
  const tool = String(input.tool_name || '');
  if (tool.startsWith('mcp__covai-ado')) {
    const ti = input.tool_input || {};
    const action = String(ti.action || '');
    const writeName = /(write|create|update|delete|comment|link|upload|vote|merge|abandon|complete)/i;
    if (tool.startsWith('mcp__covai-ado-pw')) {
      // The only allowed write: add a comment. Attachments are added by the developer.
      const isComment = /comment/i.test(tool) && !/^(update|delete|edit|remove)/i.test(action);
      if (isComment) process.exit(0);
      if (/attachment_(upload|link)/i.test(tool) || writeName.test(tool) || /^(create|update|delete|add|link|upload|remove)/i.test(action))
        block('work items are read only, except adding a comment. Attach documents yourself in ADO.');
      process.exit(0);
    }
    const isPrCreate = (/pull_?request/i.test(tool) && action === 'create') || /create_pull_?request$/i.test(tool);
    if (isPrCreate) {
      if (ti.autoComplete || ti.bypassPolicy) block('auto-complete and policy bypass are not allowed.');
      if (!/^refs\/heads\/topic\//.test(String(ti.sourceRefName || ''))) block('PR source must be a topic/ branch.');
      process.exit(0);
    }
    if (writeName.test(tool) || /^(create|update|delete|vote|merge|abandon|complete|update_reviewers)$/i.test(action))
      block(`"${tool}" ${action} is not allowed. The only ADO write COVAI may do is creating a pull request.`);
    process.exit(0);
  }

  const cmd = String((input.tool_input && input.tool_input.command) || '');

  // Split chained commands so each git call is checked.
  for (const part of cmd.split(/&&|\|\||;|\n|\|/)) {
    const t = part.trim().split(/\s+/);
    const g = t.indexOf('git');
    if (g === -1) continue;
    const args = t.slice(g + 1).filter(a => !/^-c$/.test(a));
    const sub = args.find(a => !a.startsWith('-'));
    const rest = args.slice(args.indexOf(sub) + 1);

    if (sub === 'push') {
      if (rest.some(a => /^(-f|--force.*|--mirror|--all|--delete|-d|--tags)$/.test(a) || a.startsWith('+') || a.startsWith(':')))
        block('force, delete, --all, --mirror and --tags pushes are not allowed.');
      const pos = rest.filter(a => !a.startsWith('-'));
      if (pos.length < 2 || pos[0] !== 'origin')
        block('push must name the remote and branch explicitly: git push -u origin topic/<...>');
      for (const ref of pos.slice(1)) {
        const dst = ref.includes(':') ? ref.split(':')[1] : ref;
        const name = dst.replace(/^refs\/heads\//, '');
        if (protectedRe.test(name) || !name.startsWith('topic/'))
          block(`pushing to "${name}" is not allowed. Only topic/ branches can be pushed.`);
      }
    }

    if (sub === 'add' && rest.some(a => /^(\.|-A|--all|\*|:\/)$/.test(a)))
      block('stage files by name only (git add -- <file> ...), never git add . / -A / --all.');

    if (sub === 'commit' || sub === 'merge' || sub === 'rebase' || sub === 'reset' || sub === 'cherry-pick') {
      let branch = '';
      try { branch = execSync('git branch --show-current', { cwd }).toString().trim(); } catch {}
      if (protectedRe.test(branch))
        block(`"git ${sub}" is not allowed while on protected branch "${branch}".`);
    }

    if (sub === 'reset' && rest.includes('--hard')) block('git reset --hard is not allowed.');
    if (sub === 'clean') block('git clean is not allowed.');
  }
  process.exit(0);
});
