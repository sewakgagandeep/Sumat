---
name: pdf-tools
description: Manipulate PDF documents. Merge multiple PDFs, split pages, extract text content, and fill forms.
tools:
  - bash
  - read_file
  - write_file
dependencies:
  - pdf-lib
  - pdf-parse
---

# PDF Tools Skill

Work with PDF documents programmatically.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install pdf-lib pdf-parse
    ```

## Usage

### 1. Extract Text from PDF

Read the text content of a PDF file.

```javascript
/* read_pdf.js */
const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync(process.argv[2]);

pdf(dataBuffer).then(function(data) {
    console.log(`Number of pages: ${data.numpages}`);
    console.log(`Info: ${JSON.stringify(data.info)}`);
    console.log(`\n--- Content ---\n`);
    console.log(data.text);
});

// Usage: node read_pdf.js document.pdf
```

### 2. Merge PDFs

Combine multiple PDF files into one.

```javascript
/* merge_pdfs.js */
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function mergePdfs(files, outputFile) {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const buffer = fs.readFileSync(file);
        const pdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfFile = await mergedPdf.save();
    fs.writeFileSync(outputFile, mergedPdfFile);
    console.log(`Merged ${files.length} files into ${outputFile}`);
}

// Usage: node merge_pdfs.js output.pdf input1.pdf input2.pdf
const [,, output, ...inputs] = process.argv;
mergePdfs(inputs, output).catch(console.error);
```
