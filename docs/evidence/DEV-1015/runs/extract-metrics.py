#!/usr/bin/env python3
"""Extract per-run launcher metrics from a stream-json transcript.

usage: extract-metrics.py <run.jsonl> <run.wall> <out.json>
Writes launcher wall-clock seconds, tool-call counts, the distinct files passed to Read
and the ordered list of tool calls (name and input) found in the assistant events.
"""
import json
import sys

jsonl, wall, out = sys.argv[1:4]
calls = []
for line in open(jsonl):
    try:
        event = json.loads(line)
    except ValueError:
        continue
    if event.get("type") != "assistant":
        continue
    for block in event["message"]["content"]:
        if block.get("type") == "tool_use":
            calls.append({"name": block["name"], "input": block["input"]})
counts = {}
for call in calls:
    counts[call["name"]] = counts.get(call["name"], 0) + 1
reads = sorted({c["input"].get("file_path") for c in calls if c["name"] == "Read"})
json.dump(
    {
        "wall_clock_seconds": float(open(wall).read()),
        "tool_call_counts": counts,
        "files_read": reads,
        "tool_calls": calls,
    },
    open(out, "w"),
    indent=2,
)
