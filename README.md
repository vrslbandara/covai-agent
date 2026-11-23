# COVAI

COVAI is Covalent's IFS Cloud development agent, packaged as a Claude Code plugin. It takes an
Azure DevOps task, CRIM or bug and turns it into an IFS Cloud customization on a feature
branch and a pull request. The developer approves every step, and builds, deploys and tests.

## What it does

`/covai:ifs-dev-task <work item id>` runs these stages, stopping for the developer where marked:

| Stage | What happens | Developer gate |
|---|---|---|
| 0-2 | Check the id, load the customer profile, run 11 read-only pre-flight checks | Confirm setup |
| 3 | Read the work item, comments and attachments; propose prefix, branch and PR title | Confirm |
| 3b | Resume earlier work on the same branch, or choose: develop / specification only | Choose |
| 4 | Read the spec (if any), check earlier work, find core and -Cust objects, plan | Approve plan |
| 5 | Create the branch from the latest origin/master | |
| 6 | Write the code, marked with history lines ending "- (COVAI)" | |
| 7 | Post a technical summary to the work item (deploy and test steps) | Post? then "verified" |
| 8 | Commit with "<PREFIX>-<ID> <summary> - COVAI" and push the branch | Commit? Push? |
| 9 | Create the pull request | Create? |
| 10 | Optional Word technical document (or specification), attached by the developer | Optional |
| 11 | Completion comment with PR link and token usage | Post? |

In "specification only" mode, stages 5-9 never run: COVAI plans and writes a technical
specification.

## Safety

- COVAI never builds, deploys, merges, force-pushes or writes to master.
- A guard hook enforces this in code: it blocks pushes other than `git push -u origin topic/...`,
  `git add .`/`-A`, commits on protected branches, `reset --hard`, `clean`, and every ADO write
  except creating a pull request from a topic/ branch and adding work item comments.
- Core files are read-only context. Personal settings (`.covai/`, `.claude/`) are excluded from git.

## Requirements

- Claude Code (Covalent paid seat), Git, Node.js LTS
- Access to the customer's ADO organisations with your Covalent account
- The customer's core files checkout for its IFS version
- Access to this private GitHub repo

## Install (once per machine)

    claude plugin marketplace add <github-org>/covai-agent
    claude plugin install covai@covai

Update to the latest version later with:

    claude plugin marketplace update covai

then update the plugin from `/plugin` and restart Claude Code.

## Set up a customer workspace (once per workspace)

1. Open a terminal in the root of the customer's git workspace and start `claude`.
2. Run `/covai:setup` and answer its questions. It creates your personal settings and shows
   the two `claude mcp add ...` commands for the customer's ADO organisations.
3. Run those commands, restart Claude Code, run `/mcp` and sign in to both servers.

## Use

    /covai:ifs-dev-task 21819

## Add a new customer

1. Copy `plugins/covai/skills/ifs-dev-task/profiles/_template.md` to `<customer-id>.md` and fill it in
   (ADO organisations, repo, branch rule, workspace conventions).
2. Raise the version in `plugins/covai/.claude-plugin/plugin.json`, add a line to `CHANGELOG.md`,
   and push. Developers get it with `claude plugin marketplace update covai`.

## Repository layout

    .claude-plugin/marketplace.json        this repo is a plugin marketplace
    plugins/covai/
      .claude-plugin/plugin.json           plugin name and version
      hooks/                               guard hook (guard.js)
      tools/                               md2docx.js (Word documents), tokens.js (token usage)
      skills/ifs-dev-task/                 the workflow
        profiles/                          one profile per customer, _template.md for new ones
        templates/                         technical document and specification templates
      skills/setup/                        /covai:setup
