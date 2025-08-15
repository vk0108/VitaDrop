# --- API to fetch all blood requests from blood_requests.csv ---
import threading
import random
import time
# --- SIMULATION: Generate alerts every 5 minutes ---

import csv
import os
from flask import Flask, jsonify, request, make_response
import math
import traceback
from flask_mail import Mail, Message
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000","http://localhost:3004"]}})
# Add CORS headers to all responses
# --- Helper to append outgoing donor alert messages to a JSON outbox ---
def append_donor_alert_outbox(donor_id, message):
    outbox_path = os.path.join(os.path.dirname(__file__), 'donor_alerts_outbox.json')
    import json
    import time
    # Always try to create the file if it doesn't exist
    try:
        if os.path.exists(outbox_path):
            with open(outbox_path, 'r', encoding='utf-8') as f:
                try:
                    outbox = json.load(f)
                except Exception:
                    outbox = []
        else:
            outbox = []
        # Append new message
        outbox.append({
            'donor_id': donor_id,
            'message': message,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        })
        # Write back to file (create if not exists)
        with open(outbox_path, 'w', encoding='utf-8') as f:
            json.dump(outbox, f, ensure_ascii=False, indent=2)
    except Exception as e:
        # If file doesn't exist or can't be created, try to create it from scratch
        try:
            outbox = [{
                'donor_id': donor_id,
                'message': message,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }]
            with open(outbox_path, 'w', encoding='utf-8') as f:
                json.dump(outbox, f, ensure_ascii=False, indent=2)
        except Exception as e2:
            print(f"[ERROR] Could not create donor_alerts_outbox.json: {e2}")
