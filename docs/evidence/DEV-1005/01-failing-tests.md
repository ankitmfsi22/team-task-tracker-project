# DEV-1005 failing tests (before implementation)

Command: `node --test scripts/tests/change-completeness.test.mjs`

Result: fails for the right reason, `scripts/check-changes.mjs` does not exist yet, so the
import of `checkChanges` cannot resolve.

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/check-changes.mjs'
  imported from .../scripts/tests/change-completeness.test.mjs
not ok 1 - scripts\tests\change-completeness.test.mjs
# tests 1
# pass 0
# fail 1
```

Scenarios covered (5 tests): complete archive passes; missing design.md; Gate 2 empty;
Gate 2 Changes requested; review-log row with status Open.
