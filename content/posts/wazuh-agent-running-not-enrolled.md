---
title: "Running but Not Enrolled: The Quiet Way a Wazuh Agent Fails"
date: 2026-10-13T17:43:57+01:00
draft: false
author: "James"
topic: "Detection"
tags: ["Wazuh", "SIEM", "Monitoring", "Ansible", "Security"]
summary: "A Wazuh agent can be active, running and completely mute. How I check enrolment from both the agent and the manager across the whole fleet without changing anything, and how the Ansible role enrols agents safely."
---

## The failure that doesn't look like one

```bash
$ systemctl status wazuh-agent
Active: active (running)
```

Everything looks fine, and there are no errors anywhere. But if that agent never enrolled with the manager, or enrolled and then lost the connection, it sends nothing. No events, no alerts, and no red light on a dashboard. A host that never reports and a host that has nothing to report look identical from the SIEM's side, which is why a SIEM's worst failure is silence that looks like calm.

## What has to be true for an event to arrive

An agent doing its job depends on four separate things, and `systemctl` can only answer the first.

{{< diagram name="wazuh-silent-chain" caption="Four things must hold before an event reaches the manager, and systemctl only answers the first." >}}

Enrolment and event delivery are two different conversations. The agent first registers with the manager on a registration port and is issued a key, stored in a key file on the agent. After that it connects on the event port using that key, and the manager lists it as Active. A package install does neither of those things. It just puts the agent on the disk and starts a service.

That gives a handful of ways for a running agent to be mute:

- **It never enrolled.** The package is installed and the service is up, but the enrolment step was skipped or failed, so there is no usable key file.
- **It points at the wrong manager.** My role's default manager address was a placeholder from before the real build, and I corrected it in July. A stale address is enough to leave an agent running and talking to nothing.
- **The registration password is missing or wrong.** If the manager requires one, an agent without it is refused.
- **The network path is blocked.** Agents use one port to enrol and another to send events. In my layout the agent rule is written explicitly: both ports, over TCP, from the agents to the SOC network. A rule that allows only one of them leaves an agent installed, running and unable to finish the job.
- **It holds a key the manager no longer recognises.** The key file exists, but the manager doesn't have a matching agent (for example after the manager was rebuilt). This one matters later.

## Check 1: ask the agent

The agent keeps a state file that says whether it is talking to its manager:

```bash
sudo grep -i status /var/ossec/var/run/wazuh-agentd.state
# status='connected'
```

Anything other than `connected` is worth a look. This single line covers both the enrolment and the network path from the agent's point of view, because the agent only reports `connected` when it has a key and has reached the manager.

## Check 2: ask every agent at once, read-only

Running that by hand on 20-odd hosts is how things get missed, so it is a task in an Ansible audit playbook. Every task in the audit is a read (`stat`, `getent`, `cat`, service facts), so it is safe to run at any time. It also asks the same host the other questions I care about: which account actually connected, whether `sshd` is hardened, whether the other agents are running, and whether the resolver has drifted.

The Wazuh part is two tasks:

```yaml
- name: Read Wazuh agent state (enrolment proof)
  ansible.builtin.command: cat /var/ossec/var/run/wazuh-agentd.state
  changed_when: false
  failed_when: false      # no agent is a finding, not a failed play
  register: wazuh_state

- name: Assemble per-host findings
  ansible.builtin.set_fact:
    audit:
      # wazuh_running comes from the service facts, not shown here
      wazuh_connected: >-
        {{ 'connected' in (wazuh_state.stdout | default('') | lower) }}
```

`failed_when: false` is doing real work. A host with no agent at all should show up as a finding, not abort the run, and the playbook is also set so that one unreachable host never stops the others.

The report has separate columns for **running** and **enrolled**, because they are different questions. A made-up example of what the interesting rows look like:

| Host | Wazuh running | Wazuh enrolled |
|------|---------------|----------------|
| web01 | ✅ | ✅ |
| web02 | ✅ | ❌ |
| db01 | ⚠️ installed, not running | ❌ |

`web02` is the quiet failure: up, healthy-looking, and sending nothing. A single "Wazuh OK" column would have hidden it.

## Check 3: ask the manager

Agent-side `connected` is necessary but not sufficient. The manager is the authority on who is actually reporting, and it is the only place a "Never connected" agent shows up:

```bash
sudo /var/ossec/bin/agent_control -l
```

That lists every agent with its status: Active, Disconnected or Never connected. Reconcile the list against your inventory. Anything in the inventory that isn't Active is a gap in coverage, and "Never connected" is usually the quiet failure above.

