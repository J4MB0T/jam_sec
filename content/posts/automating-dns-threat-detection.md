---
title: "Automating DNS Threat Detection with Splunk"
date: 2025-03-22T23:12:42+08:00
draft: false
author: "James"
tags: ["Splunk", "Security", "DNS Monitoring", "Threat Detection", "Automation"]
summary: "Learn how to set up a Splunk query and alert to monitor questionable DNS queries, filter out reputable domains, and send automated reports via Slack."
---

## **Introduction**

Monitoring DNS traffic is a crucial aspect of network security. Malicious actors often use **DNS tunneling, command-and-control (C2) domains, and suspicious lookups** to evade detection.  

In this guide, you’ll learn how to **create a Splunk search** that:  
✅ Extracts **all DNS queries** from `pfSense` logs  
✅ Filters out **reputable domains** (from Cloudflare Radar)  
✅ Displays **only questionable domains**  
✅ Sends **daily alerts via Slack and Email**  

---

## 🔍 **Splunk Search to Detect Questionable DNS Queries**

We will build a Splunk query that:  
1. **Extracts DNS queries** from `pfSense` logs  
2. **Uses regex** to filter domains  
3. **Ignores known safe domains** using a `cloudflare-radar.csv` lookup  
4. **Sorts and displays the most queried questionable domains**  

### **📝 Splunk Query**
```spl
index=pfsense sourcetype=unbound "query"
| rex field=_raw "query\s(?<domain>[\w.-]+)\.\s(?<query_type>\w+)\sIN$"
| eval base_domain=lower(replace(domain, "^(?:.*\.)?([^.]+\.[^.]+)$", "\1"))
| lookup cloudflare-radar.csv domain AS base_domain OUTPUT domain AS is_reputable
| where isnull(is_reputable)
| stats count by domain
| sort - count
| head 20
| eval formatted_output="🔹 *Domain:* " . domain . "  |  📊 *Count:* " . count
```

### 🔎 **Explanation of Query**
- **Extracts queried domains** using regex (`rex`)
- **Removes subdomains**, keeping only base domains
- **Filters out known safe domains** using a lookup table (Cloudflare Radar list)
- **Displays only questionable domains**
- **Sorts by the most frequently queried domains**

---

## 📅 **Creating a Splunk Alert**

Now, let's set up a **Splunk alert** that runs **daily at 23:05** and sends results via **Slack and Email**.

### 🔔 **Steps to Create the Alert**
1. **Save the Query** → Click *Save As* → *Alert*
2. **Set the Trigger Conditions**:
   - **Cron Schedule**: `5 23 * * *` *(Runs daily at 11:05 PM)*
   - **Trigger When**: *Number of Results > 0*
   - **Send To**: Slack, Email
   - **Attach Results**: *Include top 20 domains*

---

## 💬 **Sending Alert to Slack**

To format the **Slack alert**, we use **Splunk's alert actions**:

### 📌 **Slack Message Body**
```json
{
  "text": "🚨 *[ALERT] Daily Top 20 Questionable DNS Queries* 🚨\n\nThe following domains were queried frequently but are NOT in our reputable list (cloudflare-radar.csv):\n\n%result%\n\n🔍 *Action Required:*\nInvestigate these domains and take necessary action.\n\nCheck Splunk for more details: [Insert Dashboard Link]"
}
```

### 🛠 **Setting Up Slack Integration**
1. **Enable Slack** in Splunk (*Settings* → *Integrations* → *Slack*)
2. **Set up the webhook URL** in *Alert Actions*
3. **Use the above message format** for structured alerts

---

## 📧 **Email Alert Configuration**

For **email notifications**, use the following message:

### 📌 **Email Subject**
```plaintext
🚨 [ALERT] Daily Top 20 Questionable DNS Queries 🚨
```

### 📌 **Email Body**
```plaintext
Hello Team,

Here is the daily report of the top 20 most queried questionable domains detected on the network:

%result%

These domains were queried but are NOT listed in our reputable domains list (cloudflare-radar.csv). Please review the list and investigate if necessary.

🔍 Need More Details?  
Check Splunk Dashboard → [Insert Dashboard Link]

Best,  
Security Operations Team
```

---

## 🎯 **Final Thoughts**

By automating **DNS monitoring in Splunk**, you can:
✅ **Detect malicious queries** before they cause harm  
✅ **Ignore known good traffic** (reducing false positives)  
✅ **Receive daily alerts** via Slack & Email  
✅ **Quickly investigate suspicious activity**  

### 🔗 **Next Steps**
- **Add threat intelligence feeds** to cross-check domains
- **Automate response actions** (block, notify admins)
- **Visualize DNS query trends** in Splunk dashboards

🔐 **Stay Secure & Keep Monitoring!** 🚀

