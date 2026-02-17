---
name: secrets-manager
description: Securely retrieve secrets from 1Password or other secret managers via CLI. Avoids hardcoding credentials in scripts.
tools:
  - bash
dependencies: []
---

# Secrets Manager Skill

Access secrets securely without storing them in files.

## Setup

1.  **Install CLI**: 
    -   1Password: Install `op` CLI.
    -   Bitwarden: Install `bw` CLI.
2.  **Authenticate**: Make sure the CLI is authenticated in the environment where the agent runs (e.g., set `OP_SERVICE_ACCOUNT_TOKEN`).

## Usage

### 1Password Retrieval

Retrieve a secret by reference.

```javascript
/* get_secret.js */
const { execSync } = require('child_process');

function getSecret(reference) {
    try {
        // op read "op://vault/item/field"
        const secret = execSync(`op read "${reference}"`, { encoding: 'utf-8' }).trim();
        return secret;
    } catch (err) {
        console.error('Failed to retrieve secret:', err.message);
        return null;
    }
}

// Usage: Get database password
// const dbPass = getSecret("op://Dev/Database/password");
```

### Environment Injection

You can use this pattern to inject secrets into other scripts at runtime:

```bash
export DB_PASS=$(op read "op://Dev/Database/password")
node my_script.js
```

## Security Note

-   Use **Service Accounts** for the agent to limit access scope.
-   Never print secrets to the console logs.
-   Only retrieve secrets when needed.
