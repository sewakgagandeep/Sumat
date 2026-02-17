---
name: github
description: Manage GitHub repositories, issues, PRs, and branches via the GitHub REST API.
version: "1.0"
author: Sumat
tools:
  - web_fetch
  - bash
---

# GitHub Integration Skill

Interact with GitHub repositories using the GitHub REST API. Requires a Personal Access Token (PAT).

## Setup

1. Create a Personal Access Token at https://github.com/settings/tokens
   - Select scopes: `repo`, `read:org`, `read:user`
2. Set environment variable: `GITHUB_TOKEN`

## API Base

All requests go to `https://api.github.com` with headers:
```
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

Use `web_fetch` or `bash` with `curl` for API calls.

## Available Operations

### Repositories
- **List repos**: `GET /user/repos?sort=updated&per_page=10`
- **Get repo info**: `GET /repos/{owner}/{repo}`
- **List branches**: `GET /repos/{owner}/{repo}/branches`
- **Get README**: `GET /repos/{owner}/{repo}/readme`

### Issues
- **List issues**: `GET /repos/{owner}/{repo}/issues?state=open`
- **Create issue**: `POST /repos/{owner}/{repo}/issues` with `{"title": "...", "body": "..."}`
- **Close issue**: `PATCH /repos/{owner}/{repo}/issues/{number}` with `{"state": "closed"}`
- **Add comment**: `POST /repos/{owner}/{repo}/issues/{number}/comments` with `{"body": "..."}`

### Pull Requests
- **List PRs**: `GET /repos/{owner}/{repo}/pulls?state=open`
- **Get PR details**: `GET /repos/{owner}/{repo}/pulls/{number}`
- **Get PR diff**: `GET /repos/{owner}/{repo}/pulls/{number}` with `Accept: application/vnd.github.diff`
- **Create PR**: `POST /repos/{owner}/{repo}/pulls` with `{"title": "...", "head": "branch", "base": "main"}`
- **Merge PR**: `PUT /repos/{owner}/{repo}/pulls/{number}/merge`

### Search
- **Search code**: `GET /search/code?q={query}+repo:{owner}/{repo}`
- **Search issues**: `GET /search/issues?q={query}+repo:{owner}/{repo}`

### Actions / Workflows
- **List runs**: `GET /repos/{owner}/{repo}/actions/runs`
- **Re-run workflow**: `POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun`

## Workflow Patterns

### PR Review
1. List open PRs
2. Get PR diff
3. Analyze code changes
4. Post review comments

### Issue Triage
1. List open issues
2. Categorize by labels
3. Assign priority
4. Suggest resolution

### Release Notes
1. Get commits since last tag
2. Categorize changes (features, fixes, docs)
3. Generate formatted release notes

## Tips

- Use `bash` with `curl` for POST/PUT/PATCH operations that need request bodies
- Always check for API rate limits (5000 requests/hour for authenticated users)
- For large diffs, use the Files API: `GET /repos/{owner}/{repo}/pulls/{number}/files`
