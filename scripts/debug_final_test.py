import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyD7tYUCfQQHiSLCkwjT98zeJidNKU9Txts"

models = [
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-pro-exp-02-05",
    "gemini-2.0-flash-exp",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemma-3-4b-it",
    "gemma-3-12b-it",
    "gemma-3-27b-it"
]

results = []

for m in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": "Say hi."}]}]}
    try:
        response = requests.post(url, headers=headers, json=payload)
        status = response.status_code
        results.append(f"{m}: {status}")
        if status != 200:
             results.append(f"  Error: {response.text[:100]}")
    except Exception as e:
        results.append(f"{m}: EXCEPTION {e}")

with open("scripts/model_results.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))

print("Results written to scripts/model_results.txt")
