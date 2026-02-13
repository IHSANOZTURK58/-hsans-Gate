from flask import Flask, request, jsonify, send_file
import os
import json

app = Flask(__name__)

# Resolve paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../scripts
ROOT_DIR = os.path.dirname(BASE_DIR) # .../

# Serve fix_vocab.html
@app.route('/')
def home():
    return send_file(os.path.join(BASE_DIR, 'fix_vocab.html'))

# Serve fix_vocab.json
@app.route('/fix_vocab.json')
def get_vocab():
    return send_file(os.path.join(ROOT_DIR, 'fix_vocab.json'))

# ... imports ...
import urllib.request
import urllib.error

# ... routes ...

# Proxy to bypass CORS/Referer restrictions
@app.route('/api/proxy', methods=['POST'])
def proxy_request():
    try:
        data = request.json
        url = data.get('url')
        payload = data.get('body')
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Referer': 'https://ihsansgate.firebaseapp.com/',
                'Origin': 'https://ihsansgate.firebaseapp.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        )
        
        with urllib.request.urlopen(req) as response:
            resp_data = response.read()
            return (resp_data, response.status, {'Content-Type': 'application/json'})
            
    except urllib.error.HTTPError as e:
        return jsonify({"error": str(e), "details": e.read().decode('utf-8')}), e.code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Save handled data
# ...
    except Exception as e:
        print(f"Error saving: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Running Vocab Server on http://localhost:8000")
    app.run(port=8000)
