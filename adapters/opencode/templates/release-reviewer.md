---
description: Performs the final independent release-readiness review of this project's V1 and prepares the human Release Gate package.
mode: subagent

permission:
  read: allow
  edit:
    "*": deny
    "agent/gates/*": allow
  glob: allow
  grep: allow
  bash:
    "*": ask
    "git push*": deny
    "*--force*": deny
---

{{instructions}}
