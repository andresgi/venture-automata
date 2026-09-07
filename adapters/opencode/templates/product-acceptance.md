---
description: Independently verifies the completed V1 against the approved PRD, V1 scope, user journeys, exclusions, and requirement traceability before release.
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
