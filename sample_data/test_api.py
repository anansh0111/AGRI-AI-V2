"""
API Test Script - tests all endpoints with generated data.
Run: python test_api.py
Make sure backend is running: python -m uvicorn main:app --reload --port 8000
"""
import json, time, random, io, sys
import numpy as np

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Install Pillow: pip install Pillow")
    sys.exit(1)

BASE = "http://localhost:8000/api/v1"


def make_sensor_data(n=200, scenario="normal"):
    t = np.linspace(0, 10, n)
    temps = 25 + 5*np.sin(t) + np.random.randn(n)*0.5
    hums  = 62 + 8*np.cos(t) + np.random.randn(n)
    soil  = 45 + 6*np.sin(.3*t) + np.random.randn(n)

    if scenario == "drought":
        temps += np.linspace(0, 12, n)
        hums  -= np.linspace(0, 30, n)
        soil  -= np.linspace(0, 25, n)
    elif scenario == "flood":
        soil  += np.linspace(0, 50, n)
        hums  += np.linspace(0, 30, n)

    return {
        "temperature":   np.clip(temps, -10, 50).tolist(),
        "humidity":      np.clip(hums, 0, 100).tolist(),
        "co2":           np.clip(410 + 40*np.sin(.5*t) + np.random.randn(n)*3, 300, 3000).tolist(),
        "soil_moisture": np.clip(soil, 0, 100).tolist(),
        "ndvi":          np.clip(.55 + .2*np.sin(.2*t) + np.random.randn(n)*.03, -1, 1).tolist(),
    }


def make_image(color=(60, 140, 60)):
    img  = Image.new("RGB", (224, 224), color)
    draw = ImageDraw.Draw(img)
    for i in range(0, 224, 14):
        draw.line([(0,i),(224,i)], fill=tuple(max(0,c-20) for c in color), width=2)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


def check_health():
    try:
        r = requests.get("http://localhost:8000/health", timeout=5)
        print(f"Health: {r.json()}")
        return True
    except Exception as e:
        print(f"Backend not reachable: {e}")
        print("Start it with: cd backend && python -m uvicorn main:app --reload --port 8000")
        return False


def test_register_login():
    print("\n--- Test: Auth ---")
    r = requests.post(f"{BASE}/register", json={"username":"testfarmer","password":"test123","farm_name":"Test Farm"}, timeout=10)
    print(f"Register: {r.status_code} - {r.json().get('username','error')}")

    r = requests.post(f"{BASE}/login", json={"username":"testfarmer","password":"test123"}, timeout=10)
    if r.status_code == 200:
        token = r.json()["access_token"]
        print(f"Login: OK - token received")
        return token
    print(f"Login failed: {r.text}")
    return None


def test_predict(scenario="normal"):
    print(f"\n--- Test: Predict ({scenario}) ---")
    sensor = make_sensor_data(200, scenario)
    color  = (170,120,50) if scenario=="drought" else (30,80,180) if scenario=="flood" else (60,140,60)
    image  = make_image(color)
    t0 = time.time()
    r  = requests.post(
        f"{BASE}/predict",
        data={"sensor_data": json.dumps(sensor), "field_id":"test-01", "crop_type":"wheat"},
        files={"image": ("field.jpg", image, "image/jpeg")},
        timeout=30,
    )
    elapsed = time.time() - t0
    if r.status_code == 200:
        d = r.json()
        print(f"  Carbon     : {d['carbon_emission_kg_ha']:.1f} kg/ha")
        print(f"  Anomaly    : {d['anomaly_class']}")
        print(f"  Severity   : {d['alert_severity']}")
        print(f"  Confidence : {d['confidence_score']:.1%}")
        print(f"  Time       : {elapsed:.2f}s")
        if d.get("irrigation"):
            print(f"  Irrigation : {d['irrigation']['recommendation']}")
        if d.get("ndvi_analysis"):
            print(f"  NDVI       : {d['ndvi_analysis']['ndvi_value']} ({d['ndvi_analysis']['status']})")
        if d.get("yield_prediction"):
            print(f"  Yield      : {d['yield_prediction']['predicted_yield_tonnes_ha']} t/ha")
    else:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")


def test_weather():
    print("\n--- Test: Weather ---")
    r = requests.get(f"{BASE}/weather", timeout=10)
    if r.status_code == 200:
        d = r.json()
        print(f"  Temp       : {d['temperature']}°C")
        print(f"  Humidity   : {d['humidity']}%")
        print(f"  Source     : {d['source']}")
    else:
        print(f"  ERROR {r.status_code}")


def test_analytics():
    print("\n--- Test: Analytics ---")
    r = requests.get(f"{BASE}/analytics", timeout=10)
    if r.status_code == 200:
        d = r.json()
        s = d["summary"]
        print(f"  Total Predictions : {s['total_predictions']}")
        print(f"  Alert Count       : {s['alert_count']}")
        print(f"  Avg Carbon        : {s['avg_carbon_kg_ha']} kg/ha")
        print(f"  Model Status      : {s.get('model_status','n/a')}")
    else:
        print(f"  ERROR {r.status_code}")


def test_model_health():
    print("\n--- Test: Model Health ---")
    r = requests.get(f"{BASE}/model-health", timeout=10)
    if r.status_code == 200:
        d = r.json()
        print(f"  Status           : {d['status']}")
        print(f"  Avg Confidence   : {d['avg_confidence']}")
        print(f"  Recommendation   : {d['recommendation']}")
    else:
        print(f"  ERROR {r.status_code}")


def save_sample_files():
    """Save sample files for manual testing."""
    sensor = make_sensor_data(200, "drought")
    with open("sample_sensor_data.json","w") as f:
        json.dump(sensor, f, indent=2)
    print("Saved: sample_sensor_data.json")

    with open("sample_image_normal.jpg","wb") as f:
        f.write(make_image((60,140,60)))
    print("Saved: sample_image_normal.jpg")

    with open("sample_image_drought.jpg","wb") as f:
        f.write(make_image((170,120,50)))
    print("Saved: sample_image_drought.jpg")


if __name__ == "__main__":
    print("AgroSense AI v2 - API Test Suite")
    print("="*40)

    if not check_health():
        print("\nGenerating sample files instead...")
        save_sample_files()
        sys.exit(0)

    test_register_login()
    test_predict("normal")
    test_predict("drought")
    test_predict("flood")
    test_weather()
    test_analytics()
    test_model_health()
    print("\n" + "="*40)
    print("All tests completed!")
