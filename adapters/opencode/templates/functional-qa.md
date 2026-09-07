---
description: Independently validates implemented features against PRD requirements, UX specifications, engineering story acceptance criteria, and relevant regression behavior.
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
