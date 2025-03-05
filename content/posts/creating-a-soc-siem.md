---
title: "Creating a Soc Siem"
date: 2025-02-27T23:54:08+07:00
draft: true
title: "Creating a SOC SIEM"
date: 2025-02-27
tags: ["SIEM", "SOC", "Security", "Wazuh", "Graylog", "Grafana", "ArcherySec"]
categories: ["Cybersecurity"]
---

## Introduction

A **Security Operations Center (SOC)** is essential for monitoring, detecting, and responding to cybersecurity threats. At the core of any SOC is a **Security Information and Event Management (SIEM)** system, which collects, analyzes, and correlates security data from multiple sources.

In this post, I'll walk you through my journey of creating a **SOC SIEM** using various open-source tools, including **Wazuh, Graylog, Grafana, Node Exporter, and ArcherySec**.

---

## Setting Up Wazuh Manager 4.11 in Docker

### Why Wazuh?
Wazuh is an open-source security platform offering **threat detection, log analysis, compliance monitoring, and file integrity monitoring (FIM)**. It's a lightweight yet powerful SIEM solution.

### Installation Steps:
1. **Install Docker & Docker Compose** (if not already installed).
2. Clone the Wazuh Docker repository and deploy the stack:

   ```bash
   git clone https://github.com/wazuh/wazuh-docker.git
   cd wazuh-docker
   docker-compose up -d
   ```

3. Verify that the Wazuh Manager is running:

   ```bash
   docker ps | grep wazuh
   ```

4. Access the Wazuh Dashboard and start configuring agents.

---

## Configuring Graylog 6 for pFSense Syslog Collection

### Why Graylog?
Graylog is a **centralized log management system** with powerful search and alerting capabilities. It’s perfect for ingesting firewall logs from **pFSense**.

### Steps to Configure:
1. Install Graylog 6 via Docker:

   ```bash
   docker run -d --name graylog -p 9000:9000 -p 1514:1514/udp -p 12201:12201/udp graylog/graylog
   ```

2. Configure **pFSense** to send logs:
   - Navigate to **Status → System Logs → Settings**.
   - Enable **Remote Logging**.
   - Set **Graylog’s IP** as the syslog target.

3. Create a new **Syslog UDP Input** in Graylog.

4. Validate incoming logs using **Graylog’s search feature**.

---

## Integrating Grafana for Visualization

### Why Grafana?
Grafana provides **powerful dashboards** for monitoring and visualizing logs, security events, and system metrics.

### Steps:
1. Install Grafana:

   ```bash
   docker run -d --name=grafana -p 3000:3000 grafana/grafana
   ```

2. Add **Graylog and Wazuh** as data sources.
3. Create **custom dashboards** for security events.

---

## Monitoring System Metrics with Node Exporter

To ensure the SOC infrastructure is running smoothly, I installed **Node Exporter** on my Debian 12 machines and vCenter.

### Steps:
1. Install Node Exporter:

   ```bash
   sudo apt update && sudo apt install prometheus-node-exporter -y
   ```

2. Add it as a **Prometheus data source** in Grafana.
3. Visualize CPU, memory, and network usage in real time.

---

## Implementing ArcherySec for Vulnerability Management

### Why ArcherySec?
ArcherySec is an **open-source vulnerability management tool** that helps track security weaknesses.

### Steps:
1. Install ArcherySec:

   ```bash
   docker run -d -p 8000:8000 archerysec/archerysec
   ```

2. Run vulnerability scans and integrate them into the SIEM workflow.

---

## Enhancing Detection & Response Capabilities

To improve **threat detection and response**, I:
- Configured **alerts** in **Wazuh and Graylog**.
- Automated responses for high-priority threats.
- Fine-tuned **correlation rules** to reduce false positives.

---

## Future Enhancements & Next Steps

To further improve my **SOC SIEM**, I plan to:
- Integrate **Suricata IDS/IPS** for deep packet inspection.
- Add **SOAR (Security Orchestration, Automation, and Response)** for automated incident handling.
- Optimize **log retention and storage**.

---

## Conclusion

Building a **SOC SIEM** from scratch is challenging but rewarding. By integrating **Wazuh, Graylog, Grafana, Node Exporter, and ArcherySec**, I’ve created a robust security monitoring system.

💡 **What’s next?** I’d love to hear how you’re building your SIEM! Drop a comment below and share your thoughts.
