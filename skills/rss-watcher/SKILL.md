---
name: rss-watcher
description: Monitor RSS and Atom feeds for new content. Fetch latest posts from blogs, news sites, or YouTube channels.
tools:
  - web_fetch
dependencies:
  - rss-parser
---

# RSS Watcher Skill

Monitor feeds and retrieve the latest updates from websites.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install rss-parser
    ```

## Usage

### Check Feed

Create a script to parse an RSS feed URL.

```javascript
/* check_feed.js */
const Parser = require('rss-parser');
const parser = new Parser();

async function checkFeed(url) {
    try {
        const feed = await parser.parseURL(url);
        console.log(`Feed: ${feed.title}`);
        
        // Show top 5 items
        feed.items.slice(0, 5).forEach(item => {
            console.log(`- [${item.pubDate}] ${item.title}`);
            console.log(`  Link: ${item.link}`);
            console.log('');
        });
    } catch (err) {
        console.error(`Error parsing feed: ${err.message}`);
    }
}

// Usage: node check_feed.js "https://news.ycombinator.com/rss"
const [,, url] = process.argv;
if (!url) {
    console.log('Please provide a feed URL');
    process.exit(1);
}
checkFeed(url);
```

### Common Feeds

-   **Hacker News**: `https://news.ycombinator.com/rss`
-   **New York Times**: `https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml`
-   **YouTube Channel**: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
-   **GitHub Releases**: `https://github.com/owner/repo/releases.atom`

## Automation Idea

You can use the **Cron Scheduler** (`cron_add`) to run this script periodically and check for new items compared to a stored "last seen" timestamp in your memory (`memory_store`).
