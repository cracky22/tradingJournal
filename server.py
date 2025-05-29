import json
import os
import logging
import webbrowser
import signal
import sys
import shutil
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler
from flask import Flask, send_file, request, jsonify
from flask_cors import CORS
from waitress import serve
import threading
from collections import defaultdict
from time import time as timestamp

# Load environment variables
from os import environ
DATA_FILE = environ.get('TRADING_JOURNAL_DATA_FILE', 'trading_journal_data.json')
HOST = environ.get('TRADING_JOURNAL_HOST', 'localhost')
PORT = int(environ.get('TRADING_JOURNAL_PORT', 2108))
LOG_FILE = environ.get('TRADING_JOURNAL_LOG_FILE', 'server.log')
MAX_LOG_SIZE = int(environ.get('TRADING_JOURNAL_MAX_LOG_SIZE', 10 * 1024 * 1024))  # 10 MB
BACKUP_COUNT = int(environ.get('TRADING_JOURNAL_LOG_BACKUP_COUNT', 5))

# Configure logging with rotation
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(formatter)
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=MAX_LOG_SIZE, backupCount=BACKUP_COUNT)
file_handler.setFormatter(formatter)
logger.addHandler(stream_handler)
logger.addHandler(file_handler)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Rate limiting setup (in-memory, per IP)
REQUEST_LIMIT = 100  # Max requests per minute
REQUEST_WINDOW = 60  # Seconds
request_counts = defaultdict(list)

def format_file_size(size_bytes):
    """Convert bytes to human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"

def check_rate_limit(ip):
    """Check if client IP exceeds rate limit"""
    now = timestamp()
    request_counts[ip] = [t for t in request_counts[ip] if now - t < REQUEST_WINDOW]
    if len(request_counts[ip]) >= REQUEST_LIMIT:
        return False
    request_counts[ip].append(now)
    return True

def validate_data(data):
    """Validate incoming JSON data structure"""
    if not isinstance(data, dict):
        return False, "Data must be a dictionary"
    if 'currentProfile' not in data:
        return False, "Missing currentProfile"
    if not isinstance(data.get('trades', {}), dict):
        return False, "Trades must be a dictionary"
    if not isinstance(data.get('tags', []), list):
        return False, "Tags must be a list"
    if not isinstance(data.get('strategies', []), list):
        return False, "Strategies must be a list"
    if not isinstance(data.get('profiles', []), list):
        return False, "Profiles must be a list"
    return True, ""

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
        # Create backup
        backup_file = f"{DATA_FILE}.backup"
        if os.path.exists(DATA_FILE):
            shutil.copy2(DATA_FILE, backup_file)
            logger.info(f"Created backup: {backup_file}")
        
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        data_size = os.path.getsize(DATA_FILE)
        logger.info(f"Saved data to {DATA_FILE}, size: {format_file_size(data_size)}")
        
        # Remove backup if save was successful
        if os.path.exists(backup_file):
            os.remove(backup_file)
            logger.info(f"Removed backup: {backup_file}")
    except Exception as e:
        logger.error(f"Error saving data: {str(e)}")
        # Restore from backup if it exists
        if os.path.exists(backup_file):
            shutil.copy2(backup_file, DATA_FILE)
            logger.info(f"Restored data from backup: {backup_file}")
        raise

@app.route('/')
def serve_index():
    try:
        if not os.path.exists('index.html'):
            logger.error("index.html file not found")
            return jsonify({'error': 'index.html not found'}), 404
        file_size = os.path.getsize('index.html')
        logger.info(f"Serving index.html, size: {format_file_size(file_size)}")
        return send_file('index.html')
    except Exception as e:
        logger.error(f"Error serving index.html: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit_data', methods=['POST'])
def submit_data():
    client_ip = request.remote_addr
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return jsonify({'error': 'Rate limit exceeded'}), 429
    
    try:
        content_length = request.content_length or 0
        logger.info(f"Received POST request to /api/submit_data from {client_ip}, size: {format_file_size(content_length)}")
        
        data = request.get_json()
        is_valid, error_msg = validate_data(data)
        if not is_valid:
            logger.warning(f"Invalid data: {error_msg}")
            return jsonify({'error': error_msg}), 400
        
        profile_name = data.get('currentProfile')
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
    client_ip = request.remote_addr
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return jsonify({'error': 'Rate limit exceeded'}), 429
    
    try:
        logger.info(f"Received GET request for profile: {profile_name} from {client_ip}")
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

@app.route('/api/docs', methods=['GET'])
def api_docs():
    try:
        docs = {
            'endpoints': [
                {
                    'path': '/',
                    'method': 'GET',
                    'description': 'Serves the index.html file',
                    'response': 'HTML file'
                },
                {
                    'path': '/api/submit_data',
                    'method': 'POST',
                    'description': 'Submits trading journal data for a profile',
                    'body': {
                        'currentProfile': 'string (required)',
                        'trades': 'object',
                        'tags': 'array',
                        'strategies': 'array',
                        'profiles': 'array'
                    },
                    'response': {'message': 'string'},
                    'errors': {
                        '400': 'Invalid data format or missing currentProfile',
                        '429': 'Rate limit exceeded',
                        '500': 'Server error'
                    }
                },
                {
                    'path': '/api/get_data/<profile_name>',
                    'method': 'GET',
                    'description': 'Retrieves trading journal data for the specified profile',
                    'response': {
                        'trades': 'object',
                        'tags': 'array',
                        'strategies': 'array',
                        'profilesList': 'array',
                        'currentProfile': 'string'
                    },
                    'errors': {
                        '429': 'Rate limit exceeded',
                        '500': 'Server error'
                    }
                },
                {
                    'path': '/api/docs',
                    'method': 'GET',
                    'description': 'Returns this API documentation',
                    'response': 'JSON object describing all endpoints'
                }
            ]
        }
        response_size = len(json.dumps(docs).encode('utf-8'))
        logger.info(f"Sending API documentation, size: {format_file_size(response_size)}")
        return jsonify(docs), 200
    except Exception as e:
        logger.error(f"Error serving API docs: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Graceful shutdown
server_thread = None
stop_event = threading.Event()

def signal_handler(sig, frame):
    logger.info("Received shutdown signal, stopping server...")
    stop_event.set()
    if server_thread:
        server_thread.join(timeout=5.0)
    logger.info("Server stopped gracefully")
    sys.exit(0)

if __name__ == '__main__':
    init_data_file()
    url = f'http://{HOST}:{PORT}'
    logger.info(f"Starting server with {os.cpu_count() or 1} threads")
    logger.info(f"Opening browser at {url}")
    webbrowser.open(url)
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start server in a separate thread to allow graceful shutdown
    server_thread = threading.Thread(target=serve, args=(app,), kwargs={
        'host': HOST,
        'port': PORT,
        'threads': os.cpu_count() or 1,
        'backlog': 2048,
        'ident': 'Waitress-Flask-Server'
    })
    server_thread.start()
    
    # Wait for stop event
    try:
        while not stop_event.is_set():
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)