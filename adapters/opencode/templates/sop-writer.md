---
description: Converts this project's actual V1 operational workflows into executable SOPs for humans operating the product.
mode: subagent

permission:
  read: allow
  edit:
    "*": deny
    "operations/*": allow
  glob: allow
  grep: allow
  bash:
    "git push --force*": deny
    "git push -f*": deny
    "git push origin --force*": deny
    "git push origin -f*": deny
    "*--force*": deny
    "*": allow
---

{{instructions}}
