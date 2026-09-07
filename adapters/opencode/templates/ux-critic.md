---
description: Independently evaluates user journeys, screen specifications, usability, completeness, responsive behavior, and consistency with the approved PRD.
mode: subagent
permission:
  read: allow
  glob: allow
  grep: allow
  edit:
    "*": deny
    "agent/reviews/*": allow
  bash: deny
---

{{instructions}}
