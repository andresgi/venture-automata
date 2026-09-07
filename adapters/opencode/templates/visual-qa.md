---
description: Reviews implemented user-facing product journeys for responsive behavior, visual regressions, hierarchy, state completeness, usability, and consistency with UX specifications.
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
