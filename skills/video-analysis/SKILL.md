---
name: video-analysis
description: Extract frames from video files or RTSP streams, and analyze them using vision models.
tools:
  - bash
  - spawn_sub_agent
dependencies:
  - fluent-ffmpeg
---

# Video Analysis Skill

Process video files and security camera streams.

## Setup

1.  **Install FFmpeg**: Must be installed on the system (`apt install ffmpeg`, `brew install ffmpeg`, or download windows bin).
2.  **Dependencies**: `npm install fluent-ffmpeg`

## Usage

### 1. Extract Frames

Extract a frame every N seconds from a video file.

```javascript
/* extract_frames.js */
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const videoPath = process.argv[2];
const outputDir = 'frames';

if (!require('fs').existsSync(outputDir)) require('fs').mkdirSync(outputDir);

ffmpeg(videoPath)
    .on('end', () => console.log('Screenshots taken'))
    .on('error', (err) => console.error('Error:', err))
    .takeScreenshots({
        count: 5,
        timemarks: [ '10%', '30%', '50%', '70%', '90%' ],
        filename: 'thumbnail-%i.png'
    }, outputDir);
```

### 2. Snapshot from RTSP Stream (Security Camera)

Capture a single frame from a live camera feed.

```javascript
/* rtsp_snapshot.js */
const ffmpeg = require('fluent-ffmpeg');

// RTSP URL (e.g., rtsp://user:pass@192.168.1.10:554/stream1)
const streamUrl = process.env.CAMERA_RTSP_URL || process.argv[2];

ffmpeg(streamUrl)
    .frames(1)
    .output('snapshot.jpg')
    .on('end', () => console.log('Snapshot saved to snapshot.jpg'))
    .on('error', (err) => console.error('Error:', err))
    .run();
```

### 3. Analyze Content

After extracting frames, use the `screenshot-vision` or `image-generation` skill (using a vision model) to describe what's in the image.

Example workflow:
1.  Run `node rtsp_snapshot.js` -> saves `snapshot.jpg`
2.  Run vision request on `snapshot.jpg`
3.  "I see a person at the front door."
