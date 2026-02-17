---
name: google-search
description: Enhanced web search using Google Custom Search API or SerpAPI for high-quality results.
version: "1.0"
author: Sumat
tools:
  - web_search
  - web_fetch
---

# Google Search Skill

Use this skill for high-quality web searches when the user needs current information, research, or fact-checking.

## Setup

You can use two search backends:

### Option A: Google Custom Search (free tier: 100 queries/day)
1. Go to https://programmablesearchengine.google.com/ and create a search engine
2. Get your API key from https://console.cloud.google.com/
3. Set environment variables:
   - `GOOGLE_SEARCH_API_KEY` — your API key
   - `GOOGLE_SEARCH_ENGINE_ID` — your search engine ID (cx)

### Option B: SerpAPI (100 free searches/month)
1. Sign up at https://serpapi.com/
2. Set `SERPAPI_KEY` in your environment

### Option C: DuckDuckGo (no API key, built-in)
The `web_search` tool uses DuckDuckGo by default with no setup required.

## Usage

When the user asks you to search for something:

1. Use the `web_search` tool with a clear, targeted query
2. If results are insufficient, refine the query and search again
3. For deep research, use `web_fetch` to read the top results in full
4. Summarize findings with source citations

## Query Tips

- Use specific, descriptive queries (avoid single-word searches)
- For recent events, include the year or "latest" / "2026"
- For technical topics, include the technology name and version
- For comparisons, use "vs" or "compared to"
- Combine multiple searches to triangulate information

## Example Patterns

**Fact-checking**: Search → Read sources → Cross-reference → Report findings
**Research**: Broad search → Narrow with specific queries → Read top 3 articles → Synthesize
**Current events**: Search with date context → Read multiple sources → Summarize
