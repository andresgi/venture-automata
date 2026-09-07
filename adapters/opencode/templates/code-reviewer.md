---
description: Independently reviews implemented code for correctness, maintainability, security, and requirement coverage before QA.
mode: subagent
permission:
  read: allow
  edit:
    "*": deny
    "agent/reviews/*": allow
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
