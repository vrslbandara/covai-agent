---
name: setup
description: COVAI one-time setup of a customer workspace for the developer running it. Run only when the developer invokes /covai:setup.
disable-model-invocation: true
---

# COVAI - Set up this workspace

Prepare the current folder so `/covai:ifs-dev-task` can run in it. Only create or change
the files listed here. Never change any file tracked by git. Ask before each write.

The customer profiles are in `../ifs-dev-task/profiles/` relative to this skill's base
directory (ignore files whose name starts with `_`). The plugin root is two levels above
this skill's base directory.

## 1. Check the folder
1. `git rev-parse --show-toplevel` must succeed and equal the current folder. If not, stop:
   "Run /covai:setup from the root of the customer's git workspace."
2. If `.covai/workspace.md` already exists, show it and ask "Update this setup? (yes / no)".
   On "no", stop.
3. Check `node --version` works. If not, stop: "Install Node.js (LTS) first, then run
   /covai:setup again."

## 2. Pick the customer
1. Read `git remote get-url origin` and every profile. Suggest the profile whose
   `remote_url_contains` is part of the remote URL.
2. Ask "Customer: <suggested profile name>? (yes / or type another profile id)".
   If no profile matches, list the profiles and say a new customer needs a profile in the
   plugin first (see `profiles/_template.md`), then stop.

## 3. Developer details
Ask, in one message, and suggest values:
- Full name (developer_name)
- Short name for branches: first 2 letters of first name + first 2 of last name, uppercase
  (e.g. Suresh Bandara -> SUBA)
- Sign for code history lines and START/END comments (e.g. CovSuBa)
- Core files folder for this customer's IFS version (default: the profile's `core_files`).
  Check it exists and contains `fndbas/deploy.ini`; if not, ask again.

## 4. Write the settings (show each file's content first, write after "yes")
1. `.covai/workspace.md`:
   ```
   # COVAI workspace settings - personal to this developer, never committed.
   customer: <profile id>
   developer_name: <name>
   developer_short_name: <SHORT>
   developer_sign: <sign>
   workspace: <current folder, Windows path>
   core_files: <core files folder>
   ```
2. `.claude/settings.local.json`: create it, or if it exists, merge into it without
   removing anything. `permissions.additionalDirectories` must contain the plugin root
   and the core files folder:
   ```
   { "permissions": { "additionalDirectories": [ "<plugin root>", "<core files folder>" ] } }
   ```
3. `.git/info/exclude`: append these lines if they are not already there:
   ```
   # COVAI personal settings
   .covai/
   .claude/
   ```
   Then check with `git check-ignore .covai/workspace.md .claude/settings.local.json`.

## 5. ADO connections
Run `claude mcp list` and check for the two servers named in the profile
(`work_items.mcp_server` and `code.mcp_server`). For each one that is missing, show the
command to run in a terminal in this folder (do not run it yourself):
```
claude mcp add --scope local <work items mcp_server> -- npx -y @azure-devops/mcp <work items ado_org>
claude mcp add --scope local <code mcp_server> -- npx -y @azure-devops/mcp <code ado_org>
```
Explain: after adding them, restart Claude Code, run `/mcp`, and sign in to each server
with the Covalent account if asked.

## 6. Finish
Say: "Setup complete. Restart Claude Code in this folder, then run
/covai:ifs-dev-task <work item id>." and stop.
