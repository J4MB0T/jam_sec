+++
title = 'Pfsense'
date = 2024-08-20T13:28:55Z
draft = true
+++



## Title: My Journey with pfSense: Building a Secure Firewall

### Introduction
- I decided to implement a physical pfSense firewall after virtualising it for some years. Virtualising it had its downfalls. For example, when the "internet" decides it wants to drop because you've made some rookie networking errors 👀 . Especially when the rest of your house depends on the routing you're in control of. 

- It was time to make a change. I purchased a Qotom 350P 4 port appliance to act as my physical firewall. 

### Hardware Requirements
- The current configuration of my server which performs adequately and I have never had any issues with it:

         CPU Type	Intel(R) Atom(TM) CPU E3845 @ 1.91GHz
         4 CPUs: 1 package(s) x 4 core(s)
         AES-NI CPU Crypto: Yes (inactive)
         QAT Crypto: No
 
- This setup with 4 ports is suitable for my needs. Ports are utilised for WAN, LAN and IOT network. VLANs are widely used in the homelab to segregate networks. 

### Installation and Basic Setup
1. **Installing pfSense:**
   - Installation was fairly straightforward and there are tons of tutorials on YouTube and the web running through this setup. Setting it up in esxi is a little more challenging but with some tinkering it is possible. As I mentioned before, virtualising this piece of your network can lead you down a rabbit hole of issues I found. 
   - pfSense is scary when you're new to it, there is a lot to take in. In comparision, I did give OPNSense for a few days and Sophos XG, I soon realised that pfSense is just so much granular. 

2. **Initial Configuration:**
   - For my homelab, I wanted to be able to segregate networks and be able to perform sandboxing. It was vital I got these right and performed enough testing to make sure the networks were isolated. I started off with a few VLANs:

               MGMT - My secure trust network
               IOT - For all things unknown
               VPN -  Internet only
               TRAINING - Secluded and segregated
               STORAGE - NAS devices   

### Firewall Rules
1. **Outbound Rules (MGMT):**
   - Allow DNS access (TCP/UDP 53).
   - Enable web browsing (HTTP: TCP 80, HTTPS: TCP 443).
   - Allow remote administration (Terminal server: TCP/UDP 3389).
   - Access Windows shares on the STORAGE VLAN (NETBIOS/Microsoft-DS).

2. **Outbound Rules (IOT):**
   - Allow HTTP (TCP 80) and HTTPS (TCP 443)
   - Configure DNS access.
   - Allow NTP (UDP 123) for time synchronization.
   - Default deny

### Security Considerations
- I have configured the firewall to log all firewall rules and to send the syslog events to a remote server (Splunk) where I have setup reports and dashboards along with alerting for specific network traffic. I will add these to my Splnuk write up. 

### Personal Experience
- Overall this setup has been straight foward and it is always a work in progress. I have installed the wazuh agent for SIEM detection and many packages which aid reporting, such as pfBlocker, Suricata and ntopng. These packages sometimes cause issues as they can block legitimate traffic depending upon the feeds you choose to implement. 
- I have enjoyed this process as it really puts the knowledge which is learnt on paper into practice and understanding how to read logs and determine what traffic is required through the firewall. 

### Conclusion
- There are many ways and use cases for requiring a firewall and it is a great place to start with a foundation of networking. This is my first write up and so expect this page to continue to grow!



