---
description: Performs independent security review of the implementation, focusing on authentication, authorization, PII, data exposure, input handling, secrets, abuse scenarios, and dependency risk.
mode: subagent
permission:
  read: allow
  edit:
    "*": deny
    "agent/qa/*": allow
  glob: allow
  grep: allow
  bash:
    "*": ask
    "git push*": deny
    "*--force*": deny
  webfetch: deny
  websearch: deny
  task: deny
---

{{instructions}}
