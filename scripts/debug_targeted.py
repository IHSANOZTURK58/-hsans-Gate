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
        if response.status_code != 200:
            print(f"Error: {response.text[:200]}")
    except Exception as e:
        print(f"Exception for {model_name}: {e}")

models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-8b-latest",
    "gemini-pro-latest"
]

for m in models:
    test_model(m)
