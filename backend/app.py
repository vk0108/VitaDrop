
# Endpoint to store eligibility responses as a new CSV file

# Endpoint to update eligibility status for a donor

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
# Enable CORS for all /api/* endpoints and allow all origins
CORS(app, resources={r"/api/*": {"origins": "*"}})


# Use only donors_merged.csv
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DONORS_MERGED_PATH = os.path.join(BASE_DIR, 'donors_merged.csv')

ELIGIBILITY_RESPONSES_PATH = os.path.join(BASE_DIR, 'eligibility_responses.csv')
# Path for hospital eligibility responses
HOSPITAL_ELIGIBILITY_RESPONSES_PATH = os.path.join(BASE_DIR, 'hospital_eligibility_responses.csv')

# Endpoint to store eligibility responses for hospital requests
@app.route('/api/hospital/store-eligibility-response', methods=['POST'])
def hospital_store_eligibility_response():
    data = request.json
    donor_id = data.get('donor_id')
    eligibility = data.get('eligibility')  # should be 'yes' or 'no'
    if donor_id is None or eligibility not in ['yes', 'no']:
        return jsonify({'error': 'Invalid input'}), 400
    import csv
    # Ensure the directory exists
    os.makedirs(os.path.dirname(HOSPITAL_ELIGIBILITY_RESPONSES_PATH), exist_ok=True)
    file_exists = os.path.isfile(HOSPITAL_ELIGIBILITY_RESPONSES_PATH)
    with open(HOSPITAL_ELIGIBILITY_RESPONSES_PATH, 'a', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['donor_id', 'eligibility'])
        if not file_exists:
            writer.writeheader()
        writer.writerow({'donor_id': donor_id, 'eligibility': eligibility})
    return jsonify({'success': True, 'donor_id': donor_id, 'eligibility': eligibility})

