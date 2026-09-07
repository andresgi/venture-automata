---
description: Defines the visual design system and high-quality interface specifications for approved UX flows. Responsible for typography, spacing, hierarchy, component language, responsive visual behavior, and product-level polish.
mode: subagent
permission:
  read: allow
  glob: allow
  grep: allow
  edit: allow
  bash:
    "git push --force*": deny
    "git push -f*": deny
    "git push origin --force*": deny
    "git push origin -f*": deny
    "*--force*": deny
    "*": allow
---

{{instructions}}
