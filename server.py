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

# In-memory cache for the data
cached_data = None
last_modified_time = 0

def load_data_from_file():
    try:
        logger.info(f"Loading data from file: {DATA_FILE}")
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        logger.info(f"Loaded data with profiles: {list(data.get('profiles', {}).keys())}")
        return data
    except Exception as e:
        logger.exception("Error loading data from file, initializing new file.")
        init_data_file()
        return {'profiles': {}, 'currentProfile': 'Profile 1'}

def load_data():
    global cached_data, last_modified_time
    try:
        current_mtime = os.path.getmtime(DATA_FILE)
        logger.debug(f"Current mtime: {current_mtime}, Last mtime: {last_modified_time}")
        if cached_data is None or current_mtime > last_modified_time:
            logger.info("Cache invalid or file changed, reloading data.")
            cached_data = load_data_from_file()
            last_modified_time = current_mtime
        else:
            logger.debug("Using cached data.")
    except FileNotFoundError:
        logger.warning("Data file not found, initializing new one.")
        init_data_file()
        cached_data = {'profiles': {}, 'currentProfile': 'Profile 1'}
        last_modified_time = os.path.getmtime(DATA_FILE)
    return cached_data

def save_data(data):
    global cached_data, last_modified_time
    try:
        backup_file = f"{DATA_FILE}.backup"
        logger.info(f"Saving data to file: {DATA_FILE}")
        if os.path.exists(DATA_FILE):
            shutil.copy2(DATA_FILE, backup_file)
            logger.info(f"Backup created at: {backup_file}")
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Data written to {DATA_FILE} (Profiles: {list(data.get('profiles', {}).keys())})")
        if os.path.exists(backup_file):
            os.remove(backup_file)
            logger.info(f"Backup file {backup_file} removed after successful save.")
        cached_data = data
        last_modified_time = os.path.getmtime(DATA_FILE)
    except Exception as e:
        logger.exception("Error saving data, attempting to restore from backup.")
        if os.path.exists(backup_file):
            shutil.move(backup_file, DATA_FILE)
            logger.info(f"Restored backup from {backup_file} after failure.")
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
    logger.info("GET /api/get_profiles called.")
    try:
        data = load_data()
        profiles = list(data.get('profiles', {}).keys()) or ['Profile 1']
        logger.info(f"Returning profiles: {profiles}")
        return jsonify({'profiles': profiles})
    except Exception as e:
        logger.exception("Failed to get profiles.")
        return jsonify({'error': 'Failed to fetch profiles'}), 500

@app.route('/api/get_data/<profile_name>', methods=['GET'])
def get_data(profile_name):
    logger.info(f"GET /api/get_data/{profile_name} called.")
    try:
        data = load_data()
        profile_data = data.get('profiles', {}).get(profile_name, {})
        logger.debug(f"Profile data keys: {list(profile_data.keys())}")
        trades = profile_data.get('trades', {})
        modified_trades = {
            date: [{**trade, 'image': trade.get('image'), 'imageRef': None} for trade in trade_list]
            for date, trade_list in trades.items()
        }
        logger.info(f"Returning data for profile '{profile_name}', {len(modified_trades)} trade days found.")
        return jsonify({
            'trades': modified_trades,
            'tags': profile_data.get('tags', []),
            'strategies': profile_data.get('strategies', [])
        })
    except Exception as e:
        logger.exception(f"Error fetching data for profile {profile_name}")
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
        
        return jsonify({'image': image_data})
    except Exception as e:
        logger.error(f"Error fetching image for profile {profile_name}, date {date}, index {index}: {str(e)}")
        return jsonify({'error': 'Failed to fetch image'}), 500

@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    logger.info("POST /api/upload_image called.")
    try:
        if 'image' not in request.files:
            logger.warning("No image part in request.")
            return jsonify({'error': 'No image file provided'}), 400

        file = request.files['image']
        if file.filename == '':
            logger.warning("No file selected.")
            return jsonify({'error': 'No selected file'}), 400

        profile = request.form.get('profile')
        date = request.form.get('date')
        index = request.form.get('index')

        logger.info(f"Upload params - profile: {profile}, date: {date}, index: {index}")

        if not all([profile, date, index]):
            logger.warning("Missing form fields in upload.")
            return jsonify({'error': 'Missing profile, date, or index'}), 400

        index = int(index)

        data = load_data()
        profile_data = data.get('profiles', {}).get(profile, {})
        trades = profile_data.get('trades', {}).get(date, [])

        if index < 0 or index > len(trades):
            logger.warning(f"Invalid trade index: {index}")
            return jsonify({'error': 'Invalid trade index'}), 400

        image_data = base64.b64encode(file.read()).decode('utf-8')

        if index < len(trades):
            logger.info(f"Updating image for trade {index} on {date}")
            trades[index]['image'] = image_data
        else:
            logger.info(f"Appending new trade with image for {date}")
            trades.append({'date': date, 'image': image_data})

        profile_data['trades'] = profile_data.get('trades', {})
        profile_data['trades'][date] = trades
        data['profiles'][profile] = profile_data
        save_data(data)

        return jsonify({'message': 'Image uploaded successfully', 'image': image_data})
    except Exception as e:
        logger.exception("Error during image upload")
        return jsonify({'error': 'Failed to upload image'}), 500

def validate_data(data):
    logger.debug(f"Validating submitted data: {type(data)} keys: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
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

@app.route('/api/submit_data', methods=['POST'])
def submit_data():
    logger.info("POST /api/submit_data called.")
    try:
        data = request.get_json()
        valid, error = validate_data(data)
        if not valid:
            logger.error(f"Validation error: {error}")
            return jsonify({'error': error}), 400

        current_data = load_data()
        profiles = data.get('profiles', ['Profile 1'])
        current_profile = data.get('currentProfile', 'Profile 1')

        logger.info(f"Updating profiles: {profiles} with currentProfile: {current_profile}")

        for profile in profiles:
            current_data['profiles'][profile] = {
                'trades': data.get('trades', {}).get(profile, {}),
                'tags': data.get('tags', []),
                'strategies': data.get('strategies', [])
            }

        current_data['currentProfile'] = current_profile

        save_data(current_data)
        logger.info("Data successfully saved.")
        return jsonify({'message': 'Data saved successfully'})
    except Exception as e:
        logger.exception("Error while submitting data")
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
    logger.info("Shutting down server via signal.")
    sys.exit(0)

def open_browser():
    logger.info(f"Opening browser to http://{HOST}:{PORT}")
    time.sleep(1)
    webbrowser.open(f"http://{HOST}:{PORT}")


if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    threading.Thread(target=open_browser, daemon=True).start()
    logger.info(f"Starting server on http://{HOST}:{PORT}")
    # Initialize the cache on startup
    load_data()
    serve(app, host=HOST, port=PORT)