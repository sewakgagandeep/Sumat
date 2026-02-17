---
name: google-workspace
description: Integration with Google Workspace (Gmail, Calendar, Drive, Docs, Sheets). Read/Send emails, manage calendar events, and manipulate files.
tools:
  - bash
  - read_file
dependencies:
  - googleapis
  - google-auth-library
---

# Google Workspace Skill

Manage your Google life directly from the agent.

## Setup

1.  **GCP Project**: Create a project in Google Cloud Console.
2.  **Enable APIs**: Enable Gmail API, Google Calendar API, Google Drive API, Google Docs API, Google Sheets API.
3.  **Credentials**: Create a **Service Account** or **OAuth 2.0 Client ID**.
    -   *Service Account*: Download JSON key, save as `google-service-account.json`. Share calendars/docs with the service account email.
    -   *OAuth2*: Requires a token handling flow (advanced). Service Account is easier for personal bots.
4.  **Install**: `npm install googleapis google-auth-library`

## Usage Examples

### 1. List Calendar Events

```javascript
/* list_events.js */
const { google } = require('googleapis');
const path = require('path');

const KEY_PATH = path.join(process.cwd(), 'google-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

async function listEvents() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_PATH,
        scopes: SCOPES,
    });

    const calendar = google.calendar({ version: 'v3', auth });
    
    // 'primary' works if using OAuth. For Service Account, use the shared calendar ID (e.g., your email).
    const calendarId = process.argv[2] || 'primary'; 

    const res = await calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });

    const events = res.data.items;
    if (!events || events.length === 0) {
        console.log('No upcoming events found.');
        return;
    }

    console.log('Upcoming events:');
    events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
    });
}
// Usage: node listEvents.js "your-email@gmail.com"
listEvents().catch(console.error);
```

### 2. Read Emails (Gmail)

*Note: Service Accounts need Domain-Wide Delegation to impersonate users for Gmail. Personal Gmail accounts must use OAuth2 or App Passwords (via IMAP skill).*

For personal Gmail, **use the `email` skill instead** (SMTP/IMAP). This skill is best for Calendar, Drive, and Docs.

### 3. Read Google Doc

```javascript
/* read_doc.js */
// ... auth setup ...
const docs = google.docs({ version: 'v1', auth });
const docId = 'YOUR_DOC_ID';
const res = await docs.documents.get({ documentId: docId });
console.log(res.data.body.content); // simplified
```

## Capabilities available via scripts:
-   **Calendar**: List, create, delete events.
-   **Drive**: List, upload, download files.
-   **Docs**: Read, create documents.
-   **Sheets**: Read/Write spreadsheet data.
