---
description: Start working on GitHub Issue ###
---

# GitHub Issue Fix Flow

## Overview

Resolve a GitHub issue from intake through fix, validation, and commit using `gh-cli` skill, local edits, and git.

## Workflow

### 1) Intake and issue context

1. Get the full issue context.
2. Capture reproduction steps, expected behavior, and any maintainer notes.
3. Ask questions if something is unclear.

### 2) Implement the fix

1. Edit the minimal set of files.
2. Keep changes aligned with existing architecture and style.
3. Add tests when behavior changes and test coverage is practical.

### 3) Commit

1. Check for unrelated changes with `git status --short`.
2. Stage only the fix (exclude unrelated files).
3. Commit with a closing message: `Fix ... (closes #<issue>)`.

### 4) Report back

1. Summarize what changed and where.
2. Provide test results (including failures).
3. Note any follow-ups or blocked items.