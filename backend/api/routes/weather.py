"""Weather route - GET /weather"""
from fastapi import APIRouter
from services.weather_service import get_weather

router = APIRouter()


@router.get("/weather")
async def weather(lat: float = 28.6139, lon: float = 77.2090):
    """
    Returns current weather data.
    Uses OpenWeatherMap if OPENWEATHER_API_KEY is set in .env.
    Returns simulated data otherwise.
    """
    return await get_weather(lat, lon)
