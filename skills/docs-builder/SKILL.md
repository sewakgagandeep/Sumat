---
name: docs-builder
description: Generate static documentation websites from Markdown files. Useful for creating project documentation, wikis, or knowledge bases.
tools:
  - bash
  - write_file
  - list_dir
dependencies:
  - marked
---

# Docs Builder Skill

Turn a folder of Markdown files into a static HTML website.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install marked
    ```

## Usage

### Build Site

Recursively finding `.md` files in a source folder and converting them to `.html`.

```javascript
/* build_docs.js */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const srcDir = process.argv[2] || 'docs';
const outDir = process.argv[3] || 'site';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function build(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            build(fullPath);
        } else if (path.extname(file) === '.md') {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const html = marked.parse(content);
            const relativePath = path.relative(srcDir, fullPath);
            const outPath = path.join(outDir, relativePath.replace('.md', '.html'));
            
            ensureDir(path.dirname(outPath));
            
            const page = `
<!DOCTYPE html>
<html>
<head><title>${file}</title><link rel="stylesheet" href="style.css"></head>
<body>
    <main>${html}</main>
</body>
</html>`;
            
            fs.writeFileSync(outPath, page);
            console.log(`Built: ${outPath}`);
        }
    }
}

console.log(`Building docs from ${srcDir} to ${outDir}...`);
ensureDir(outDir);
build(srcDir);
```

### Style

Create a `style.css` in the output folder to make it look nice. The agent can generate this using its design capabilities.