The playbook deliberately doesn't try to do this part. The audit can't see the manager's list, so the runbook lists it as a manual follow-up, next to the other things a read-only audit can't prove.

{{< diagram name="wazuh-audit-routine" caption="The agent-side and manager-side answers are reconciled against the inventory, then the gaps are fixed through the role." >}}

## Make enrolment boring

Most of these failures come from enrolment being a one-off manual step. In the Ansible role it is automatic and safe to re-run. The tasks run in this order:

1. Assert the registration password is set.
2. Install the agent (Debian-family and RHEL-family tasks).
3. Deploy `ossec.conf` from a template.
4. Check whether the agent is already enrolled.
5. Enrol it, only if it isn't.
6. Make sure the service is enabled and running.

The interesting part is steps 4 and 5:

```yaml
- name: Assert registration password is set
  ansible.builtin.assert:
    that:
      - wazuh_registration_password | length > 0
    fail_msg: "registration password is empty, set it in the encrypted vars"

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
  no_log: true
```

{{< diagram name="wazuh-enrol-flow" caption="The role enrols only when there is no key. That keeps re-runs safe, but it can't tell a good key from a stale one." >}}

- It fails early, with a clear message, if the registration password isn't set, instead of enrolling nothing. The password comes from the encrypted vars file and never from the repo.
- It only enrols when the key file is missing or empty, so re-running never creates a duplicate registration.
- The enrol task has `no_log` set so nothing about it lands in Ansible's output.
- The agent registers under the host's inventory name and joins a group, which controls which config profile it gets from the manager.

That key-file check is also the role's limit. It only looks at whether the key file exists, so it can't tell a good key from a stale one. That is exactly the case the audit's `connected` check exists for.

The agent is installed from the same rolling `4.x` package repo the manager uses, rather than pinned to a minor version. A pinned minor can pull from a repo that doesn't match what the manager is running, and agent and manager need to stay compatible.

The connection settings in the config template are short:

```xml
<client>
  <server>
    <address>{{ wazuh_manager_ip }}</address>
    <port>{{ wazuh_manager_port }}</port>
    <protocol>tcp</protocol>
  </server>
  <notify_time>10</notify_time>
  <time-reconnect>60</time-reconnect>
  <auto_restart>yes</auto_restart>
  <crypto_method>aes</crypto_method>
</client>
```

The agent sends a keepalive every 10 seconds and retries a lost connection every 60, so a brief drop heals itself while a persistent break shows up in the state file.

The rest of the template decides what the agent actually sends:

- **File integrity monitoring** in real time on `/etc`, `/usr/bin`, `/usr/sbin`, the `sshd` config and sudoers, with a full scan every 12 hours. It watches the same things `auditd` watches at the OS level, so the SIEM has the same view centrally.
- **Security configuration assessment** at startup and every 12 hours, plus rootcheck.
- **Logs** from the auth log, syslog and the audit log. On the bastion it also forwards the journal, which is where the session recordings land.

### Windows hosts

On Windows the order matters more. Sysmon, with a community config, is installed first so its event channel already exists when the agent starts reading logs. The agent MSI then takes the manager address, registration port, password and group as installer arguments (with `no_log`), and the config collects the Security, System, Application, Sysmon and PowerShell channels.

## Same family: a rule that never fires

Enrolment isn't the only way a SIEM goes quietly wrong. Redundant `if_sid` conditions in a custom rule can stop it from firing at all, with no error. So before I deploy a `local_rules.xml` change I run `wazuh-analysisd -t` to check the config loads, and `wazuh-logtest -v` to prove the rule matches a sample event. It's the same lesson as the agent: "no error" and "working" are not the same thing.

## What done looks like

A new host isn't onboarded when the playbook finishes. It's onboarded when:

- it shows **Active** in the manager's agent list
- a test event from it appears in **Discover**
- the monitoring dashboard shows its metrics
- the firewall rules match the written intent

## Where I am with it

I'm still working through the manager-side reconciliation across the whole fleet, so the audit report is a to-do list rather than a clean bill of health.

The audit is also a point-in-time check. An agent can be healthy at nine and mute by five past, so catching a mute agent shouldn't depend on me remembering to run it. The next step is an alert for when an agent goes quiet. After that comes the daily comparison I've designed but not built: Wazuh's active agents against the CMDB and the domain's computer list, so a host nobody is watching, or one nobody documented, shows up on its own.
