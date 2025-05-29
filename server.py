import json
import os
import logging
import webbrowser
from flask import Flask, send_file, request, jsonify
from datetime import datetime
import sys
from waitress import serve

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
DATA_FILE = 'trading_journal_data.json'

def format_file_size(size_bytes):
    """Convert bytes to human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"

def init_data_file():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump({'profiles': {}, 'currentProfile': 'Profile 1'}, f)
        logger.info(f"Initialized new data file: {DATA_FILE}")

def load_data():
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
            data_size = os.path.getsize(DATA_FILE)
            logger.info(f"Loaded data from {DATA_FILE}, size: {format_file_size(data_size)}")
            return data
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        init_data_file()
        return {'profiles': {}, 'currentProfile': 'Profile 1'}

def save_data(data):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        data_size = os.path.getsize(DATA_FILE)
        logger.info(f"Saved data to {DATA_FILE}, size: {format_file_size(data_size)}")
    except Exception as e:
        logger.error(f"Error saving data: {str(e)}")

@app.route('/')
def serve_index():
    try:
        file_size = os.path.getsize('index.html')
        logger.info(f"Serving index.html, size: {format_file_size(file_size)}")
        return send_file('index.html')
    except Exception as e:
        logger.error(f"Error serving index.html: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit_data', methods=['POST'])
def submit_data():
    try:
        content_length = request.content_length or 0
        logger.info(f"Received POST request to /api/submit_data, size: {format_file_size(content_length)}")
        
        data = request.get_json()
        profile_name = data.get('currentProfile')
        if not profile_name:
            logger.warning("Profile name missing in request")
            return jsonify({'error': 'Profile name is required'}), 400
        
        stored_data = load_data()
        
        stored_data['profiles'][profile_name] = {
            'trades': data.get('trades', {}),
            'tags': data.get('tags', []),
            'strategies': data.get('strategies', []),
            'profilesList': data.get('profiles', [])
        }
        stored_data['currentProfile'] = profile_name
        
        save_data(stored_data)
        
        response = {'message': 'Data saved successfully'}
        response_size = len(json.dumps(response).encode('utf-8'))
        logger.info(f"Sending response for /api/submit_data, size: {format_file_size(response_size)}")
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Error processing POST request: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_data/<profile_name>', methods=['GET'])
def get_data(profile_name):
    try:
        logger.info(f"Received GET request for profile: {profile_name}")
        data = load_data()
        profile_data = data['profiles'].get(profile_name, {
            'trades': {},
            'tags': [],
            'strategies': ['Trendfolge', 'Volumen', 'Fibonacci', 'Sweep', 'Range', 'RAIN'],
            'profilesList': data.get('profiles', ['Profile 1'])
        })
        profile_data['currentProfile'] = profile_name
        
        response_size = len(json.dumps(profile_data).encode('utf-8'))
        logger.info(f"Sending response for /api/get_data/{profile_name}, size: {format_file_size(response_size)}")
        return jsonify(profile_data), 200
    except Exception as e:
        logger.error(f"Error processing GET request for profile {profile_name}: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_data_file()
    host = 'localhost'
    port = 2108
    url = f'http://{host}:{port}'
    logger.info(f"Starting server with {os.cpu_count() or 1} threads")
    logger.info(f"Opening browser at {url}")
    webbrowser.open(url)
    serve(
        app,
        host=host,
        port=port,
        threads=(os.cpu_count() or 1),
        backlog=2048,
        ident='Waitress-Flask-Server'
    )