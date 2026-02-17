---
name: screenshot-vision
description: Capture screenshots of web pages or the desktop and analyze them with vision-capable LLMs.
version: "1.0"
author: Sumat
tools:
  - browser_action
  - read_file
---

# Screenshot & Vision Analysis Skill

Capture screenshots of web pages and analyze their visual content using vision-capable LLM models (GPT-4o, Claude, Gemini).

## Capabilities

1. **Web page screenshots** — Navigate to a URL and capture a screenshot
2. **Visual analysis** — Send screenshots to a vision-capable LLM for analysis
3. **UI verification** — Check if a web page looks correct
4. **Content extraction** — Extract text from images via OCR-like vision analysis

## Taking Screenshots

Use the `browser_action` tool:

### Navigate + Screenshot
```json
{"action": "navigate", "url": "https://example.com"}
{"action": "screenshot"}
```

Screenshots are saved to `~/.sumat/workspace/state/screenshot_<timestamp>.png`.

### Full Workflow
1. Navigate to the target URL with `browser_action` (action: navigate)
2. Wait for the page to load
3. Take a screenshot with `browser_action` (action: screenshot)
4. Read the screenshot file with `read_file` to get the image data
5. Describe what you see or analyze the visual content

## Vision Analysis

When analyzing a screenshot:

1. Describe the overall page layout
2. Identify key UI components (navigation, forms, buttons, content areas)
3. Check for visual issues:
   - Broken layouts or overlapping elements
   - Missing images or icons
   - Color contrast problems
   - Responsive design issues
4. Extract any visible text

## Use Cases

### Web Monitoring
- Check if a website is visually correct after deployment
- Monitor competitor websites for changes
- Verify landing page designs

### UI Testing
- Capture before/after screenshots for design changes
- Verify responsive layouts at different viewports
- Check for broken CSS or layout issues

### Content Extraction
- Extract text from image-heavy pages
- Read text from charts or infographics
- Parse visual data tables

## Tips

- The browser runs headless by default (no GUI window)
- Screenshots are viewport-sized by default (not full page)
- For debugging, set `automation.browser.headless = false` in config
- Clean up old screenshots periodically from the `state/` directory
