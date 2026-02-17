---
name: image-generation
description: Generate images using DALL-E (via OpenAI API) or Stability AI. Creates visual content from text descriptions.
tools:
  - web_fetch
  - bash
dependencies:
  - axios
---

# Image Generation Skill

Create images from text descriptions.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install axios
    ```

2.  **Configure Environment Variables**:
    Ensure `OPENAI_API_KEY` is set in `.env` (for DALL-E 3).
    Optionally set `STABILITY_API_KEY` if you prefer Stability AI.

## Usage

### Generate Image (DALL-E 3)

Create a script to call the OpenAI Image API.

```javascript
/* generate_image.js */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.OPENAI_API_KEY;

async function generateImage(prompt, outputPath) {
    console.log(`Generating image for: "${prompt}"...`);

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/images/generations',
            {
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json" // Get base64 to save directly
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const b64Json = response.data.data[0].b64_json;
        const buffer = Buffer.from(b64Json, 'base64');
        
        fs.writeFileSync(outputPath, buffer);
        console.log(`Image saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error generating image:', error.response ? error.response.data : error.message);
    }
}

// Usage: node generate_image.js "A futuristic city" "city.png"
const [,, prompt, filename] = process.argv;
const outputPath = path.resolve(process.cwd(), filename || `image_${Date.now()}.png`);

generateImage(prompt, outputPath);
```

### Save and View

The generated image will be saved to the current working directory. You can then use the `bash` tool to move it to a web-accessible folder or send it via Telegram/other channels if supported.

## Best Practices

-   **Prompt Engineering**: Be descriptive. Include style, lighting, mood, and composition details.
-   **Cost Awareness**: DALL-E 3 builds are not free. Check usage limits.
