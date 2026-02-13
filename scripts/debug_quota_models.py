import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyD7tYUCfQQHiSLCkwjT98zeJidNKU9Txts"

def test_model(model_name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": "Say hi."}]}]}
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"--- {model_name}: {response.status_code} ---")
        if response.status_code == 200:
             print("SUCCESS ✅")
        else:
            print(f"Error: {response.text[:150]}")
    except Exception as e:
        print(f"Exception for {model_name}: {e}")

# Models that showed 1.5K in the screenshots
models = [
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-pro-exp-02-05",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.0-flash-exp"
]

for m in models:
    test_model(m)
