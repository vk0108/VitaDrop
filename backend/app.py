# --- SYNC REQUESTS FROM PORT 5004 TO ALERTS_DATA.CSV ---

# --- API TO WRITE REQUEST BLOOD TO ALERTS_DATA.CSV ---

# --- DONOR PROFILE API: Merge donors_data.csv and donor_details.csv ---
import threading
import random
import time
# --- SIMULATION: Generate alerts every 5 minutes ---

import csv
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import math
import traceback
from flask_mail import Mail, Message



app = Flask(__name__)
# Allow all origins, all methods, and credentials for all routes
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, allow_headers="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

import json
def add_private_notification(donor_id, message):
    private_path = os.path.join(os.path.dirname(__file__), 'private_notifications.json')
    # Load existing notifications
    if os.path.exists(private_path):
        with open(private_path, 'r', encoding='utf-8') as f:
            all_private = json.load(f)
    else:
        all_private = {}
    # Add new notification
    all_private.setdefault(str(donor_id), []).insert(0, {
        'message': message,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    })
    # Keep only last 20 per donor
    all_private[str(donor_id)] = all_private[str(donor_id)][:20]
    with open(private_path, 'w', encoding='utf-8') as f:
        json.dump(all_private, f, ensure_ascii=False, indent=2)



# --- POLL HOSPITAL ALERTS API AND ADD TO DATA ---
import requests
def poll_hospital_alerts():  # Polling logic to fetch hospital requests from /api/request-blood and add to alerts_data.csv
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
    seen_alert_ids = set()
    existing_notification_messages = set()
    # Load existing alert_ids and notification messages
    if os.path.isfile(alerts_path) and os.stat(alerts_path).st_size > 0:
        with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                seen_alert_ids.add(row.get('alert_id'))
    notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
    if os.path.exists(notifications_path):
        with open(notifications_path, 'r', encoding='utf-8') as f:
            try:
                notifs = json.load(f)
                for n in notifs:
                    existing_notification_messages.add(n.get('message'))
            except Exception:
                pass
    while True:
        try:
            # Use GET to fetch hospital requests from the correct endpoint
            resp = requests.get('http://localhost:5004/api/blood-requests', timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                # Accept dict with 'blood_requests' key
                if isinstance(data, dict) and 'blood_requests' in data:
                    alerts = data['blood_requests']
                elif isinstance(data, list):
                    alerts = data
                else:
                    alerts = []
                for alert in alerts:
                    alert_id = alert.get('alert_id')
                    notif_message = f"{alert.get('hospital_name','')} ({alert.get('blood_bank_name','')}) requests {alert.get('units_needed','')} units of {alert.get('component','')} ({alert.get('blood_group','')}) [{alert.get('urgency','')}]"
                    if not alert_id or alert_id in seen_alert_ids:
                        continue
                    # Always add new hospital request notifications (do not skip on duplicate message)
                    seen_alert_ids.add(alert_id)
                    existing_notification_messages.add(notif_message)
                    # Add to alerts_data.csv
                    # Normalize status: treat 'SENT' as 'Pending' for frontend compatibility
                    status = alert.get('status', 'Pending')
                    if status.upper() == 'SENT':
                        status = 'Pending'
                    # Fetch bank_id from alert, fallback to '' if not present
                    bank_id = alert.get('bank_id', '')
                    alert_row = {
                        'alert_id': alert.get('alert_id',''),
                        'bank_id': bank_id,
                        'hospital_id': alert.get('hospital_id',''),
                        'hospital_name': alert.get('hospital_name',''),
                        'blood_group': alert.get('blood_group',''),
                        'component': alert.get('component',''),
                        'units_needed': str(alert.get('units_needed','')),
                        'urgency': alert.get('urgency',''),
                        'status': status,
                        'date': alert.get('date',''),
                        'time': alert.get('time',''),
                        'blood_group_id': alert.get('blood_group_id',''),
                        'component_id': alert.get('component_id','')
                    }
                    # Deduplicate by alert_id: keep only the latest (with bank_id if present)
                    existing_alerts = []
                    if os.path.isfile(alerts_path) and os.stat(alerts_path).st_size > 0:
                        with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
                            reader = csv.DictReader(csvfile)
                            for row in reader:
                                if row.get('alert_id') != alert_row['alert_id']:
                                    existing_alerts.append(row)
                    all_alerts = [alert_row] + existing_alerts
                    with open(alerts_path, 'w', newline='', encoding='utf-8') as csvfile:
                        writer = csv.DictWriter(csvfile, fieldnames=[
                            'alert_id','bank_id','hospital_id','hospital_name','blood_group','component','units_needed','urgency','status','date','time','blood_group_id','component_id'])
                        writer.writeheader()
                        writer.writerows(all_alerts)
                    # Add to notifications.json
                    notif = {
                        'type': 'Hospital Request',
                        'message': notif_message,
                        'timestamp': alert.get('date','') + ' ' + alert.get('time','')
                    }
                    notifs = []
                    if os.path.exists(notifications_path):
                        with open(notifications_path, 'r', encoding='utf-8') as f:
                            notifs = json.load(f)
                    notifs.insert(0, notif)
                    notifs = notifs[:20]
                    with open(notifications_path, 'w', encoding='utf-8') as f:
                        json.dump(notifs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[HOSPITAL ALERTS] Error polling hospital alerts: {e}")
        time.sleep(10)

# Start polling thread
def start_hospital_alerts_thread():
    t = threading.Thread(target=poll_hospital_alerts, daemon=True)
    t.start()

start_hospital_alerts_thread()

# --- HOSPITAL RESPONSE API ---
@app.route('/api/receive-eligibility', methods=['POST'])
def receive_eligibility():
    data = request.get_json()
    donor_id = str(data.get('donor_id'))
    eligibility = data.get('eligibility')
    # Only send confirmation if eligibility is 'yes' or True
    if eligibility in ['yes', 'Yes', True, 'true', 'True', 1]:
        # Load donor info
        donors = load_donors_from_csv()
        donor = next((d for d in donors if str(d.get('donor_id')) == donor_id), None)
        if donor and donor.get('email'):
            try:
                msg = Message(
                    subject="Donation Confirmed - Krithi's Blood Bank",
                    recipients=[donor['email']],
                    body=f"Dear {donor.get('name', 'Donor')},\n\nYour eligibility to donate has been confirmed! Please come to Krithi's Blood Bank at 123 Main Street, Bengaluru, Karnataka.\n\nThank you for your willingness to save lives!\n\n- Krithi's Blood Bank"
                )
                mail.send(msg)
                print(f"Confirmation email sent to {donor['email']}")
            except Exception as e:
                print(f"[EMAIL ERROR] Could not send confirmation: {e}")
        # Optionally, update donor status in a database or file if needed
        return jsonify({'status': 'success', 'message': 'Eligibility confirmed and email sent.'})
    return jsonify({'status': 'success', 'message': 'Eligibility updated, no email sent.'})

# --- POST RESPONSE TO HOSPITAL ALERT (MATCH BY BANK_ID) ---
@app.route('/api/hospital/alert/response', methods=['POST'])
def post_hospital_alert_response():
    data = request.get_json()
    alert_id = str(data.get('alert_id'))
    bank_id = str(data.get('bank_id'))
    hospital_id = str(data.get('hospital_id'))
    response = data.get('response')  # 'yes' or 'no'
    # Validate input
    if not (alert_id and bank_id and hospital_id and response):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400

    # Optionally, check if the alert exists and matches the bank_id and hospital_id
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    alert_found = False
    if os.path.isfile(alerts_path):
        with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['alert_id'] == alert_id and row.get('hospital_id') == hospital_id:
                    alert_found = True
                    break
    if not alert_found:
        return jsonify({'status': 'error', 'message': 'Alert not found for given hospital_id'}), 404

    # Record the response in hospital_response.csv
    response_path = os.path.join(os.path.dirname(__file__), 'hospital_response.csv')
    file_exists = os.path.isfile(response_path)
    with open(response_path, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['alert_id', 'hospital_id', 'bank_id', 'response', 'response_time']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            'alert_id': alert_id,
            'hospital_id': hospital_id,
            'bank_id': bank_id,
            'response': response,
            'response_time': time.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify({'status': 'success', 'message': 'Response recorded'})

@app.route('/api/hospital/response', methods=['POST'])
def hospital_response():
    data = request.get_json()
    alert_id = data.get('alert_id')
    hospital_id = data.get('hospital_id')
    # Always save 'yes' as the status for a completed response
    response_status = 'yes'
    response_time = time.strftime('%Y-%m-%d %H:%M:%S')
    response_path = os.path.join(os.path.dirname(__file__), 'hospital_response.csv')
    # Append response to CSV
    file_exists = os.path.isfile(response_path)
    with open(response_path, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['alert_id', 'hospital_id', 'status', 'response_time']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            'alert_id': alert_id,
            'hospital_id': hospital_id,
            'status': response_status,
            'response_time': response_time
        })

    # Update alerts_data.csv to mark the alert as Completed
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    updated_alerts = []
    alert_found = False
    if os.path.isfile(alerts_path):
        with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['alert_id'] == str(alert_id) and row['hospital_id'] == str(hospital_id):
                    row['status'] = 'Completed'
                    alert_found = True
                updated_alerts.append(row)
        if alert_found:
            with open(alerts_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=[
                    'alert_id','hospital_id','hospital_name','blood_group','component','units_needed','urgency','status','date','time','blood_group_id','component_id'])
                writer.writeheader()
                writer.writerows(updated_alerts)

    return jsonify({'status': 'success', 'message': 'Response recorded'})

# --- GET HOSPITAL RESPONSE BY HOSPITAL ID ---
@app.route('/api/hospital/response/<hospital_id>', methods=['GET'])
def get_hospital_response(hospital_id):
    response_path = os.path.join(os.path.dirname(__file__), 'hospital_response.csv')
    responses = []
    if os.path.isfile(response_path):
        with open(response_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['hospital_id'] == hospital_id:
                    responses.append(row)
    return jsonify({'status': 'success', 'responses': responses})

# --- NOTIFICATIONS ENDPOINT FOR DASHBOARD ---
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
    import json
    notifications = []
    try:
        if os.path.exists(notifications_path):
            with open(notifications_path, 'r', encoding='utf-8') as f:
                notifications = json.load(f)
        return jsonify({'status': 'success', 'notifications': notifications})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Helper to load donors from CSV
def load_donors_from_csv():
    donors = []
    csv_path = os.path.join(os.path.dirname(__file__), 'donors_data.csv')
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Parse lat/lon as float, donor_id as int
                try:
                    row['lat'] = float(row['lat'])
                    row['lon'] = float(row['lon'])
                except Exception:
                    row['lat'] = None
                    row['lon'] = None
                try:
                    row['donor_id'] = int(row['donor_id'])
                except Exception:
                    pass
                donors.append(row)
    except Exception as e:
        print(f"Error loading donors from CSV: {e}")
    return donors

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = ''      # <-- your email
app.config['MAIL_PASSWORD'] = ''         # <-- your app password
app.config['MAIL_DEFAULT_SENDER'] = '' # <-- your email

mail = Mail(app)

@app.route('/api/inventory/update', methods=['POST'])
def update_inventory():
    data = request.get_json()
    blood_group = data.get('blood_group')
    component = data.get('component')
    blood_group_id = str(data.get('blood_group_id'))
    component_id = str(data.get('component_id'))
    units_available = data.get('units_available')
    if not (blood_group and component and blood_group_id and component_id and units_available is not None):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
    inv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    updated_inventory = []
    found = False
    try:
        with open(inv_path, newline='', encoding='utf-8') as csvfile:
            reader = list(csv.DictReader(csvfile))
            for row in reader:
                if row['blood_group'] == blood_group and row['component'] == component and row['blood_group_id'] == blood_group_id and row['component_id'] == component_id:
                    row['units_available'] = str(units_available)
                    found = True
                updated_inventory.append(row)
        if not found:
            return jsonify({'status': 'error', 'message': 'Inventory row not found'}), 404
        with open(inv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=updated_inventory[0].keys())
            writer.writeheader()
            writer.writerows(updated_inventory)
        # --- Threshold notification logic ---
        # Define thresholds for each component (customize as needed)
        thresholds = {
            'Whole Blood': 5,
            'Plasma': 5,
            'Platelets': 5,
            'Packed Red Blood Cells': 5,
            'Fresh Frozen Plasma': 5,
            'RBC': 5,
            'Red Blood Cell': 5,
            'Leukoreduced RBC': 5,
            'Irradiated RBC': 5,
            'SAGM Packed Red Blood Cells': 5
        }
        # Normalize component name for threshold lookup
        comp_key = component.strip().lower()
        threshold = None
        for k, v in thresholds.items():
            if k.lower() in comp_key:
                threshold = v
                break
        if threshold is not None and int(units_available) < threshold:
            # Write notification to notifications.json
            notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
            import datetime
            import json
            now = datetime.datetime.now()
            timestamp = now.strftime('%b %d, %Y %I:%M %p')
            notif_msg = f"Low stock alert: {component} ({blood_group}) units dropped below threshold ({units_available} < {threshold})"
            new_notif = {
                "type": "Low Stock Alert",
                "message": notif_msg,
                "timestamp": timestamp
            }
            # Load, append, and save notifications
            try:
                if os.path.exists(notifications_path):
                    with open(notifications_path, 'r', encoding='utf-8') as f:
                        notifications = json.load(f)
                else:
                    notifications = []
                notifications.insert(0, new_notif)
                # Keep only last 50 notifications
                notifications = notifications[:50]
                with open(notifications_path, 'w', encoding='utf-8') as f:
                    json.dump(notifications, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"[NOTIFICATION] Error writing low stock notification: {e}")
        return jsonify({'status': 'success', 'message': 'Inventory updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    csv_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    alerts = []
    bank_id = request.args.get('bank_id')
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if bank_id:
                    # Only include alerts for this bank_id (string match)
                    if str(row.get('bank_id', '')) == str(bank_id):
                        alerts.append(row)
                else:
                    alerts.append(row)
        return jsonify({'status': 'success', 'alerts': alerts})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- INVENTORY API ---
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    csv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    inventory = []
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                inventory.append(row)
        return jsonify({'status': 'success', 'inventory': inventory})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- COMPLETE ALERT (RESOLVE & UPDATE INVENTORY) ---
@app.route('/api/alerts/complete', methods=['POST'])
def complete_alert():
    data = request.get_json()
    alert_id = str(data.get('alert_id'))
    units_used = int(data.get('units_used', 0))
    blood_group = data.get('blood_group')
    component = data.get('component')
    # Update alerts_data.csv
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    updated_alerts = []
    found = False
    try:
        with open(alerts_path, newline='', encoding='utf-8') as csvfile:
            reader = list(csv.DictReader(csvfile))
            for row in reader:
                if row['alert_id'] == alert_id:
                    row['status'] = 'Resolved'
                    found = True
                updated_alerts.append(row)
        if found:
            with open(alerts_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=updated_alerts[0].keys())
                writer.writeheader()
                writer.writerows(updated_alerts)
        else:
            return jsonify({'status': 'error', 'message': 'Alert not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

    # Update inventory_data.csv
    inv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    updated_inventory = []
    try:
        with open(inv_path, newline='', encoding='utf-8') as csvfile:
            reader = list(csv.DictReader(csvfile))
            for row in reader:
                if row['blood_group'] == blood_group and row['component'] == component:
                    row['units_available'] = str(max(0, int(row['units_available']) - units_used))
                updated_inventory.append(row)
        with open(inv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=updated_inventory[0].keys())
            writer.writeheader()
            writer.writerows(updated_inventory)
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Inventory update failed: ' + str(e)}), 500

    # Save completion response to bank_hospital_response.csv
    # Find bank_id for the completed alert (if available in alerts_data.csv)
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    bank_id = ''
    hospital_id_val = str(data.get('hospital_id', ''))  # Always extract from request data first
    if os.path.isfile(alerts_path):
        with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['alert_id'] == str(alert_id):
                    bank_id = row.get('bank_id', '')
                    # Prefer hospital_id from CSV if available
                    if row.get('hospital_id', ''):
                        hospital_id_val = row.get('hospital_id', '')
                    break
    # Save to bank_hospital_response.csv
    response_path = os.path.join(os.path.dirname(__file__), 'bank_hospital_response.csv')
    file_exists = os.path.isfile(response_path)
    with open(response_path, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['bank_id', 'hospital_id', 'response']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            'bank_id': bank_id,
            'hospital_id': hospital_id_val,
            'response': 'yes'
        })
    return jsonify({'status': 'success', 'message': 'Alert completed and inventory updated.'})
# API to fetch bank_id, hospital_id, response from bank_hospital_response.csv
@app.route('/api/bank-hospital-responses', methods=['GET'])
def get_bank_hospital_responses():
    response_path = os.path.join(os.path.dirname(__file__), 'bank_hospital_response.csv')
    responses = []
    if os.path.isfile(response_path):
        with open(response_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                responses.append({
                    'bank_id': row.get('bank_id', ''),
                    'hospital_id': row.get('hospital_id', ''),
                    'response': row.get('response', '')
                })
    return jsonify({'status': 'success', 'responses': responses})

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        remember_me = data.get('remember_me', False)

        # Path to CSV file (adjust if needed)
        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__),  'login_data.csv'))
        if not os.path.exists(csv_path):
            return jsonify({'status': 'error', 'message': 'Login data file not found'}), 500

        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['username'] == username and row['password'] == password:
                    # Optionally check remember_me if needed
                    return jsonify({'status': 'success', 'message': 'Login successful'})
        return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    try:
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat/2) * math.sin(dlat/2) + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2) * math.sin(dlon/2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        return distance
    except Exception as e:
        print(f"Error calculating distance: {e}")
        return 0

@app.route('/')
def home():
    return jsonify({
        "message": "Blood Bank API is running!", 
        "status": "success",
        "available_endpoints": [
            "POST /api/donors/map - Get donor data for map",
            "POST /api/donors/notify - Send donor notification"
        ]
    })

@app.route('/api/donors/map', methods=['POST', 'OPTIONS'])
def generate_donor_map():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        data = request.get_json()
        if not data:
            data = {}
        center_lat = float(data.get('latitude', 12.9716))
        center_lon = float(data.get('longitude', 77.5946))
        radius = float(data.get('radius', 5))
        blood_group_filter = data.get('bloodGroup', None)

        donors = load_donors_from_csv()
        print(f"Returning donors for center: ({center_lat}, {center_lon}), radius: {radius}km, blood group: {blood_group_filter}")

        # Filter and add nearby donors
        nearby_donors = []
        for donor in donors:
            if blood_group_filter and blood_group_filter != 'All' and donor['blood_group'] != blood_group_filter:
                continue
            if donor['lat'] is None or donor['lon'] is None:
                continue
            distance = calculate_distance(center_lat, center_lon, donor['lat'], donor['lon'])
            if distance <= radius:
                donor_with_distance = donor.copy()
                donor_with_distance['distance'] = f"{round(distance, 2)}km"
                nearby_donors.append(donor_with_distance)

        print(f"Found {len(nearby_donors)} nearby donors")

        return jsonify({
            'donors': nearby_donors,
            'status': 'success'
        })

    except Exception as e:
        print(f"Error generating donor data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/donors/notify', methods=['POST', 'OPTIONS'])
def notify_donor():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    try:
        data = request.get_json()
        donor_id = data.get('donor_id')
        message = data.get('message', 'Blood donation needed urgently!')

        donors = load_donors_from_csv()
        donor = next((d for d in donors if str(d.get('donor_id')) == str(donor_id)), None)
        if not donor:
            return jsonify({'status': 'error', 'message': 'Donor not found'}), 404

        # Send email
        msg = Message(
            subject="Urgent Blood Donation Needed",
            recipients=[donor['email']],
            body=f"Dear {donor['name']},\n\n{message}\n\nThank you for being a lifesaver!"
        )
        mail.send(msg)
        print(f"Email sent to {donor['email']}")

        # Store private notification for this donor
        add_private_notification(donor_id, message)
        return jsonify({'status': 'success', 'message': 'Notification sent'})
    except Exception as e:
        print(f"Error sending notification: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
# Endpoint to fetch private notifications for a donor
@app.route('/api/donors/<int:donor_id>/private_notifications', methods=['GET'])
def get_private_notifications(donor_id):
    try:
        private_path = os.path.join(os.path.dirname(__file__), 'private_notifications.json')
        if os.path.exists(private_path):
            with open(private_path, 'r', encoding='utf-8') as f:
                all_private = json.load(f)
            return jsonify({'status': 'success', 'notifications': all_private.get(str(donor_id), [])})
        return jsonify({'status': 'success', 'notifications': []})
    except Exception as e:
        print(f"Error fetching private notifications: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'status': 'error',
        'available_endpoints': [
            'GET / - API status',
            'POST /api/donors/map - Get donor data for map',
            'POST /api/donors/notify - Send donor notification'
        ]
    }), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({
        'error': 'Internal server error',
        'status': 'error'
    }), 500

if __name__ == '__main__':
    print("🩸 Starting Blood Bank Flask API...")
    print("📍 Available at: http://127.0.0.1:5002")
    print("🗺️  Map endpoint: http://127.0.0.1:5002/api/donors/map")
    print("📧 Notify endpoint: http://127.0.0.1:5002/api/donors/notify")
    app.run(debug=True, port=5002, host='127.0.0.1')
        


