---
name: weather
description: Get current weather conditions and forecasts using OpenWeatherMap API.
version: "1.0"
author: Sumat
tools:
  - web_fetch
---

# Weather Skill

Provides current weather data and forecasts for any location worldwide using OpenWeatherMap API.

## Setup

1. Get a free API key from https://openweathermap.org/api (free tier: 1000 calls/day)
2. Set the environment variable: `OPENWEATHERMAP_API_KEY`

## Usage

When the user asks about weather:

### Current Weather
Use `web_fetch` to call:
```
https://api.openweathermap.org/data/2.5/weather?q={city}&units=metric&appid={API_KEY}
```

Replace `{city}` with the location name and `{API_KEY}` with the `OPENWEATHERMAP_API_KEY` environment variable.

### 5-Day Forecast
```
https://api.openweathermap.org/data/2.5/forecast?q={city}&units=metric&appid={API_KEY}
```

### By Coordinates
```
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={API_KEY}
```

## Response Format

Parse the JSON response and present it as:

```
🌤️ Weather in {City}, {Country}

Temperature: {temp}°C (feels like {feels_like}°C)
Conditions: {description}
Humidity: {humidity}%
Wind: {speed} m/s {direction}
Visibility: {visibility} km
```

For forecasts, group by day and show high/low temps with conditions.

## Tips

- Default to metric units unless the user specifies imperial
- If city is ambiguous, ask for country code (e.g., "London, UK" vs "London, CA")
- For forecasts, highlight notable changes (storms, temperature swings)
- If API key is not set, inform the user and provide setup instructions
