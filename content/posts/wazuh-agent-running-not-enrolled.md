---
title: "Running but Not Enrolled: The Quiet Way a Wazuh Agent Fails"
date: 2026-10-13T17:43:57+01:00
draft: false
author: "James"
topic: "Detection"
tags: ["Wazuh", "SIEM", "Monitoring", "Ansible", "Security"]
summary: "A Wazuh agent can be active, running and completely mute. How I check enrolment from both the agent and the manager, across the whole fleet, without changing anything."
---

## The failure that doesn't look like one

```bash
$ systemctl status wazuh-agent
Active: active (running)
```

Everything looks fine, and there are no errors anywhere. But if that agent never enrolled with the manager, or enrolled and then lost the connection, it sends nothing. No events, no alerts, and no red light on a dashboard. A SIEM's worst failure is silence that looks like calm.

## Why a running agent can be mute

- **It never enrolled.** The package is installed and the service is up, but the enrolment step was skipped or failed, so there is no usable key file.
- **It points at the wrong manager.** A stale address in a role default, left over from before the manager was built, is enough.
- **The registration password is missing or wrong.**
- **The network path is blocked.** Agents use one port to enrol and another to send events. With VLAN segmentation, a firewall rule that allows only one of them leaves an agent installed, running and unable to talk.

{{< diagram name="wazuh-silent-chain" caption="Four things must hold before an event reaches the manager, and systemctl only answers the first." >}}

## Check 1: ask the agent

The agent keeps a state file that says whether it is talking to its manager:

```bash
sudo grep -i status /var/ossec/var/run/wazuh-agentd.state
# status='connected'
```

Anything other than `connected` is worth a look.

## Check 2: ask every agent at once, read-only

Running that by hand on 20-odd hosts is how things get missed, so it is a task in an Ansible audit playbook. The audit only reads, so it is safe to run at any time:

```yaml
- name: Read Wazuh agent state (enrolment proof)
  ansible.builtin.command: cat /var/ossec/var/run/wazuh-agentd.state
  changed_when: false
  failed_when: false      # a host with no agent gives a clean "not connected", not a failed play
  register: wazuh_state

- name: Assemble per-host findings
  ansible.builtin.set_fact:
    audit:
      # wazuh_running comes from the service facts, not shown here
      wazuh_connected: "{{ 'connected' in (wazuh_state.stdout | default('') | lower) }}"
```

The report has separate columns for **running** and **enrolled**, because they are different questions. A made-up example of what the interesting rows look like:

| Host | Wazuh running | Wazuh enrolled |
|------|---------------|----------------|
| web-1 | ✅ | ✅ |
| web-2 | ✅ | ❌ |
| db-1 | ⚠️ installed, not running | ❌ |

`web-2` is the quiet failure: up, healthy-looking, and sending nothing.

## Check 3: ask the manager

Agent-side `connected` is necessary but not sufficient. The manager is the authority on who is actually reporting:

```bash
sudo /var/ossec/bin/agent_control -l
```

That lists every agent with its status: Active, Disconnected or Never connected. Reconcile the list against your inventory. Anything in the inventory that isn't Active is a gap in coverage, and "Never connected" is usually the quiet failure above.

{{< diagram name="wazuh-audit-routine" caption="The agent-side and manager-side answers are reconciled against the inventory, then the gaps are fixed through the role." >}}

## Make enrolment boring

Most of these failures come from enrolment being a one-off manual step. In the Ansible role it is automatic and safe to re-run:

```yaml
- name: Assert registration password is set
  ansible.builtin.assert:
    that:
      - wazuh_registration_password | length > 0

- name: Check whether the agent is already enrolled
  ansible.builtin.stat:
    path: /var/ossec/etc/client.keys
  register: client_keys_stat

- name: Enroll agent with the Wazuh manager
  ansible.builtin.command:
    cmd: >
      /var/ossec/bin/agent-auth
      -m {{ wazuh_manager_ip }}
      -p {{ wazuh_registration_port }}
      -A {{ inventory_hostname }}
      -G {{ wazuh_agent_group }}
  when: not client_keys_stat.stat.exists or client_keys_stat.stat.size == 0
  no_log: true    # the registration password is on this command line
```

- It fails early with a clear message if the registration password isn't set, instead of enrolling nothing.
- It only enrols when the key file is missing or empty, so re-running never creates a duplicate registration.
- The password comes from the secrets store, never from the repo, and `no_log` keeps it out of Ansible's output.

On Windows hosts the Sysmon install goes first, so its event channel already exists when the agent starts reading logs.

## Where I am with it

I'm still working through the manager-side reconciliation across the whole fleet, so the audit report is a to-do list rather than a clean bill of health.

The next step is an alert for when an agent goes quiet, so catching a mute agent doesn't depend on me remembering to run the audit.
