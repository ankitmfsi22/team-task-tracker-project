# DEV-1001 task 3.3: pre-commit enforcement evidence

Verified on 2026-10-31 on Windows 11 with Node 22.23.3, pnpm 12.11.2, Husky 9.1.7 and lint-staged 17.6.0.
Each shell ran in its own throwaway git repo created outside this repository (the repo's `node_modules` was
junctioned in, and the hook files and ESLint/Prettier config were copied from the repo). No commit was made on
the project branch by this check.

Result: in both shells a staged file with a lint error (`any`) and a staged unformatted file each abort
`git commit` (exit 1, no commit created), and a clean staged file commits (exit 0).

## Git Bash

```text
$ node setup-temp-repo.mjs <repo> <tmp>/precommit-gitbash
hooksPath = .husky/_

$ printf "export const y: number = 2;\n" > good.ts; git add good.ts; git commit -m "feat: clean file"
✔ prettier --check

✔ Done running tasks for staged files!
⋯ Staging changes from tasks…
✔ Done staging changes from tasks!
[main (root-commit) c6fe8d0] feat: clean file
 1 file changed, 1 insertion(+)
 create mode 100644 good.ts
exit=0

$ printf "export const x: any = 1;\n" > bad.ts; git add bad.ts; git commit -m "feat: lint error"
⋯ Cleaning up temporary files…
✔ Done cleaning up temporary files!

✖ eslint --max-warnings 0:

C:\Users\kkomt\AppData\Local\Temp\tmp.3diqNSXMLV\precommit-gitbash\bad.ts
  1:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)
husky - pre-commit script failed (code 1)
exit=1

$ printf "export const z   =   3\n" > ugly.ts; git add ugly.ts; git commit -m "feat: unformatted"
⋯ Cleaning up temporary files…
✔ Done cleaning up temporary files!

✖ prettier --check:
Checking formatting...
[warn] ugly.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
husky - pre-commit script failed (code 1)
exit=1

$ git log --oneline   # only the clean commit exists
c6fe8d0 feat: clean file
$ git status --short
?? .gitattributes
?? .husky/
?? .prettierrc
?? eslint.config.js
?? package.json
?? pnpm-lock.yaml
```

## PowerShell

```text
$ node setup-temp-repo.mjs <repo> <tmp>/precommit-ps
hooksPath = .husky/_

$ <write good.ts>; git add good.ts; git commit -m 'feat: clean file'
✔ prettier --check
✔ Done running tasks for staged files!
⋯ Staging changes from tasks…
✔ Done staging changes from tasks!
[main (root-commit) 59782ec] feat: clean file
 1 file changed, 1 insertion(+)
 create mode 100644 good.ts
exit=0

$ <write bad.ts>; git add bad.ts; git commit -m 'feat: lint error'
✖ eslint --max-warnings 0:
C:\Users\kkomt\AppData\Local\Temp\precommit-ps-17e52aa4\bad.ts
  1:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
✖ 1 problem (1 error, 0 warnings)
husky - pre-commit script failed (code 1)
exit=1

$ <write ugly.ts>; git add ugly.ts; git commit -m 'feat: unformatted'
⋯ Cleaning up temporary files…
✔ Done cleaning up temporary files!
✖ prettier --check:
Checking formatting...
[warn] ugly.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
husky - pre-commit script failed (code 1)
exit=1

$ git log --oneline   # only the clean commit exists
59782ec feat: clean file
$ git status --short
?? .gitattributes
?? .husky/
?? .prettierrc
?? eslint.config.js
?? package.json
?? pnpm-lock.yaml
```
