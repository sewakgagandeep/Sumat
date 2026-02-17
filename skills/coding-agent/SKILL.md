---
name: coding-agent
description: Orchestrates complex coding tasks. Can read files, plan changes, edit code, run tests, and debug errors in a loop.
tools:
  - bash
  - read_file
  - write_file
  - list_dir
  - spawn_sub_agent
dependencies: []
---

# Coding Agent Skill

Delegate complex coding tasks to a specialized sub-agent loop.

## Usage

### 1. Plan and Execute

When asked to "implement feature X" or "refactor module Y":

1.  **Analyze Context**: Use `list_dir` and `read_file` to understand the codebase.
2.  **Formulate Plan**: Create a `plan.md` or similar if the task is large.
3.  **Spawn Sub-Agent**: Use `spawn_sub_agent` to handle the implementation execution to avoid blocking the main agent loop.

```javascript
/* Example: Spawning a coding sub-agent */
// This logic is internal to the agent's reasoning, but here is the pattern:

const taskDescription = `
You are a senior software engineer.
Task: ${userRequest}
Context: The project is in ${workspacePath}.
Goal: Implement the requested feature, adhering to existing patterns.
Process:
1. Read relevant files.
2. Create/Modify files.
3. Verify by running build/tests (if available).
4. Report completion.
`;

await tools.spawn_sub_agent({ task: taskDescription });
```

### 2. File Operations

-   **Read**: `read_file(path)`
-   **Write**: `write_file(path, content)`
-   **List**: `list_dir(path)`

### 3. Verification

Always verify changes:
-   `bash("npm test")`
-   `bash("npm run build")`

## Best Practices

-   **Atomic Changes**: Make small, verifiable changes.
-   **Error Handling**: If a build fails, read the error log and fix it.
-   **Cleanup**: Remove temporary files after use.
