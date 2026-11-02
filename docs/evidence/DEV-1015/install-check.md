# Install check (DEV-1015)

Raw command output from the real runs on 2026-11-02. Nothing edited except this heading.

## uv

```
uv 0.13.6 (Homebrew 2026-10-26 aarch64-apple-darwin)
```

## Install code-review-graph

```
$ uv tool install --python 3.12 code-review-graph==2.3.9
Downloading cpython-3.12.16-macos-aarch64-none (download) (23.9MiB)
 Downloaded cpython-3.12.16-macos-aarch64-none (download)
Resolved 74 packages in 1.63s
Downloading beartype (1.5MiB)
Downloading networkx (2.0MiB)
Downloading pydantic-core (2.0MiB)
Downloading pygments (1.2MiB)
Downloading cryptography (3.7MiB)
Downloading tree-sitter-language-pack (31.5MiB)
 Downloaded pygments
 Downloaded beartype
 Downloaded networkx
 Downloaded pydantic-core
 Downloaded cryptography
 Downloaded tree-sitter-language-pack
Prepared 74 packages in 25.63s
Installed 74 packages in 180ms
 + aiofile==3.12.3
 + annotated-types==0.8.0
 + anyio==4.16.0
 + attrs==26.1.0
 + authlib==1.9.2
 + beartype==0.23.1
 + cachetools==7.2.8
 + caio==0.12.10
 + certifi==2026.10.23
 + cffi==2.1.1
 + click==8.5.0
 + code-review-graph==2.3.9
 + cryptography==50.0.2
 + cyclopts==5.3.2
 + dnspython==2.9.1
 + docstring-parser==0.18.0
 + email-validator==2.3.0
 + exceptiongroup==1.3.1
 + fastmcp==3.4.11
 + fastmcp-slim==3.4.11
 + griffelib==2.4.1
 + h11==0.16.0
 + httpcore==1.0.9
 + httpx==0.28.1
 + httpx-sse==0.4.3
 + idna==3.20
 + jaraco-classes==3.4.0
 + jaraco-context==6.1.2
 + jaraco-functools==4.6.0
 + joserfc==1.7.7
 + jsonref==1.1.0
 + jsonschema==4.26.0
 + jsonschema-path==0.5.0
 + jsonschema-specifications==2025.9.1
 + keyring==25.7.0
 + markdown-it-py==4.2.0
 + mcp==1.30.0
 + mdurl==0.1.2
 + more-itertools==11.2.1
 + networkx==3.7
 + openapi-pydantic==0.6.0
 + opentelemetry-api==1.45.2
 + packaging==26.3
 + pathable==0.6.0
 + platformdirs==4.14.3
 + py-key-value-aio==0.4.6
 + pycparser==3.12
 + pydantic==2.14.2
 + pydantic-core==2.50.2
 + pydantic-settings==2.16.2
 + pygments==2.21.0
 + pyjwt==2.15.1
 + pyperclip==1.11.0
 + python-dotenv==1.2.4
 + python-multipart==0.0.33
 + pyyaml==6.0.3
 + referencing==0.37.0
 + rich==15.0.0
 + rich-rst==2.2.0
 + rpds-py==2026.9.1
 + sse-starlette==3.6.0
 + starlette==1.10.0
 + tree-sitter==0.26.0
 + tree-sitter-c-sharp==0.23.5
 + tree-sitter-embedded-template==0.25.0
 + tree-sitter-language-pack==0.13.0
 + tree-sitter-yaml==0.7.2
 + typing-extensions==4.16.0
 + typing-inspection==0.4.4
 + uncalled-for==0.4.1
 + uvicorn==0.54.0
 + watchdog==6.0.0
 + watchfiles==1.3.0
 + websockets==17.4
Installed 2 executables: code-review-graph, crg-daemon
warning: `/Users/ankitsingh/.local/bin` is not on your PATH. To use installed tools, run `export PATH="/Users/ankitsingh/.local/bin:$PATH"` or `uv tool update-shell`.
exit=0
```

## Install graphifyy

```
$ uv tool install --python 3.12 graphifyy==0.9.100
Resolved 31 packages in 574ms
Downloading numpy (5.2MiB)
Downloading rapidfuzz (1.2MiB)
Downloading graphifyy (1.7MiB)
 Downloaded rapidfuzz
 Downloaded graphifyy
 Downloaded numpy
Prepared 28 packages in 3.59s
Installed 31 packages in 51ms
 + graphifyy==0.9.100
 + networkx==3.7
 + numpy==2.5.4
 + pyyaml==6.0.3
 + rapidfuzz==3.14.6
 + tree-sitter==0.25.2
 + tree-sitter-bash==0.25.1
 + tree-sitter-c==0.24.2
 + tree-sitter-c-sharp==0.23.5
 + tree-sitter-cpp==0.23.4
 + tree-sitter-elixir==0.3.5
 + tree-sitter-fortran==0.6.0
 + tree-sitter-go==0.25.0
 + tree-sitter-groovy==0.1.2
 + tree-sitter-java==0.23.5
 + tree-sitter-javascript==0.25.0
 + tree-sitter-json==0.24.8
 + tree-sitter-julia==0.23.1
 + tree-sitter-kotlin==1.1.0
 + tree-sitter-lua==0.5.0
 + tree-sitter-objc==3.0.2
 + tree-sitter-php==0.24.1
 + tree-sitter-powershell==0.26.4
 + tree-sitter-python==0.25.0
 + tree-sitter-ruby==0.23.1
 + tree-sitter-rust==0.24.2
 + tree-sitter-scala==0.26.4
 + tree-sitter-swift==0.7.4
 + tree-sitter-typescript==0.23.2
 + tree-sitter-verilog==1.0.3
 + tree-sitter-zig==1.1.2
Installed 2 executables: graphify, graphify-mcp
warning: `/Users/ankitsingh/.local/bin` is not on your PATH. To use installed tools, run `export PATH="/Users/ankitsingh/.local/bin:$PATH"` or `uv tool update-shell`.
exit=0
```

## Interpreter and installed tools

```
$ uv python list --only-installed
cpython-3.12.16-macos-aarch64-none    /Users/ankitsingh/.local/share/uv/python/cpython-3.12-macos-aarch64-none/bin/python3.12
cpython-3.9.6-macos-aarch64-none      /usr/bin/python3
$ uv tool list --show-version-specifiers
code-review-graph v2.3.9 [required: ==2.3.9]
- code-review-graph
- crg-daemon
graphifyy v0.9.100 [required: ==0.9.100]
- graphify
- graphify-mcp
$ code-review-graph --version
code-review-graph 2.3.9
$ graphify --help | head -3
Usage: graphify <command>

Commands:

$ ~/.local/share/uv/tools/code-review-graph/bin/python --version
Python 3.12.16

$ ~/.local/share/uv/tools/graphifyy/bin/python --version
Python 3.12.16
```

## Registry check (PyPI via uv, exact pin must resolve)

```
$ uv pip install --dry-run --python 3.12 --no-deps code-review-graph==2.3.9
Using CPython 3.12.16
Resolved 1 package in 7ms
Would install 1 package
 + code-review-graph==2.3.9
$ uv pip install --dry-run --python 3.12 --no-deps graphifyy==0.9.100
Using CPython 3.12.16
Resolved 1 package in 0.74ms
Would install 1 package
 + graphifyy==0.9.100
```
