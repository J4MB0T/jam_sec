---
title: "Phishing Detector"
date: 2024-09-11T22:28:27Z
draft: false
author: "James"
tags: 
  - "phishing"
  - "email"
summary: "Email Analysis Tool"
---



# Email Analysis Tool (WIP)

## Overview

The Email Analysis Tool is a Python-based application designed to process, analyze, and manage email data. Built using Flask, this application enables the upload of email files, conversion of these files to JSON, and the analysis of email headers for potential security issues. This README provides an in-depth explanation of the components and functions of the application, detailing their roles and importance.

## Components

### Flask Application Setup

```python
from flask import Flask, request, redirect, url_for, render_template, send_from_directory
import os
import logging
import subprocess
from concurrent.futures import ThreadPoolExecutor
from configparser import ConfigParser
import mysql.connector
import dkim
import spf
import dns.resolver
import requests
import whois
import re
from datetime import datetime, timedelta

# Setup logging
log_dir = 'logs'
os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(filename=os.path.join(log_dir, 'app.log'), level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'email_jsons'
app.config['JSON_FOLDER'] = 'json'
app.config['ARCHIVE_FOLDER'] = 'archive'

# Ensure the necessary folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['JSON_FOLDER'], exist_ok=True)
os.makedirs(app.config['ARCHIVE_FOLDER'], exist_ok=True)

# Thread pool executor for background tasks
executor = ThreadPoolExecutor(max_workers=3)
```

### Explanation

1. **Flask Setup**: 
   - Initializes the Flask application and sets up necessary configurations.
   - Defines folder paths for uploaded files, JSON files, and archived files.
   - Creates these folders if they do not exist.

2. **Logging**: 
   - Configures logging to capture events and errors, storing them in a 'logs' directory. 
   - Helps in debugging and monitoring the application’s activity.

3. **Thread Pool Executor**: 
   - Sets up a thread pool for executing background tasks, allowing the application to process files concurrently without blocking the main thread.

### Functions

#### `load_db_config` and `load_api_keys`

```python
def load_db_config(filename='config.ini', section='mysql'):
    parser = ConfigParser()
    parser.read(filename)
    db_config = {
        'user': parser.get(section, 'user'),
        'password': parser.get(section, 'password'),
        'host': parser.get(section, 'host'),
        'database': parser.get(section, 'database')
    }
    return db_config

def load_api_keys(filename='config.ini', section='api_keys'):
    parser = ConfigParser()
    parser.read(filename)
    api_keys = {
        'abuseipdb_key': parser.get(section, 'abuseipdb_key'),
        'virustotal_key': parser.get(section, 'virustotal_key')
    }
    return api_keys
```

**Explanation**:
- **`load_db_config`**: Loads database configuration parameters from `config.ini`. Essential for connecting to the MySQL database.
- **`load_api_keys`**: Loads API keys for external services (AbuseIPDB, VirusTotal) from `config.ini`. These keys are used for IP lookups.

#### `fetch_emails`

```python
def fetch_emails():
    db_config = load_db_config()
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor(dictionary=True)

    query = """
    SELECT id, message_id, in_reply_to, `references`, received, authentication_results, received_spf, dkim_signature, list_unsubscribe, `from`, `to`, date, subject, cc, bcc, body_text, body_html
    FROM emails
    """
    cursor.execute(query)
    emails = cursor.fetchall()

    cursor.close()
    cnx.close()

    return emails
```

**Explanation**:
- **`fetch_emails`**: Connects to the MySQL database and retrieves email records. It uses a SQL query to select all relevant columns from the `emails` table, facilitating the analysis of these records.

#### `analyze_email` and Related Functions

```python
def analyze_email(email):
    """Analyze the email header information for suspicious activity."""
    analysis = {
        'spf_result': parse_spf_result(email['authentication_results']),
        'dkim_result': parse_dkim_result(email['authentication_results']),
        'suspicious': False,
        'details': '',
        'ip_address': None,
        'ip_lookup_result': None,
        'domain_owner': None,
        'domain_created_recently': None,
        'ip_registration_date': None
    }

    spf_result = analysis['spf_result']
    ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', spf_result)
    if ip_match:
        ip_address = ip_match.group(1)
        analysis['ip_address'] = ip_address

        api_keys = load_api_keys()
        ip_lookup_result, domain_owner = perform_ip_lookup(ip_address, api_keys)
        analysis['ip_lookup_result'] = ip_lookup_result
        analysis['domain_owner'] = domain_owner

        domain = get_domain_from_ip(ip_address)
        domain_created_recently = check_domain_creation_date(domain)
        analysis['domain_created_recently'] = domain_created_recently
        analysis['ip_registration_date'] = get_ip_registration_date(ip_address)

    if not analysis['spf_result'] or not analysis['dkim_result']:
        analysis['suspicious'] = True
        analysis['details'] = 'SPF or DKIM check failed.'

    return analysis
```

