---
name: pr-review
description: Automated Pull Request review workflow. Fetches PR diffs, analyzes code changes, and posts review comments.
tools:
  - bash
  - read_file
dependencies: []
---

# PR Review Skill

Automate code reviews for GitHub Pull Requests.

## Prerequisites

-   **GitHub Skill**: Must be installed and configured with `GITHUB_TOKEN`.
-   **Coding Agent Skill**: Useful for deep analysis of changes.

## Workflow

1.  **Fetch PR Details**:
    Use the `github` skill to get PR information.
    ```bash
    # Example using curl (or use a script)
    curl -H "Authorization: token $GITHUB_TOKEN" \
         https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER
    ```

2.  **Get Diff**:
    fetch the PR diff to see what changed.
    ```bash
    curl -H "Authorization: token $GITHUB_TOKEN" \
         -H "Accept: application/vnd.github.v3.diff" \
         https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER
    ```

3.  **Analyze**:
    The agent analyzes the diff for:
    -   Bugs / Logic errors
    -   Security vulnerabilities
    -   Style violations
    -   Performance issues

4.  **Post Review**:
    Post a comment on the PR with findings.
    ```javascript
    /* post_review.js */
    const axios = require('axios');
    // ... logic to post review comment via GitHub API ...
    ```

## Usage

"Review PR #42 in owner/repo."

The agent will:
1.  Fetch the diff.
2.  Analyze it.
3.  Summarize findings.
4.  (Optional) Post the review to GitHub if confirmed.
