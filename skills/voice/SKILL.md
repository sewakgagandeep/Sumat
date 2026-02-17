---
name: voice
description: Voice interactions using OpenAI Whisper (Speech-to-Text) and ElevenLabs (Text-to-Speech).
tools:
  - bash
  - web_fetch
dependencies:
  - axios
  - form-data
  - fs
---

# Voice Skill

Give the agent a voice and ears.

## Setup

1.  **Dependencies**: `npm install axios form-data`
2.  **Environment**: 
    -   `OPENAI_API_KEY` (for Whisper)
    -   `ELEVENLABS_API_KEY` (for TTS)
    -   `ELEVENLABS_VOICE_ID` (Optional, default provided)

## Usage

### 1. Speak (Text-to-Speech)

Generate audio from text using ElevenLabs.

```javascript
/* speak.js */
const axios = require('axios');
const fs = require('fs');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

async function speak(text, outputFile) {
    const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        data: {
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.5 }
        },
        headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
        },
        responseType: 'stream'
    });

    response.data.pipe(fs.createWriteStream(outputFile));
    console.log(`Audio saved to ${outputFile}`);
}

// Usage: node speak.js "Hello world" output.mp3
const [,, text, outfile] = process.argv;
speak(text, outfile || 'speech.mp3');
```

### 2. Listen (Speech-to-Text)

Transcribe an audio file using OpenAI Whisper.

```javascript
/* listen.js */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function transcribe(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', 'whisper-1');

    const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        form,
        {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
    );

    console.log(response.data.text);
}

// Usage: node listen.js audio.mp3
const [,, file] = process.argv;
transcribe(file);
```
