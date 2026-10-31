# DEV-1001 task 6.1: quality gates from a fresh checkout

Date: 2026-10-31
Commit: 86c0ae998b1fc413e8d07cb1fb6a6cfde2394081

A fresh `git clone` of the commit above (no `node_modules`) was installed with the lockfile frozen, then each gate was run.
Environment: Windows 11, Node v22.23.3, pnpm 12.11.2, Docker 29.8.0.

## pnpm install --frozen-lockfile

```text
Scope: all 4 workspace projects
✓ Lockfile passes supply-chain policies (verified 30m ago)
Lockfile is up to date, resolution step is skipped
Packages are hard linked from the content-addressable store to the virtual store.
  Content-addressable store is at: C:\Users\kkomt\AppData\Local\pnpm\store\v11
  Virtual store is at:             node_modules/.pnpm
Packages: +301
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
. prepare$ husky
. prepare: Done

devDependencies:
+ @fission-ai/openspec 1.16.0
+ eslint 10.14.0
+ husky 9.1.7
+ lint-staged 17.6.0
+ prettier 3.9.10
+ typescript-eslint 8.72.1

Done in 4m 1s using pnpm v12.11.2
exit=0
```

## pnpm build

```text
$ pnpm -r run build
Scope: 3 of 4 workspace projects
frontend build$ tsc -p tsconfig.build.json
packages/shared build$ tsc -p tsconfig.build.json
backend build$ tsc -p tsconfig.build.json
frontend build: Done
backend build: Done
packages/shared build: Done
exit=0
```

## pnpm lint

```text
$ eslint . && node scripts/check-pinning.mjs
Pinning check passed.
exit=0
```

## pnpm typecheck

```text
$ pnpm -r run typecheck
Scope: 3 of 4 workspace projects
packages/shared typecheck$ tsc -p tsconfig.json --noEmit
frontend typecheck$ tsc -p tsconfig.json --noEmit
backend typecheck$ tsc -p tsconfig.json --noEmit
frontend typecheck: Done
packages/shared typecheck: Done
backend typecheck: Done
exit=0
```

## pnpm test

```text
packages/shared test:
frontend test:
frontend test:  RUN  v5.0.5 C:/Users/kkomt/AppData/Local/Temp/ttt-fresh/frontend
frontend test:
packages/shared test:
packages/shared test:  Test Files  1 passed (1)
packages/shared test:       Tests  1 passed (1)
packages/shared test:    Start at  17:49:32
packages/shared test:    Duration  746ms (import 78%, transform 16%, worker 3%, tests 2%)
backend test:
backend test:  Test Files  1 passed (1)
backend test:       Tests  1 passed (1)
backend test:    Start at  17:49:32
packages/shared test:
backend test:    Duration  753ms (import 78%, transform 17%, worker 3%, tests 2%)
backend test:
frontend test:
frontend test:  Test Files  1 passed (1)
frontend test:       Tests  1 passed (1)
frontend test:    Start at  17:49:32
frontend test:    Duration  733ms (import 78%, transform 17%, worker 2%, tests 2%)
frontend test:
packages/shared test: Done
backend test: Done
frontend test: Done
exit=0
```

## pnpm format:check

```text
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
exit=0
```
