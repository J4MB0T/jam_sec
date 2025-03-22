---
title: "Splunk SSH Alert"
date: 2025-03-16T22:52:55+07:00
draft: true
author: "James"
tags: ["Splunk", "SSH", "Security", "SIEM", "Monitoring", "Logging", "Slack Alerts", "Cybersecurity", "Automation", "Incident Response"]
summary: "Learn how to configure Splunk to detect successful SSH logins and send formatted alerts to Slack."
---

## 🚀 Introduction
Monitoring SSH login activity is crucial for security. This guide walks you through setting up a **Splunk alert** that detects **successful SSH logins** and sends **formatted Slack notifications** with useful details like user, source IP, destination host, authentication method, and timestamp.

---

## 🎯 Splunk Query to Detect Successful SSH Logins
We use a **Splunk search query** to detect successful SSH logins from `/var/log/auth.log`.

```spl
index=* "Accepted password for" OR "Accepted publickey for" source="/var/log/auth.log" 
| rex field=_raw "Accepted (?<auth_method>\w+) for (?<user>\w+) from (?<ip>[\d\.]+) port (?<port>\d+)"   
| eval formatted_time=strftime(_time, "%Y-%m-%d %H:%M:%S") 
| table formatted_time host user ip auth_method port  
| eval slack_message="🚀 *Successful SSH Login Alert*\n👤 *User:* `".user."`\n🖥️ *DEST Host:* `".host."`\n🌐 *SRC IP:* `".ip."`\n🔑 *Method:* `".auth_method."`\n⏰ *Time:* `".formatted_time."`"


### 📝 Explanation:

- **Filters logs** to find SSH logins (**password/public key authentication**).
- **Extracts key details** using `rex` (**regex extraction**):  
  - 🔹 `user`: **Username**  
  - 🌐 `ip`: **Source IP**  
  - 🔑 `auth_method`: **Authentication method**  
  - 🖥️ `host`: **Destination machine**  
- **Formats the timestamp** into `YYYY-MM-DD HH:MM:SS` using `strftime()`.
- **Constructs the Slack message** with **emojis for better readability**.








## 🚀 Introduction
Monitoring SSH login activity is crucial for security. This guide walks you through setting up a **Splunk alert** that detects **successful SSH logins** and sends **formatted Slack notifications** with useful details like user, source IP, destination host, authentication method, and timestamp.

---

## 🎯 Splunk Query to Detect Successful SSH Logins
We use a **Splunk search query** to detect successful SSH logins from `/var/log/auth.log`.

```spl
index=* "Accepted password for" OR "Accepted publickey for" source="/var/log/auth.log" 
| rex field=_raw "Accepted (?<auth_method>\w+) for (?<user>\w+) from (?<ip>[\d\.]+) port (?<port>\d+)"   
| eval formatted_time=strftime(_time, "%Y-%m-%d %H:%M:%S") 
| table formatted_time host user ip auth_method port  
| eval slack_message="🚀 *Successful SSH Login Alert*\n👤 *User:* `".user."`\n🖥️ *DEST Host:* `".host."`\n🌐 *SRC IP:* `".ip."`\n🔑 *Method:* `".auth_method."`\n⏰ *Time:* `".formatted_time."`"
📝 Explanation:
Filters logs to find SSH logins (password/public key authentication).
Extracts key details using rex (regex extraction):
user: Username
ip: Source IP
auth_method: Authentication method
host: Destination machine
Formats the timestamp into YYYY-MM-DD HH:MM:SS using strftime().
Constructs the Slack message with emojis for better readability.
🔔 Configuring a Splunk Alert to Send Slack Notifications
Step 1: Create a New Alert
Go to Splunk UI → Settings → Searches, Reports, and Alerts.
Click Create New Alert.
Set Trigger Condition:
Trigger if Number of Results > 0.
Set the appropriate schedule (e.g., every 5 minutes).
Step 2: Configure the Slack Alert Action
Enable Slack Alert action in Splunk.
Set up a Slack Webhook URL (replace with your actual webhook):
json
Copy
Edit
https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
Use the following Slack message format:
json
Copy
Edit
{
  "text": """🚀 *Successful SSH Login Alert*
👤 User: $result.user$ 🖥️ DEST Host: $result.host$ 🌐 SRC IP: $result.ip$ 🔑 Method: $result.auth_method$ ⏰ Time: $result.formatted_time$""" }

yaml
Copy
Edit
4. **Save & Enable the Alert!** 🎉

---

## ✅ Example Slack Notification Output
Once the alert triggers, Slack will receive a message like this:

🚀 Successful SSH Login Alert 👤 User: james 🖥️ DEST Host: 10.10.10.10 🌐 SRC IP: 10.10.10.100 🔑 Method: publickey ⏰ Time: 2025-03-16 15:14:59

yaml
Copy
Edit

---

## 🎯 Final Thoughts
By setting up this Splunk alert, you ensure **real-time monitoring** of SSH logins while **improving security visibility**. You can modify the query to:
- **Include more details** (e.g., failed logins, geolocation lookup).
- **Trigger different actions** (e.g., email alerts, automated responses).

🔹 **Now your Slack is your security dashboard!** 🚀🔐
