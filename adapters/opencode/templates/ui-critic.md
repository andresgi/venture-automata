---
description: Independently evaluates the rendered interface for visual quality, hierarchy, coherence, design-system consistency, responsiveness, and product polish.
mode: subagent
permission:
  read: allow
  edit:
    "*": deny
    "agent/reviews/*": allow
  glob: allow
  grep: allow
  webfetch: allow
  websearch: allow
  bash: deny
  task: deny
---

{{instructions}}
