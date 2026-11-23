# Technical Document - <PREFIX>-<ID> <Title>

| Item | Value |
|---|---|
| Customer | <customer name> |
| Work item | <ID> - <title> (<type>) |
| IFS version | <ifs_version> |
| Branch | <branch> |
| Pull request | <PR number and link> |
| Developer | <developer_name> (developed by COVAI) |
| Date | <YYYY-MM-DD> |

## 1. Requirement
<What the business asked for, in 3-5 sentences. Source: spec / ticket content.>

## 2. Solution overview
<How it was solved, and why this approach.>

## 3. Objects changed
| Component | File | Change |
|---|---|---|
| <component> | <path> | <create / modify: what and why> |

## 4. Technical details
<Per object: methods overridden or added, logic, key code excerpts in code blocks.>

## 5. Database scripts and deployment
<.cdb / .ins files, deploy.ini lines, deployment order, or "None".>

## 6. Configuration
<Any configuration needed in the IFS client (events, permissions, lobbies...), or "None".>

## 7. Test steps
1. <step and expected result>

## 8. Special notes and risks
- <earlier work affected, code by others removed, assumptions, limitations>

## 9. Rollback
<How to undo the change.>
