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
from os import environ
import base64

DATA_FILE = environ.get('TRADING_JOURNAL_DATA_FILE', 'trading_journal_data.json')
HOST = environ.get('TRADING_JOURNAL_HOST', 'localhost')
PORT = int(environ.get('TRADING_JOURNAL_PORT', 2108))
LOG_FILE = environ.get('TRADING_JOURNAL_LOG_FILE', 'backend.log')
LAST_LOG_FILE = environ.get('TRADING_JOURNAL_LAST_LOG_FILE', 'last.log')
MAX_LOG_SIZE = int(environ.get('TRADING_JOURNAL_MAX_LOG_SIZE', 10 * 1024 * 1024))  # 10 MB
BACKUP_COUNT = int(environ.get('TRADING_JOURNAL_LOG_BACKUP_COUNT', 5))
UPLOAD_FOLDER = environ.get('TRADING_JOURNAL_UPLOAD_FOLDER', 'static/images')

def format_size(bytes_size):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} PB"

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

cached_data = None
last_modified_time = 0

def load_data_from_file():
    try:
        with open(DATA_FILE, 'r') as f:
            content = f.read()
            size = format_size(len(content.encode('utf-8')))
            logger.info(f"Loading data from file ({size})")
            return json.loads(content)
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        init_data_file()
        return {'profiles': {}, 'currentProfile': 'Profile 1'}

def load_data():
    global cached_data, last_modified_time
    try:
        current_mtime = os.path.getmtime(DATA_FILE)
        if cached_data is None or current_mtime > last_modified_time:
            cached_data = load_data_from_file()
            last_modified_time = current_mtime
    except FileNotFoundError:
        init_data_file()
        cached_data = {'profiles': {}, 'currentProfile': 'Profile 1'}
        last_modified_time = os.path.getmtime(DATA_FILE)
    return cached_data

def save_data(data):
    global cached_data, last_modified_time
    try:
        backup_file = f"{DATA_FILE}.backup"
        if os.path.exists(DATA_FILE):
            shutil.copy2(DATA_FILE, backup_file)
            logger.info(f"Created backup: {backup_file}")

        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)

        size = os.path.getsize(DATA_FILE)
        logger.info(f"Saved data to file ({format_size(size)})")

        if os.path.exists(backup_file):
            os.remove(backup_file)
            logger.info(f"Removed backup: {backup_file}")

        cached_data = data
        last_modified_time = os.path.getmtime(DATA_FILE)
    except Exception as e:
        logger.error(f"Error saving data: {str(e)}")
        if os.path.exists(backup_file):
            shutil.move(backup_file, DATA_FILE)
            logger.info(f"Restored backup: {backup_file}")
        raise

def init_data_file():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump({'profiles': {}, 'currentProfile': 'Profile 1'}, f)
        logger.info(f"Initialized new data file: {DATA_FILE}")

@app.route('/', methods=['GET'])
def serve_index():
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
    try:
        data = load_data()
        profiles = list(data.get('profiles', {}).keys()) or ['Profile 1']
        logger.info(f"Fetched profiles: {profiles}")
        return jsonify({'profiles': profiles})
    except Exception as e:
        logger.error(f"Error fetching profiles: {str(e)}")
        return jsonify({'error': 'Failed to fetch profiles'}), 500

@app.route('/api/get_data/<profile_name>', methods=['GET'])
def get_data(profile_name):
    try:
        data = load_data()
        profile_data = data.get('profiles', {}).get(profile_name, {})
        size = len(json.dumps(profile_data).encode('utf-8'))
        logger.info(f"Fetched data for profile '{profile_name}' ({format_size(size)})")

        trades = profile_data.get('trades', {})
        modified_trades = {}
        for date, trade_list in trades.items():
            modified_trades[date] = [
                {**trade, 'image': trade.get('image'), 'imageRef': None}
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
    try:
        data = load_data()
        profile_data = data.get('profiles', {}).get(profile_name, {})
        trades = profile_data.get('trades', {}).get(date, [])
        index = int(index)

        if index < 0 or index >= len(trades):
            return jsonify({'error': 'Invalid trade index'}), 404

        trade = trades[index]
        image_data = trade.get('image')
        if not image_data:
            return jsonify({'error': 'No image for this trade'}), 404

        logger.info(f"Fetched image for profile={profile_name}, date={date}, index={index}, size={format_size(len(image_data.encode('utf-8')))}")
        return jsonify({'image': image_data})
    except Exception as e:
        logger.error(f"Error fetching image for profile {profile_name}, date {date}, index {index}: {str(e)}")
        return jsonify({'error': 'Failed to fetch image'}), 500

@app.route('/api/upload_image', methods=['POST'])
def upload_image():
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

        image_bytes = file.read()
        image_data = base64.b64encode(image_bytes).decode('utf-8')
        logger.info(f"Uploaded image for profile={profile}, date={date}, index={index}, size={format_size(len(image_bytes))}")

        if index < len(trades):
            trades[index]['image'] = image_data
        else:
            trade = {'date': date, 'image': image_data}
            trades.append(trade)

        profile_data['trades'] = profile_data.get('trades', {})
        profile_data['trades'][date] = trades
        data['profiles'][profile] = profile_data
        save_data(data)

        return jsonify({'message': 'Image uploaded successfully', 'image': image_data})
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        return jsonify({'error': 'Failed to upload image'}), 500

@app.route('/api/submit_data', methods=['POST'])
def submit_data():
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
        logger.info(f"Submitting data: size={format_size(len(json.dumps(current_data).encode('utf-8')))}")
        save_data(current_data)

        return jsonify({'message': 'Data saved successfully'})
    except Exception as e:
        logger.error(f"Error submitting data: {str(e)}")
        return jsonify({'error': 'Failed to save data'}), 500

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
    load_data()
    serve(app, host=HOST, port=PORT)