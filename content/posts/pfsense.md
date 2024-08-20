+++
title = 'Pfsense'
date = 2024-08-20T13:28:55Z
draft = true
+++



## Title: My Journey with pfSense: Building a Secure Firewall

### Introduction
- I decided to implement a physical pfSense firewall after virtualising it for some years. Virtualising it had its downfalls...when the internet decides it wants to drop or you've made some rookie networking errors and damn, there is no longer access to any resources. Especially when the rest of your house depends on the routing you're in control of. 

- It was time to make a change. I purchased a Qotom 350P 4 port appliance to act as my physical firewall. 

### Hardware Requirements
- Describe the hardware you used (CPU, RAM, NICs, storage).
- Explain how these requirements may vary based on your specific use case.

### Installation and Basic Setup
1. **Installing pfSense:**
   - Walk through the installation process.
   - Mention any challenges you faced or interesting observations.
2. **Initial Configuration:**
   - Set up LAN and WAN interfaces.
   - Configure DNS settings.
   - Discuss any customizations you made.

### Firewall Rules
1. **Outbound Rules (LAN):**
   - Allow DNS access (TCP/UDP 53).
   - Enable web browsing (HTTP: TCP 80, HTTPS: TCP 443).
   - Access FTP, SMTP, POP3, and IMAP if needed.
   - Allow remote administration (Terminal server: TCP/UDP 3389).
   - Access Windows shares on the DMZ (NETBIOS/Microsoft-DS).

2. **Outbound Rules (DMZ):**
   - Allow HTTP (TCP 80) and HTTPS (TCP 443) for servers.
   - Configure DNS access.
   - Allow NTP (UDP 123) for time synchronization.

### Security Considerations
- Discuss best practices for pfSense firewall rules⁵.
- Explain how you balanced security and usability.

### Personal Experience
- Share any challenges, victories, or surprises you encountered during the setup.
- Highlight moments when you felt accomplished or learned something new.

### Conclusion
- Recap your journey with pfSense.
- Encourage readers to explore pfSense for their own network security needs.


