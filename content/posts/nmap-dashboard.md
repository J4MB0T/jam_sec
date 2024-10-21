---
title: "Nmap Dashboard Creation"
date: 2024-08-26T20:47:22Z
draft: false
author: "James"
tags: 
  - "Nmap"
  - "Network Scanner"
summary: "How I created an Nmap scanner to display results in a webpage"
---

## Creating the App
```
from flask import Flask, render_template
import pymysql

app = Flask(__name__)

# Database connection
def get_db_connection():
    connection = pymysql.connect(
        host='localhost',
        user='USER',
        password='PASSWORD',
        database='nmap_scans',
        cursorclass=pymysql.cursors.DictCursor
    )
    return connection

@app.route('/')
def index():
    connection = get_db_connection()
    cursor = connection.cursor()
    
    # Fetch scan results
    cursor.execute('SELECT * FROM scans ORDER BY scanned_at DESC')
    scans = cursor.fetchall()
    
    connection.close()
    return render_template('index.html', scans=scans)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```    

## Create the Nmap scanner
```
import pymysql
import subprocess
import json

# Database connection
connection = pymysql.connect(
    host='localhost',
    user='USER',
    password='PASSWORD',
    database='nmap_scans',
    cursorclass=pymysql.cursors.DictCursor
)

def parse_nmap_output(output):
    # Dummy parser - you need to parse your nmap output appropriately
    results = {
        'ip': '',
        'hostname': '',
        'status': '',
        'os_detection': '',
        'service_versions': '',
        'open_ports': '',
        'services': '',
        'scan_type': '',
        'traceroute': '',
    }
    # Parse your actual nmap output here
    return results

def insert_scan_results(results):
    try:
        with connection.cursor() as cursor:
            sql = """INSERT INTO scan_results 
                     (ip, hostname, status, os_detection, service_versions, open_ports, services, scan_type, traceroute)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (results['ip'], results['hostname'], results['status'],
                                 results['os_detection'], results['service_versions'],
                                 results['open_ports'], results['services'],
                                 results['scan_type'], results['traceroute']))
        connection.commit()
    finally:
        connection.close()

# Run the nmap scan
nmap_command = "nmap -A -T4 -p- 192.168.1.0/24"
result = subprocess.run(nmap_command, shell=True, capture_output=True, text=True)

# Parse and insert results
scan_results = parse_nmap_output(result.stdout)
insert_scan_results(scan_results)
```

## SQL Database

Login to the database:

```mysql -u USER -p```

Connect the to the required table:

```USE nmap_scans;```

Add the following fields:

```Add the required fields:
CREATE TABLE scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45),                  -- IP address (supports both IPv4 and IPv6)
    status VARCHAR(20),              -- Host status (e.g., up or down)
    os VARCHAR(100),                 -- Detected operating system
    ports TEXT,                      -- Open ports (list of ports)
    services TEXT,                   -- Services running on the open ports
    scan_type VARCHAR(50),           -- Type of scan (e.g., full scan, version scan)
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Timestamp of when the scan was performed
);
```
Added these extra fields later:

```ALTER TABLE scans
ADD COLUMN hostname VARCHAR(255),                  -- Hostname from reverse DNS resolution
ADD COLUMN os_detection TEXT,                      -- Detailed OS detection results
ADD COLUMN service_versions TEXT,                   -- Versions of detected services
ADD COLUMN traceroute TEXT,                         -- Traceroute information
ADD COLUMN hostnames TEXT;                          -- Additional hostnames (if multiple)```

And exit:
```
```EXIT;```


## Create the webpage in /templates/index.html

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nmap Scan Results</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f0f8ff;
            color: #333;
            text-align: center;
            margin: 0;
            padding: 0;
        }
        h1 {
            background: linear-gradient(90deg, #ff6f61, #ffcc00);
            color: white;
            padding: 20px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            border-radius: 0 0 10px 10px;
            margin-bottom: 20px;
        }
        table {
            margin: 20px auto;
            border-collapse: collapse;
            width: 90%;
            max-width: 1200px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            background-color: white;
        }
        th, td {
            padding: 15px;
            border: 1px solid #ddd;
        }
        th {
            background-color: #ff6f61;
            color: white;
            text-transform: uppercase;
            font-size: 1.1em;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #ffcc00;
            cursor: pointer;
            transform: scale(1.02);
            transition: transform 0.3s ease;
        }
        td {
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <h1>Nmap Scan Results</h1>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>IP Address</th>
                <th>Hostname</th>
                <th>Status</th>
                <th>OS Detection</th>
                <th>Service Versions</th>
                <th>Open Ports</th>
                <th>Services</th>
                <th>Scan Type</th>
                <th>Traceroute</th>
                <th>Scanned At</th>
            </tr>
        </thead>
        <tbody>
            {% for scan in scans %}
            <tr>
                <td>{{ scan.id }}</td>
                <td>{{ scan.ip }}</td>
                <td>{{ scan.hostname }}</td>
                <td>{{ scan.status }}</td>
                <td>{{ scan.os_detection }}</td>
                <td>{{ scan.service_versions }}</td>
                <td>{{ scan.open_ports }}</td>
                <td>{{ scan.services }}</td>
                <td>{{ scan.scan_type }}</td>
                <td>{{ scan.traceroute }}</td>
                <td>{{ scan.scanned_at }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
</body>
</html>
```

## Run the Nmap scanner then the webserver

```python3 nmap_scan.py```

```python3 app.py```

## Find the port scan in Splunk

```
index=* sourcetype="pfsense:filterlog"
| stats count by src_ip, dest_ip, dest_port
| eventstats dc(dest_port) as port_count by src_ip, dest_ip
| where port_count > 20
| table src_ip, dest_ip, port_count
| sort -port_count
```