@app.route('/api/donors/<int:donor_id>/post-alert', methods=['POST', 'OPTIONS'])
def post_alert_to_donor(donor_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    try:
        data = request.get_json()
        message = data.get('message', 'Urgent blood donation needed! Please contact us if you are available to donate.')
        # Add to private notifications (local donor system)
        add_private_notification(str(donor_id), message)
        # Also append to outbox for cross-system delivery
        append_donor_alert_outbox(str(donor_id), message)
        return jsonify({'status': 'success', 'message': f'Alert posted to donor {donor_id} and queued for delivery.'})
    except Exception as e:
        print(f"Error in /api/donors/{donor_id}/post-alert: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
import json
# --- PRIVATE NOTIFICATIONS FOR DONORS ---
@app.route('/api/blood-requests', methods=['GET'])
def get_blood_requests():
    csv_path = os.path.join(os.path.dirname(__file__), 'blood_requests.csv')
    requests_list = []
    try:
        if os.path.isfile(csv_path) and os.stat(csv_path).st_size > 0:
            with open(csv_path, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    requests_list.append(row)
        return jsonify({'status': 'success', 'blood_requests': requests_list})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
@app.route('/api/low-stock-count', methods=['GET'])
def get_low_stock_count():
    inv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    count = 0
    try:
        if os.path.isfile(inv_path) and os.stat(inv_path).st_size > 0:
            with open(inv_path, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    try:
                        if int(row.get('units_available', 0)) < 5:
                            count += 1
                    except Exception:
                        continue
        return jsonify({'status': 'success', 'low_stock': count})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'low_stock': 0}), 500
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
import requests


@app.route('/api/accepted-donors-count', methods=['GET'])
def get_accepted_donors_count():
    responses_path = os.path.join(os.path.dirname(__file__), 'bb_responses.csv')
    count = 0
    try:
        if os.path.isfile(responses_path) and os.stat(responses_path).st_size > 0:
            with open(responses_path, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    if str(row.get('status', '')).strip().upper() == 'ACCEPTED':
                        count += 1
        return jsonify({'status': 'success', 'accepted_donors': count})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'accepted_donors': 0}), 500

@app.after_request
def add_cors_headers(response):
    allowed_origins = ['http://localhost:3000', 'http://localhost:3004']
    origin = request.headers.get('Origin')
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = allowed_origins[0]  # fallback for dev
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

from flask import make_response

@app.route('/api/request-blood', methods=['POST', 'OPTIONS'])
def request_blood():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3004'
        response.headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    try:
        data = request.get_json()
        # Example expected data: {hospital_name, blood_bank_name, phone, distance, blood_group, units_needed, urgency, component, bank_id}
        hospital_name = data.get('hospital_name', "Shree's Hospital")
        blood_bank_name = data.get('blood_bank_name', "Krithi's Blood Bank")
        phone = data.get('phone', '+91-9000000000')
        distance = data.get('distance', '1.5')
        blood_group = data.get('blood_group', 'A+')
        units_needed = str(data.get('units_needed', 1))
        urgency = data.get('urgency', 'High')
        component = data.get('component', 'Whole Blood')
        bank_id = str(data.get('bank_id', '21')).strip()
        # If bank_id is missing or empty, look it up from bloodbanks_data.csv using blood_bank_name
        if not bank_id:
            banks_path = os.path.join(os.path.dirname(__file__), 'bloodbanks_data.csv')
            if os.path.isfile(banks_path):
                with open(banks_path, newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        # Match on 'name' column in bloodbanks_data.csv
                        if row.get('name', '').strip() == blood_bank_name.strip():
                            bank_id = str(row.get('bank_id', '')).strip()
                            break
        # Fallback: if still no bank_id, use id from frontend if present
        if not bank_id and 'id' in data:
            bank_id = str(data['id']).strip()
        # Final fallback: if still no bank_id, use blood_bank_name
        if not bank_id:
            bank_id = blood_bank_name.replace(' ', '_')
        hospital_id = str(data.get('hospital_id', '99')).strip()
        status = 'SENT'
        date = time.strftime('%b %d, %Y')
        time_str = time.strftime('%I:%M %p')
        alert_id = str(int(time.time() * 1000))
        # Store request in a new CSV file: blood_requests.csv
        req_csv_path = os.path.join(os.path.dirname(__file__), 'blood_requests.csv')
        req_row = {
            'alert_id': alert_id,
            'hospital_id': hospital_id,
            'hospital_name': hospital_name,
            'blood_bank_name': blood_bank_name,
            'bank_id': bank_id,
            'phone': phone,
            'distance': distance,
            'blood_group': blood_group,
            'component': component,
            'units_needed': units_needed,
            'urgency': urgency,
            'status': status,
            'date': date,
            'time': time_str
        }
        # Write header if file does not exist
        write_header = not os.path.isfile(req_csv_path) or os.stat(req_csv_path).st_size == 0
        import csv
        with open(req_csv_path, 'a', newline='', encoding='utf-8') as csvfile:
            fieldnames = list(req_row.keys())
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            if write_header:
                writer.writeheader()
            writer.writerow(req_row)
        # Return response as before
        response_data = req_row
        return jsonify({'status': 'success', 'message': 'Blood request sent and stored.', 'request': response_data})
    except Exception as e:
        print(f"Error in /api/request-blood: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
# --- API to update alert status (FAILED/RESOLVED) ---
@app.route('/api/alerts/update-status', methods=['POST'])
def update_alert_status():
    try:
        data = request.get_json()
        alert_id = str(data.get('alert_id'))
        new_status = data.get('status')
        if new_status not in ['FAILED', 'RESOLVED']:
            return jsonify({'status': 'error', 'message': 'Invalid status'}), 400
        responses_path = os.path.join(os.path.dirname(__file__), 'bb_responses.csv')
        updated_alerts = []
        found = False
        if os.path.isfile(responses_path) and os.stat(responses_path).st_size > 0:
            with open(responses_path, newline='', encoding='utf-8') as csvfile:
                reader = list(csv.DictReader(csvfile))
                for row in reader:
                    if row['alert_id'] == alert_id:
                        row['status'] = new_status
                        found = True
                    updated_alerts.append(row)
        if found:
            with open(responses_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=updated_alerts[0].keys())
                writer.writeheader()
                writer.writerows(updated_alerts)
            # If status is ACCEPTED, send confirmation email to donor
            if new_status == 'ACCEPTED':
                # Find donor email from donors_data.csv
                donor_id = None
                for row in updated_alerts:
                    if row['alert_id'] == alert_id:
                        donor_id = row.get('donor_id') or row.get('donorId')
                        break
                if donor_id:
                    # Load donor info
                    donors = []
                    donors_path = os.path.join(os.path.dirname(__file__), 'donors_data.csv')
                    if os.path.isfile(donors_path):
                        with open(donors_path, newline='', encoding='utf-8') as csvfile:
                            reader = csv.DictReader(csvfile)
                            for d in reader:
                                if str(d.get('donor_id')) == str(donor_id):
                                    donors.append(d)
                    if donors:
                        donor = donors[0]
                        try:
                            msg = Message(
                                subject="Blood Donation Confirmed - Shree's Hospital",
                                recipients=[donor['email']],
                                body=f"Dear {donor['name']},\n\nYour eligibility has been confirmed! Please come to Shree's Hospital at 123 Main Street, City Center, Bengaluru, Karnataka.\n\nThank you for your willingness to donate and save lives!\n\n- Shree's Hospital Team"
                            )
                            mail.send(msg)
                            print(f"Confirmation email sent to {donor['email']}")
                        except Exception as e:
                            print(f"[CONFIRM EMAIL] Error sending confirmation: {e}")
            return jsonify({'status': 'success', 'message': f'Alert status updated to {new_status}.'})
        else:
            return jsonify({'status': 'error', 'message': 'Alert not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/api/transactions', methods=['GET', 'OPTIONS'])
def get_transactions():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3004'
        response.headers['Access-Control-Allow-Methods'] = 'GET,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'transactions.csv')
        if not os.path.exists(csv_path):
            response = jsonify({'status': 'error', 'message': 'transactions.csv not found'})
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3004'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response, 404
        import csv
        transactions = []
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                transactions.append(row)
        response = jsonify(transactions)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3004'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    except Exception as e:
        print(f"Error reading transactions: {str(e)}")
        response = jsonify({'status': 'error', 'message': str(e)})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3004'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500

def simulate_alerts_background():
    blood_groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    components = ['Whole Blood', 'Plasma', 'Platelets', 'RBC']
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
    while True:
        now = time.strftime('%Y-%m-%d %H:%M:%S')
        blood_group = random.choice(blood_groups)
        component = random.choice(components)
        units = random.randint(1, 5)
        alert_id = str(int(time.time() * 1000))
        # Simulate a real hospital row
        hospital_id = str(random.randint(1, 20))
        hospital_name = f"Hospital {hospital_id}"
        urgency = random.choice(['Critical', 'Urgent', 'Normal'])
        status = 'Pending'
        date = time.strftime('%d-%m-%Y')
        time_str = time.strftime('%H:%M')
        blood_group_id = str(random.randint(1, 8))
        component_id = str(random.randint(1, 5))
        alert_row = {
            'alert_id': alert_id,
            'hospital_id': hospital_id,
            'hospital_name': hospital_name,
            'blood_group': blood_group,
            'component': component,
            'units_needed': str(units),
            'urgency': urgency,
            'status': status,
            'date': date,
            'time': time_str,
            'blood_group_id': blood_group_id,
            'component_id': component_id
        }
        # Prepend to alerts_data.csv and remove unwanted rows
        try:
            import csv
            # Read all existing alerts
            existing_alerts = []
            if os.path.isfile(alerts_path) and os.stat(alerts_path).st_size > 0:
                with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        # Only keep rows that have all required hospital columns
                        if all(k in row and row[k] for k in ['alert_id','hospital_id','hospital_name','blood_group','component','units_needed','urgency','status','date','time','blood_group_id','component_id']):
                            existing_alerts.append(row)
            # Prepend new alert
            all_alerts = [alert_row] + existing_alerts
            with open(alerts_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=[
                    'alert_id','hospital_id','hospital_name','blood_group','component','units_needed','urgency','status','date','time','blood_group_id','component_id'])
                writer.writeheader()
                writer.writerows(all_alerts)
        except Exception as e:
            print(f"[SIM ALERT] Error writing alert: {e}")
        # Also add to notifications
        notif = {
            'type': 'Hospital Request',
            'message': f"{hospital_name} requests {units} units of {component} ({blood_group}) [{urgency}]",
            'timestamp': now
        }
        # Write notification to notifications.json (keep only last 20)
        try:
            import json
            notifs = []
            if os.path.exists(notifications_path):
                with open(notifications_path, 'r', encoding='utf-8') as f:
                    notifs = json.load(f)
            notifs.insert(0, notif)
            notifs = notifs[:20]
            with open(notifications_path, 'w', encoding='utf-8') as f:
                json.dump(notifs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[SIM ALERT] Error writing notification: {e}")
        time.sleep(300)  # 5 minutes

# Start simulation in background
# def start_simulation_thread():
#     t = threading.Thread(target=simulate_alerts_background, daemon=True)
#     t.start()
#
# start_simulation_thread()  # Disabled: stops automatic hospital request generation
# Start background thread for processing bank-hospital-responses
# (Removed start_bank_response_thread and background processing)
# start_bank_response_thread()  # Disabled: stops automatic background processing
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
app.config['MAIL_USERNAME'] = 'krithikavenkates@gmail.com'      # <-- your email
app.config['MAIL_PASSWORD'] = 'vphf qqgh nfsg kcqt'         # <-- your app password
app.config['MAIL_DEFAULT_SENDER'] = 'krithikavenkates@gmail.com'

mail = Mail(app)
@app.route('/api/bloodbanks', methods=['GET'])
def get_bloodbanks():
    csv_path = os.path.join(os.path.dirname(__file__), 'bloodbanks_data.csv')
    bloodbanks = []
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Parse lat/lon as float, bank_id as int
                try:
                    row['lat'] = float(row['lat'])
                    row['lon'] = float(row['lon'])
                except Exception:
                    row['lat'] = None
                    row['lon'] = None
                try:
                    row['bank_id'] = int(row['bank_id'])
                except Exception:
                    pass
                bloodbanks.append(row)
        return jsonify({'status': 'success', 'bloodbanks': bloodbanks})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
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
        return jsonify({'status': 'success', 'message': 'Inventory updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    # Read alerts from alerts_data.csv
    csv_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    alerts = []
    try:
        if os.path.isfile(csv_path) and os.stat(csv_path).st_size > 0:
            with open(csv_path, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
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

    return jsonify({'status': 'success', 'message': 'Alert completed and inventory updated.'})

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
            response_data = {'status': 'error', 'message': 'Donor not found'}
            # Write response to JSON file
            _write_donor_notification_response(donor_id, response_data)
            return jsonify(response_data), 404

        # Send email
        msg = Message(
            subject="Urgent Blood Donation Needed",
            recipients=[donor['email']],
            body=(
            f"Dear {donor['name']},\n\n"
            f"{message}\n\n"
            f'Please <a href="http://localhost:3000/">Login</a> for more details.\n\n'
            f"Thank you for being a lifesaver!\n"
            ),
            html=(
            f"<p>Dear {donor['name']},</p>"
            f"<p>{message}</p>"
            f'<p>Please <a href="http://localhost:3000/">Login</a> for more details.</p>'
            f"<p>Thank you for being a lifesaver!</p>"
            )
        )
        mail.send(msg)
        print(f"Email sent to {donor['email']}")

        response_data = {
            'status': 'success',
            'message': 'Notification sent',
            'donor_id': donor_id,
            'notification_message': message
        }
        # Write response to JSON file
        _write_donor_notification_response(donor_id, response_data)
        return jsonify(response_data)
    except Exception as e:
        response_data = {'status': 'error', 'message': str(e)}
        _write_donor_notification_response(data.get('donor_id', 'unknown'), response_data)
        print(f"Error sending notification: {str(e)}")
        return jsonify(response_data), 500

# --- Helper to write notification response to JSON file ---
def _write_donor_notification_response(donor_id, response_data):
    import json
    import time
    file_path = os.path.join(os.path.dirname(__file__), 'donor_notification_responses.json')
    # Load existing
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                all_responses = json.load(f)
            except Exception:
                all_responses = {}
    else:
        all_responses = {}
    # Store by donor_id, keep only last response
    entry = {
        'response': response_data,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    # If the response is success and has a notification_message, also store the notification message
    if response_data.get('status') == 'success' and response_data.get('notification_message'):
        entry['notification'] = {
            'message': response_data['notification_message'],
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    all_responses[str(donor_id)] = entry
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(all_responses, f, ensure_ascii=False, indent=2)

# --- API to fetch latest notification response for a donor ---
@app.route('/api/donors/<int:donor_id>/notification-response', methods=['GET'])
def get_donor_notification_response(donor_id):
    import json
    file_path = os.path.join(os.path.dirname(__file__), 'donor_notification_responses.json')
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                all_responses = json.load(f)
                resp = all_responses.get(str(donor_id))
                if resp:
                    return jsonify({'status': 'success', 'data': resp})
                else:
                    return jsonify({'status': 'error', 'message': 'No response found for donor'}), 404
            except Exception as e:
                return jsonify({'status': 'error', 'message': str(e)}), 500
    else:
        return jsonify({'status': 'error', 'message': 'No responses file found'}), 404

    # --- API to send alert to a donor (from donor system itself) ---
@app.route('/api/donors/send-alert', methods=['POST', 'OPTIONS'])
def send_alert_to_donor():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    try:
        data = request.get_json()
        donor_id = str(data.get('donor_id'))
        message = data.get('message', 'Urgent blood donation needed! Please contact us if you are available to donate.')
        if not donor_id:
            return jsonify({'status': 'error', 'message': 'Missing donor_id'}), 400
        add_private_notification(donor_id, message)
        return jsonify({'status': 'success', 'message': 'Alert sent to donor.'})
    except Exception as e:
        print(f"Error in /api/donors/send-alert: {e}")
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
    print("📍 Available at: http://127.0.0.1:5004")
    print("🗺️  Map endpoint: http://127.0.0.1:5004/api/donors/map")
    print("📧 Notify endpoint: http://127.0.0.1:5004/api/donors/notify")
    app.run(debug=True, port=5004, host='127.0.0.1')
