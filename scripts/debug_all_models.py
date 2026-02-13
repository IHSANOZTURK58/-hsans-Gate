import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    # Fallback to the known key if env is missing in this session
    API_KEY = "AIzaSyD7tYUCfQQHiSLCkwjT98zeJidNKU9Txts"

def test_model(model_name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "parts": [{"text": "Generate a short English sentence for translation."}]
        }]
    }
    
    print(f"--- Testing {model_name} ---")
    try:
        response = requests.post(url, headers=headers, json=payload)
        status = response.status_code
        print(f"Status: {status}")
        if status == 200:
            print("  Result: SUCCESS ✅")
        elif status == 429:
            print("  Result: QUOTA EXCEEDED ❌ (429)")
        elif status == 404:
            print("  Result: NOT FOUND ❓ (404)")
        else:
            print(f"  Result: ERROR ⚠️ ({status}) - {response.text[:100]}")
        return status
    except Exception as e:
        print(f"Exception: {e}")
        return 500

models_to_test = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-8b-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-flash-latest",
    "gemini-pro",
    "gemini-1.0-pro"
]

print(f"Targeting API Key: {API_KEY[:5]}...{API_KEY[-5:]}")
results = {}

for m in models_to_test:
    results[m] = test_model(m)

print("\n=== FINAL SUMMARY ===")
success_models = [m for m, s in results.items() if s == 200]
if success_models:
    print(f"Working models: {', '.join(success_models)}")
else:
    print("No working models found.")