**Explanation**:
- **`analyze_email`**: Analyzes the email’s SPF and DKIM results to determine its authenticity and safety. Extracts and verifies IP addresses, performs IP lookups, and checks domain creation dates.

#### `parse_spf_result`, `parse_dkim_result`, `check_dkim`

```python
def parse_spf_result(authentication_results):
    """Parse SPF result from the authentication results field."""
    spf_result = 'N/A'
    try:
        spf_prefix = 'spf='
        results = authentication_results.split(';')
        for result in results:
            result = result.strip()
            if result.startswith(spf_prefix):
                spf_result = result[len(spf_prefix):]
                break
    except Exception as e:
        logger.error(f"SPF result parsing error: {e}")
    return spf_result

def parse_dkim_result(authentication_results):
    """Parse DKIM result from the authentication results field."""
    dkim_result = 'N/A'
    try:
        dkim_prefix = 'dkim='
        results = authentication_results.split(';')
        for result in results:
            result = result.strip()
            if result.startswith(dkim_prefix):
                dkim_result = result[len(dkim_prefix):]
                break
    except Exception as e:
        logger.error(f"DKIM result parsing error: {e}")
    return dkim_result

def check_dkim(dkim_signature):
    """Check DKIM signature validity."""
    try:
        dkim_result = dkim.verify(dkim_signature.encode())
        return 'Pass' if dkim_result else 'Fail'
    except Exception as e:
        logger.error(f"DKIM check error: {e}")
        return 'Error'
```

**Explanation**:
- **`parse_spf_result` and `parse_dkim_result`**: Extract SPF and DKIM results from the authentication results string. These results are used to verify email authenticity.
- **`check_dkim`**: Verifies the DKIM signature to ensure the email has not been tampered with.

#### `perform_ip_lookup`, `get_domain_from_ip`, `lookup_domain_owner`, `check_domain_creation_date`, `get_ip_registration_date`

```python
def perform_ip_lookup(ip_address, api_keys):
    """Perform IP lookup using AbuseIPDB and VirusTotal."""
    abuseipdb_key = api_keys['abuseipdb_key']
    virustotal_key = api_keys['virustotal_key']

    # AbuseIPDB Lookup
    abuseipdb_url = f'https://api.abuseipdb.com/api/v2/check'
    abuseipdb_headers = {
        'Key': abuseipdb_key,
        'Accept': 'application/json'
    }
    abuseipdb_params = {
        'ipAddress': ip_address
    }
    abuseipdb_response = requests.get(abuseipdb_url, headers=abuseipdb_headers, params=abuseipdb_params)
    abuseipdb_data = abuseipdb_response.json()
    abuseipdb_result = f"AbuseIPDB Report: {abuseipdb_data.get('data', {}).get('abuseConfidenceScore', 'N/A')}% confidence score"
    
    # Extract domain and owner from AbuseIPDB if available
    abuseipdb_domain_owner = abuseipdb_data.get('data', {}).get('domain', 'N/A')

    # VirusTotal Lookup
    virustotal_url = f'https://www.virustotal.com/api/v3/ip_addresses/{ip_address}'
    virustotal_headers = {
        'x-apikey': virustotal_key
    }
    virustotal_response = requests.get(virustotal_url, headers=virustotal_headers)
    virustotal_data = virustotal_response.json()
    virustotal_result = f"VirusTotal Report: {virustotal_data

.get('data', {}).get('attributes', {}).get('last_analysis_stats', {}).get('malicious', 'N/A')} detections"

    return f"{abuseipdb_result}. {virustotal_result}", abuseipdb_domain_owner

def get_domain_from_ip(ip_address):
    """Get domain name from IP address."""
    try:
        reverse_dns = dns.resolver.resolve_address(ip_address)
        return reverse_dns[0].target.to_text()
    except Exception as e:
        logger.error(f"Reverse DNS lookup error: {e}")
        return 'N/A'

def lookup_domain_owner(domain):
    """Get domain owner information and registration date."""
    try:
        domain_info = whois.whois(domain)
        owner = domain_info.get('owner', 'N/A')
        reg_date = domain_info.get('creation_date', 'N/A')
        if isinstance(reg_date, list):
            reg_date = reg_date[0]
        return owner, reg_date
    except Exception as e:
        logger.error(f"Whois lookup error: {e}")
        return 'N/A', 'N/A'

def check_domain_creation_date(domain):
    """Check if the domain was created within the last 3 months."""
    try:
        domain_info = whois.whois(domain)
        creation_date = domain_info.get('creation_date')
        if creation_date:
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            return creation_date >= datetime.now() - timedelta(days=90)
        return False
    except Exception as e:
        logger.error(f"Domain creation date check error: {e}")
        return False

def get_ip_registration_date(ip_address):
    """Get IP registration date from ARIN."""
    try:
        url = f"https://whois.arin.net/rest/ip/{ip_address}"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            reg_date = data.get('net', {}).get('registrationDate', 'N/A')
            return reg_date
        return 'N/A'
    except Exception as e:
        logger.error(f"IP registration date lookup error: {e}")
        return 'N/A'
```

