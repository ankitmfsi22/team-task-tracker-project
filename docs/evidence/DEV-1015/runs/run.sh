#!/bin/zsh
# usage: run.sh <name> <mcp-config> <tools> <prompt-file>
cd /Users/ankitsingh/team-task-tracker-project
S=/private/tmp/claude-501/-Users-ankitsingh-team-task-tracker-project/642feea8-8c3e-4922-a27d-8c002036d418/scratchpad/runs
start=$(python3 -c 'import time;print(time.time())')
claude -p "$(cat $S/$4)" --output-format stream-json --verbose --strict-mcp-config --mcp-config $S/$2 \
  --allowedTools "$3" --permission-mode dontAsk --no-session-persistence > $S/$1.jsonl 2> $S/$1.err
end=$(python3 -c 'import time;print(time.time())')
python3 -c "print($end-$start)" > $S/$1.wall
