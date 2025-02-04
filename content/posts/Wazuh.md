---
title: "Wazuh"
date: 2025-02-04T21:19:10+13:00
draft: false
author: "James"
categories: 
  - "Homelab"
  - "Network Security"
tags: 
  - "Homelab"
  - "Network"
summary: "Wazuh Security Integrations"
---

```markdown
# Integrating Wazuh with Slack

I have integrated Slack as a chosen notification method for Wazuh security alerts. Here is a brief breakdown on how this is achieved. (https://documentation.wazuh.com/current/user-manual/manager/integration-with-external-apis.html)

## 1. Create a Slack Incoming Webhook
- In your Slack workspace, enable incoming webhooks and create one for your desired channel.

![Wazuh Configuration](/static/wazuh/wazuh_1.png)
![Wazuh Configuration](/static/wazuh/wazuh_2.png)
![Wazuh Configuration](/static/wazuh/wazuh_3.png)

## 2. Configure Wazuh Integration
- On the Wazuh manager, edit the configuration file:
  ```bash
  sudo nano /var/ossec/etc/ossec.conf
  ```
- Add the following integration configuration, replacing `<SLACK_WEBHOOK_URL>` with your actual Slack webhook URL:
  ```xml
  <ossec_config>
    <integration>
      <name>slack</name>
      <hook_url><SLACK_WEBHOOK_URL></hook_url>
      <alert_format>json</alert_format>
      <level>5</level>
    </integration>
  </ossec_config>
  ```

## 3. Restart Wazuh Manager
Apply the changes by restarting the Wazuh manager:
```bash
sudo systemctl restart wazuh-manager
```

After completing these steps, Wazuh will send alerts directly to your specified Slack channel.