# Endpoint for hospital to get eligibility response for a donor
@app.route('/api/hospital/get-eligibility-response', methods=['POST'])
def hospital_get_eligibility_response():
    data = request.json
    donor_id = data.get('donor_id')
    if donor_id is None:
        return jsonify({'error': 'Invalid input'}), 400
    import csv
    eligibility = None
    with open(HOSPITAL_ELIGIBILITY_RESPONSES_PATH, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if str(row['donor_id']) == str(donor_id):
                eligibility = row['eligibility']
                break
    if eligibility is None:
        return jsonify({'error': 'Eligibility not found for donor'}), 404
    return jsonify({'donor_id': donor_id, 'eligibility': eligibility})

@app.route('/api/store-eligibility-response', methods=['POST'])
def store_eligibility_response():
    data = request.json
    donor_id = data.get('donor_id')
    eligibility = data.get('eligibility')  # should be 'yes' or 'no'
    if donor_id is None or eligibility not in ['yes', 'no']:
        return jsonify({'error': 'Invalid input'}), 400
    # Append to eligibility_responses.csv
    import csv
    file_exists = os.path.isfile(ELIGIBILITY_RESPONSES_PATH)
    with open(ELIGIBILITY_RESPONSES_PATH, 'a', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['donor_id', 'eligibility'])
        if not file_exists:
            writer.writeheader()
        writer.writerow({'donor_id': donor_id, 'eligibility': eligibility})
    return jsonify({'success': True, 'donor_id': donor_id, 'eligibility': eligibility})

def load_data():
    merged = pd.read_csv(DONORS_MERGED_PATH)
    return merged

@app.route('/api/update-eligibility', methods=['POST'])
def update_eligibility():
    data = request.json
    donor_id = data.get('donor_id')
    eligibility = data.get('eligibility')  # should be 'yes' or 'no'
    if donor_id is None or eligibility not in ['yes', 'no']:
        return jsonify({'error': 'Invalid input'}), 400
    merged = load_data()
    donor_idx = merged.index[merged['donor_id'] == int(donor_id)].tolist()
    if not donor_idx:
        return jsonify({'error': 'Donor not found'}), 404
    idx = donor_idx[0]
    merged.at[idx, 'eligible'] = eligibility
    merged.to_csv(DONORS_MERGED_PATH, index=False)
    return jsonify({'success': True, 'donor_id': donor_id, 'eligible': eligibility})

@app.route('/api/donors', methods=['GET'])
def get_all_donors():
    merged = load_data()
    return jsonify(merged.to_dict(orient='records'))

@app.route('/api/receive-eligibility', methods=['POST'])
def receive_eligibility():
    data = request.json
    donor_id = data.get('donor_id')
    if donor_id is None:
        return jsonify({'error': 'Invalid input'}), 400
    import csv
    eligibility = None
    with open(ELIGIBILITY_RESPONSES_PATH, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if str(row['donor_id']) == str(donor_id):
                eligibility = row['eligibility']
                break
    if eligibility is None:
        return jsonify({'error': 'Eligibility not found for donor'}), 404
    return jsonify({'donor_id': donor_id, 'eligibility': eligibility})


@app.route('/api/donor/<int:donor_id>', methods=['GET'])
def get_donor_by_id(donor_id):
    merged = load_data()
    donor = merged[merged['donor_id'] == donor_id]
    if donor.empty:
        return jsonify({'error': 'Donor not found'}), 404
    return jsonify(donor.iloc[0].to_dict())


@app.route('/api/donor/login', methods=['POST'])
def donor_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    merged = load_data()
    donor_row = merged[merged['email'] == email]
    if donor_row.empty:
        return jsonify({'error': 'Email not found'}), 404
    donor_id = donor_row.iloc[0]['donor_id']
    if str(donor_row.iloc[0]['password']) != str(password):
        return jsonify({'error': 'Invalid password'}), 401
    donor_dict = donor_row.iloc[0].to_dict()
    response = {
        'donor_id': donor_dict['donor_id'],
        'name': donor_dict.get('name'),
        'blood_group': donor_dict.get('blood_group'),
        'total_donations': donor_dict.get('total_donation'),
        'last_donation_date': donor_dict.get('last_donated'),
        'first_donation_date': donor_dict.get('first_donation_date'),
        'dob': donor_dict.get('birthday'),
        'email': donor_dict.get('email'),
        'phone': donor_dict.get('phone'),
        'address': donor_dict.get('address'),
        'total_units': donor_dict.get('total_units_donated'),
        'profile': donor_dict
    }
    return jsonify(response)

# Dashboard endpoint

@app.route('/api/dashboard/<int:donor_id>', methods=['GET'])
def dashboard_data(donor_id):
    merged = load_data()
    donor = merged[merged['donor_id'] == donor_id]
    if donor.empty:
        return jsonify({'error': 'Donor not found'}), 404
    d = donor.iloc[0]
    import datetime
    last_donation = d.get('last_donated')
    next_eligible = None
    if last_donation:
        try:
            dt = datetime.datetime.strptime(str(last_donation), '%Y-%m-%d')
        except ValueError:
            try:
                dt = datetime.datetime.strptime(str(last_donation), '%d-%m-%Y')
            except Exception:
                dt = None
        if dt:
            next_eligible = (dt + datetime.timedelta(days=90)).strftime('%Y-%m-%d')
    # Convert all values to native Python types for JSON serialization
    blood_group = str(d.get('blood_group')) if d.get('blood_group') is not None else None
    total_donations = int(d.get('total_donation')) if d.get('total_donation') is not None else 0
    last_donation_date = str(last_donation) if last_donation is not None else None
    next_eligible_date = str(next_eligible) if next_eligible is not None else None
    return jsonify({
        'blood_group': blood_group,
        'total_donations': total_donations,
        'last_donation_date': last_donation_date,
        'next_eligible_date': next_eligible_date
    })

# Donation history endpoint

@app.route('/api/donation-history/<int:donor_id>', methods=['GET'])
def donation_history(donor_id):
    merged = load_data()
    donor = merged[merged['donor_id'] == donor_id]
    if donor.empty:
        return jsonify({'error': 'Donor not found'}), 404
    d = donor.iloc[0]
    import datetime
    total_donations = int(d.get('total_donation', 0))
    total_units = int(d.get('total_units_donated', 0))
    last_donation = d.get('last_donated')
    first_donation = d.get('first_donation_date')
    donation_list = []
    if first_donation and last_donation and total_donations > 0:
        try:
            first_dt = datetime.datetime.strptime(str(first_donation), '%Y-%m-%d')
            last_dt = datetime.datetime.strptime(str(last_donation), '%Y-%m-%d')
        except Exception:
            first_dt = last_dt = None
        if first_dt and last_dt:
            delta = (last_dt - first_dt) / (total_donations - 1) if total_donations > 1 else datetime.timedelta(days=0)
            for i in range(total_donations):
                date = (first_dt + i * delta).strftime('%d-%m-%Y')
                donation_list.append({
                    'date': date,
                    'location': 'City General Hospital',
                    'blood_group': d.get('blood_group'),
                    'units': total_units // total_donations if total_donations else 1,
                    'status': 'Completed'
                })
    return jsonify({
        'total_donations': total_donations,
        'total_units': total_units,
        'donations': donation_list
    })

# Profile endpoint

@app.route('/api/profile/<int:donor_id>', methods=['GET'])
def profile_data(donor_id):
    merged = load_data()
    donor = merged[merged['donor_id'] == donor_id]
    if donor.empty:
        return jsonify({'error': 'Donor not found'}), 404
    d = donor.iloc[0]
    import datetime
    first_donation = d.get('first_donation_date')
    years_active = None
    if first_donation:
        try:
            first_dt = datetime.datetime.strptime(str(first_donation), '%Y-%m-%d')
            years_active = datetime.datetime.now().year - first_dt.year
        except Exception:
            years_active = None
    # Convert all values to native Python types for JSON serialization
    username = str(d.get('name')) if d.get('name') is not None else None
    blood_group = str(d.get('blood_group')) if d.get('blood_group') is not None else None
    total_donations = int(d.get('total_donation')) if d.get('total_donation') is not None else 0
    years_active = int(years_active) if years_active is not None else None
    dob = str(d.get('birthday')) if d.get('birthday') is not None else None
    email = str(d.get('email')) if d.get('email') is not None else None
    phone = str(d.get('phone')) if d.get('phone') is not None else None
    address = str(d.get('address')) if d.get('address') is not None else None
    return jsonify({
        'username': username,
        'blood_group': blood_group,
        'total_donations': total_donations,
        'years_active': years_active,
        'dob': dob,
        'email': email,
        'phone': phone,
        'address': address
    })
if __name__ == '__main__':
    app.run(debug=True)

