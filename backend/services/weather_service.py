"""
Weather service.
Uses OpenWeatherMap if API key is set in .env.
Returns simulated data otherwise (app works without API key).
"""
import os
import random
import logging

import httpx

logger  = logging.getLogger(__name__)
API_KEY = os.getenv("OPENWEATHER_API_KEY", "")


async def get_weather(lat: float = 28.6139, lon: float = 77.2090) -> dict:
    if not API_KEY:
        return _simulated_weather()
    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            d = resp.json()
        return {
            "temperature":    round(d["main"]["temp"],     1),
            "humidity":       round(d["main"]["humidity"], 1),
            "pressure":       round(d["main"]["pressure"], 1),
            "wind_speed":     round(d["wind"]["speed"],    1),
            "wind_direction": d["wind"].get("deg", 0),
            "description":    d["weather"][0]["description"],
            "icon":           d["weather"][0]["icon"],
            "city":           d.get("name", "Unknown"),
            "source":         "openweathermap",
        }
    except Exception as e:
        logger.warning(f"Weather API failed: {e}. Using simulated data.")
        return _simulated_weather()


def _simulated_weather() -> dict:
    return {
        "temperature":    round(22 + random.gauss(0, 3), 1),
        "humidity":       round(60 + random.gauss(0, 8), 1),
        "pressure":       round(1013 + random.gauss(0, 5), 1),
        "wind_speed":     round(abs(random.gauss(10, 4)), 1),
        "wind_direction": random.randint(0, 360),
        "description":    random.choice(
            ["clear sky", "few clouds", "scattered clouds", "light rain"]
        ),
        "icon":   "01d",
        "city":   "Demo City",
        "source": "simulated",
    }