**Explanation**:
- **`perform_ip_lookup`**: Utilizes AbuseIPDB and VirusTotal APIs to gather information about an IP address, such as its abuse score and detection status.
- **`get_domain_from_ip`**: Retrieves the domain name associated with an IP address via reverse DNS lookup.
- **`lookup_domain_owner`**: Fetches ownership details and registration date of a domain using WHOIS information.
- **`check_domain_creation_date`**: Determines if a domain was recently created, which can be indicative of suspicious activity.
- **`get_ip_registration_date`**: Obtains the IP registration date from ARIN, useful for assessing the IP's history.

### Routes

#### `/`

```python
@app.route('/')
def index():
    return render_template('index.html')
```

**Explanation**:
- **`index`**: Renders the home page of the application, allowing users to navigate to upload and view results pages.

#### `/upload`

```python
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'email_file' not in request.files or request.files['email_file'].filename == '':
        return 'No file selected', 400

    email_file = request.files['email_file']
    email_filename = email_file.filename.replace(" ", "_")

    eml_path = os.path.join(app.config['UPLOAD_FOLDER'], email_filename)
    email_file.save(eml_path)
    logger.info(f"Uploaded file saved to {eml_path}")

    # Process the file in a background thread
    json_filename = os.path.join(app.config['JSON_FOLDER'], email_filename.replace(".eml", ".json"))
    executor.submit(run_eml_to_json_script, eml_path, json_filename)

    return redirect(url_for('upload_complete'))
```

**Explanation**:
- **`upload_file`**: Handles file uploads, saving the email file and initiating background processing to convert the file to JSON format.

#### `/upload_complete`

```python
@app.route('/upload_complete')
def upload_complete():
    return render_template('upload_complete.html')
```

**Explanation**:
- **`upload_complete`**: Displays a confirmation page after a file is successfully uploaded and processed.

#### `/view_results`

```python
@app.route('/view_results')
def view_results():
    emails = fetch_emails()

    # Analyze email headers
    for email in emails:
        email['analysis'] = analyze_email(email)
    
    # Render the results in a new template (results.html)
    return render_template('results.html', emails=emails)
```

**Explanation**:
- **`view_results`**: Fetches and analyzes email records, then renders the results on a results page, providing insights into email security.

#### `/email_jsons/<filename>`, `/json/<filename>`, `/archive/<filename>`

```python
@app.route('/email_jsons/<filename>')
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/json/<filename>')
def download_json(filename):
    return send_from_directory(app.config['JSON_FOLDER'], filename)

@app.route('/archive/<filename>')
def download_archive(filename):
    return send_from_directory(app.config['ARCHIVE_FOLDER'], filename)
```

**Explanation**:
- **`download_file`**, **`download_json`**, **`download_archive`**: Provide endpoints for downloading files from the upload, JSON, and archive directories, respectively.

## Running the Application

To run the application, execute the following command:

```sh
python app.py
```

Ensure that you have Flask installed and all necessary configuration files are in place. The application will be accessible at `http://localhost:5000`.

## Conclusion

This application provides a comprehensive tool for analyzing email headers and managing email files. By integrating various APIs and performing thorough checks, it aims to enhance email security and provide valuable insights into potentially suspicious activities.

