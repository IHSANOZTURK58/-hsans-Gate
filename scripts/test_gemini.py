import requests
import os
import json

# Your API Key
API_KEY = "AIzaSyD7tYUCfQQHiSLCkwjT98zeJidNKU9Txts"

MODELS_TO_TEST = [
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro-001",
    "gemini-1.0-pro",
    "gemini-1.0-pro-001"
]

print(f"Testing Gemini API with key: {API_KEY[:10]}...")

def test_model(model_name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{
            "parts": [{"text": "Hello, this is a test."}]
        }]
    }
    
    try:
        response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'})
        if response.status_code == 200:
            print(f"✅ {model_name}: SUCCESS")
            return True
        else:
            print(f"❌ {model_name}: FAILED ({response.status_code})")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ {model_name}: ERROR {e}")
        return False


print("\n--- Listing Available Models ---")
list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
try:
    response = requests.get(list_url)
    if response.status_code == 200:
        models = response.json().get('models', [])
        print(f"Found {len(models)} models accessible with this key:")
        with open("scripts/available_models.txt", "w", encoding="utf-8") as f:
            for m in models:
                if 'generateContent' in m.get('supportedGenerationMethods', []):
                    line = f"{m['name']} ({m.get('displayName', 'No name')})"
                    print(line)
                    f.write(line + "\n")
    else:
        print(f"❌ List Models Failed: {response.status_code}")
        print(f"   Response: {response.text}")
except Exception as e:
    print(f"❌ List Models Error: {e}")

