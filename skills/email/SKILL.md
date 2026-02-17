---
name: email
description: Send and read emails using SMTP and IMAP protocols. Supports sending plain text or HTML emails with attachments, and searching/reading inbox messages.
tools:
  - bash
  - read_file
dependencies:
  - nodemailer
  - imap-simple
---

# Email Skill

Enable the agent to send and receive emails.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install nodemailer imap-simple @types/nodemailer @types/imap-simple
    ```

2.  **Configure Environment Variables**:
    Add the following to your `.env` file:
    ```env
    EMAIL_USER=your_email@example.com
    EMAIL_PASS=your_app_password
    EMAIL_SMTP_HOST=smtp.gmail.com
    EMAIL_SMTP_PORT=587
    EMAIL_IMAP_HOST=imap.gmail.com
    EMAIL_IMAP_PORT=993
    ```

    *Note: For Gmail, use an [App Password](https://myaccount.google.com/apppasswords).*

## Usage

### 1. Send an Email

Create a script to send an email using `nodemailer`.

```javascript
/* send_email.js */
const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST,
        port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    });

    console.log('Message sent: %s', info.messageId);
}

// Usage: node send_email.js "recipient@example.com" "Hello" "This is a test."
const [,, to, subject, text] = process.argv;
sendEmail(to, subject, text).catch(console.error);
```

### 2. Read Recent Emails

Create a script to fetch recent emails using `imap-simple`.

```javascript
/* read_emails.js */
const imaps = require('imap-simple');

const config = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: process.env.EMAIL_IMAP_HOST,
        port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
        tls: true,
        authTimeout: 3000,
    },
};

async function readEmails() {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: false,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    console.log(`Found ${messages.length} unseen messages.`);

    for (const message of messages) {
        const subject = message.parts.find(p => p.which === 'HEADER').body.subject[0];
        const from = message.parts.find(p => p.which === 'HEADER').body.from[0];
        console.log(`- From: ${from}`);
        console.log(`  Subject: ${subject}`);
    }

    connection.end();
}

readEmails().catch(console.error);
```

## Capabilities

-   **Send Email**: Compose and send emails to one or multiple recipients.
-   **Check Inbox**: List unread messages or search for specific emails.
-   **Analyze Content**: Read email bodies and summarize contents (using agent capabilities).
-   **Attachments**: (Advanced) Handle file attachments if needed by extending the scripts.
