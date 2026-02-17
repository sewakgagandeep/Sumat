---
name: url-summarizer
description: Summarize web articles, YouTube videos, podcasts, and any URL content.
version: "1.0"
author: Sumat
tools:
  - web_fetch
---

# URL / Content Summarizer Skill

Use this skill when the user wants to summarize or extract key information from URLs, articles, videos, or podcasts.

## Capabilities

1. **Web articles** — Fetch and summarize any article or blog post
2. **YouTube videos** — Extract transcripts via YouTube's transcript API
3. **Podcasts** — Parse RSS feeds to find and summarize episode descriptions
4. **PDF documents** — Fetch and extract text from PDFs
5. **General URLs** — Any readable web page

## How to Summarize

### Web Articles
1. Use `web_fetch` to get the page content
2. Analyze the text for the main thesis, key points, and conclusions
3. Return a structured summary:
   - **Title**: The article title
   - **Source**: Domain and author if available
   - **Summary**: 2-3 paragraph overview
   - **Key Points**: Bullet list of main takeaways
   - **Notable Quotes**: Any standout quotes (if relevant)

### YouTube Videos
1. Use `web_fetch` on `https://www.youtube.com/watch?v=VIDEO_ID`
2. Extract the video title and description from the HTML
3. For transcripts, try fetching: `https://www.youtube.com/api/timedtext?v=VIDEO_ID&lang=en`
4. If transcript is available, summarize it
5. If not, summarize based on title, description, and comments

### Podcast Episodes
1. Use `web_fetch` on the podcast RSS feed URL
2. Parse the XML to find episode titles, descriptions, and dates
3. Summarize the requested episode(s)

### Multiple URLs
When given multiple URLs, summarize each individually, then provide a cross-comparison highlighting common themes and differences.

## Output Format

```
## Summary: [Title]
**Source**: [URL]
**Date**: [if available]

### Overview
[2-3 paragraph summary]

### Key Points
- Point 1
- Point 2
- Point 3

### Takeaways
[What the reader should remember]
```

## Tips

- Always credit the source
- Flag if the content seems opinion vs. fact
- Mention if content was truncated or incomplete
- For long content, offer both a brief and detailed summary
