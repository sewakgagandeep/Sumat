---
name: skill-creator
description: Meta-skill for creating new Sumat skills on demand. Teaches the agent how to author SKILL.md files.
version: "1.0"
author: Sumat
tools:
  - write_file
  - read_file
  - list_dir
---

# Skill Creator (Meta-Skill)

You can create new skills on demand. This skill teaches you how to author proper `SKILL.md` files that will be auto-discovered by Sumat's skill loader.

## Skill Structure

Each skill lives in its own directory under `skills/` (bundled) or `~/.sumat/workspace/skills/` (user-created):

```
skills/
└── my-skill/
    ├── SKILL.md          # Required — skill definition
    ├── scripts/          # Optional — helper scripts
    │   └── helper.sh
    └── resources/        # Optional — data files, templates
        └── template.txt
```

## SKILL.md Format

Every SKILL.md uses YAML frontmatter + markdown body:

```markdown
---
name: my-skill-name
description: One-line description of what this skill does.
version: "1.0"
author: Sumat
tools:
  - bash
  - web_fetch
dependencies:
  - some-other-skill
---

# Skill Title

Detailed instructions for the agent on how to use this skill.

## Setup
[Any API keys, dependencies, or configuration needed]

## Usage
[Step-by-step instructions on how to accomplish the skill's tasks]

## Examples
[Concrete examples of inputs and expected outputs]

## Tips
[Best practices and edge cases]
```

## Required Fields

- `name` — unique identifier (lowercase, hyphenated)
- `description` — one-line summary for skill discovery

## Optional Fields

- `version` — semver string
- `author` — who made it
- `tools` — list of tools this skill uses (helps the agent know what capabilities it needs)
- `dependencies` — other skills this one depends on

## Creating a New Skill

When the user asks you to create a skill:

1. Ask for the skill's purpose and any required APIs/services
2. Choose a clear, descriptive `name` (lowercase, hyphenated)
3. Write the SKILL.md with comprehensive instructions
4. Save to `~/.sumat/workspace/skills/{name}/SKILL.md`
5. Verify it loads with: list the skills directory

## Best Practices

- **Be specific** — Don't just say "use the API", show exact URLs and parameters
- **Include examples** — Show input/output pairs
- **Document setup** — List every env var and configuration step
- **Handle errors** — Describe what to do when things fail
- **Keep it modular** — Each skill should do one thing well
