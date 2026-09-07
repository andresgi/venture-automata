---
description: Implements approved engineering stories for this project's V1.
mode: subagent
permission:
  read: allow
  edit: allow
  glob: allow
  grep: allow
  bash:
    "git push --force*": deny
    "git push -f*": deny
    "git push origin --force*": deny
    "git push origin -f*": deny
    "*--force*": deny
    "*": allow
  webfetch: ask
  websearch: ask
  task: deny
---

{{instructions}}
