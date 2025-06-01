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

from os import environ
DATA_FILE = environ.get('TRADING_JOURNAL_DATA_FILE', 'trading_journal_data.json')
HOST = environ.get('TRADING_JOURNAL_HOST', 'localhost')
PORT = int(environ.get('TRADING_JOURNAL_PORT', 2108))
LOG_FILE = environ.get('TRADING_JOURNAL_LOG_FILE', 'backend.log')
LAST_LOG_FILE = environ.get('TRADING_JOURNAL_LAST_LOG_FILE', 'last.log')
MAX_LOG_SIZE = int(environ.get('TRADING_JOURNAL_MAX_LOG_SIZE', 10 * 1024 * 1024))  # 10 MB
BACKUP_COUNT = int(environ.get('TRADING_JOURNAL_LOG_BACKUP_COUNT', 5))
UPLOAD_FOLDER = environ.get('TRADING_JOURNAL_UPLOAD_FOLDER', 'static/images')

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(formatter)
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=MAX_LOG_SIZE, backupCount=BACKUP_COUNT)
file_handler.setFormatter(formatter)
if os.path.exists(LAST_LOG_FILE):
    os.remove(LAST_LOG_FILE)
last_log_handler = logging.FileHandler(LAST_LOG_FILE)
last_log_handler.setFormatter(formatter)
logger.addHandler(stream_handler)
logger.addHandler(file_handler)
logger.addHandler(last_log_handler)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

REQUEST_LIMIT = 100
REQUEST_WINDOW = 60
request_counts = defaultdict(list)

def format_file_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"

def check_rate_limit(ip):
    now = timestamp()
    request_counts[ip] = [t for t in request_counts[ip] if now - t < REQUEST_WINDOW]
    if len(request_counts[ip]) >= REQUEST_LIMIT:
        return False
    request_counts[ip].append(now)
    return True

def validate_data(data):
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
        backup_file = f"{DATA_FILE}.backup"
        if os.path.exists(DATA_FILE):
            shutil.copy2(DATA_FILE, backup_file)
            logger.info(f"Created backup: {backup_file}")
        
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        data_size = os.path.getsize(DATA_FILE)
        logger.info(f"Saved data to {DATA_FILE}, size: {format_file_size(data_size)}")
        
        if os.path.exists(backup_file):
            os.remove(backup_file)
            logger.info(f"Removed backup: {backup_file}")
    except Exception as e:
        logger.error(f"Error saving data: {str(e)}")
        if os.path.exists(backup_file):
            shutil.move(backup_file, DATA_FILE)
            logger.info(f"Restored backup: {backup_file}")
        raise

@app.route('/', methods=['GET'])
def serve_index():
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    try:
        index_path = os.path.join('static', 'index.html')
        if not os.path.exists(index_path):
            logger.error(f"index.html not found at {index_path}")
            return jsonify({'error': 'index.html not found'}), 404
        return send_file(index_path)
    except Exception as e:
        logger.error(f"Error serving index.html: {str(e)}")
        return jsonify({'error': 'Failed to serve index.html'}), 500

@app.route('/api/get_profiles', methods=['GET'])
def get_profiles():
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    try:
        data = load_data()
        profiles = list(data.get('profiles', {}).keys()) or ['Profile 1']
        return jsonify({'profiles': profiles})
    except Exception as e:
        logger.error(f"Error fetching profiles: {str(e)}")
        return jsonify({'error': 'Failed to fetch profiles'}), 500

@app.route('/api/get_data/<profile_name>', methods=['GET'])
def get_data(profile_name):
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    try:
        data = load_data()
        profile_data = data.get('profiles', {}).get(profile_name, {})
        
        trades = profile_data.get('trades', {})
        modified_trades = {}
        for date, trade_list in trades.items():
            modified_trades[date] = [
                {**trade, 'image': None, 'imageRef': trade.get('imageRef') is not None}
                for trade in trade_list
            ]
        
        response = {
            'trades': modified_trades,
            'tags': profile_data.get('tags', []),
            'strategies': profile_data.get('strategies', [])
        }
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error fetching data for profile {profile_name}: {str(e)}")
        return jsonify({'error': 'Failed to fetch data'}), 500

@app.route('/api/get_image/<profile_name>/<date>/<index>', methods=['GET'])
def get_image(profile_name, date, index):
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    try:
        data = load_data()
        profile_data = data.get('profiles', {}).get(profile_name, {})
        trades = profile_data.get('trades', {}).get(date, [])
        index = int(index)
        
        if index < 0 or index >= len(trades):
            return jsonify({'error': 'Invalid trade index'}), 404
        
        trade = trades[index]
        image_ref = trade.get('imageRef')
        if not image_ref:
            return jsonify({'error': 'No image for this trade'}), 404
        
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{image_ref}.png")
        if not os.path.exists(image_path):
            return jsonify({'error': 'Image file not found'}), 404
        
        return send_file(image_path, mimetype='image/png')
    except Exception as e:
        logger.error(f"Error fetching image for profile {profile_name}, date {date}, index {index}: {str(e)}")
        return jsonify({'error': 'Failed to fetch image'}), 500

@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        profile = request.form.get('profile')
        date = request.form.get('date')
        index = request.form.get('index')
        
        if not all([profile, date, index]):
            return jsonify({'error': 'Missing profile, date, or index'}), 400
        
        index = int(index)
        
        data = load_data()
        profile_data = data.get('profiles', {}).get(profile, {})
        trades = profile_data.get('trades', {}).get(date, [])
        
        if index < 0 or index > len(trades):
            return jsonify({'error': 'Invalid trade index'}), 400
        
        # Generate a unique filename based on imageRef or date-index
        image_ref = f"{date}-{index}"
        filename = f"{image_ref}.png"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save the file
        file.save(file_path)
        logger.info(f"Uploaded image to {file_path}")
        
        # Update trade with imageRef if it exists, or add new trade
        if index < len(trades):
            trades[index]['imageRef'] = image_ref
        else:
            trade = {'date': date, 'imageRef': image_ref}  # Minimal trade data
            trades.append(trade)
        
        profile_data['trades'] = profile_data.get('trades', {})
        profile_data['trades'][date] = trades
        data['profiles'][profile] = profile_data
        save_data(data)
        
        return jsonify({'message': 'Image uploaded successfully', 'imageRef': image_ref})
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        return jsonify({'error': 'Failed to upload image'}), 500

@app.route('/api/submit_data', methods=['POST'])
def submit_data():
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    try:
        data = request.get_json()
        valid, error = validate_data(data)
        if not valid:
            logger.error(f"Invalid data: {error}")
            return jsonify({'error': error}), 400
        
        current_data = load_data()
        profiles = data.get('profiles', ['Profile 1'])
        current_profile = data.get('currentProfile', 'Profile 1')
    
        current_data['profiles'] = current_data.get('profiles', {})
        for profile in profiles:
            current_data['profiles'][profile] = {
                'trades': data.get('trades', {}).get(profile, {}),
                'tags': data.get('tags', []),
                'strategies': data.get('strategies', [])
            }
        
        current_data['currentProfile'] = current_profile
        
        save_data(current_data)
        return jsonify({'message': 'Data saved successfully'})
    except Exception as e:
        logger.error(f"Error submitting data: {str(e)}")
        return jsonify({'error': 'Failed to save data'}), 500

def signal_handler(sig, frame):
    logger.info("Shutting down server...")
    sys.exit(0)

def open_browser():
    time.sleep(1)
    webbrowser.open(f"http://{HOST}:{PORT}")

if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    threading.Thread(target=open_browser, daemon=True).start()
    logger.info(f"Starting server on http://{HOST}:{PORT}")
    serve(app, host=HOST, port=PORT)