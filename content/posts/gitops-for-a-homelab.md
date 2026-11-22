---
title: "GitOps for a Homelab: Terraform, Ansible and Git as the Source of Truth"
date: 2026-10-13T17:39:57+01:00
draft: false
author: "James"
topic: "Infrastructure"
tags: ["Homelab", "Terraform", "Ansible", "Proxmox", "Infrastructure as Code", "DevOps"]
summary: "How my homelab SOC is built from a Git repo: a documented template, Terraform to create the VMs, Ansible to configure them, and a look-before-you-apply step for every kind of change. Including the parts that aren't tidy yet."
---

## The problem

For a long time, every VM in my lab was a click-through in the Proxmox web UI. Nothing was written down except in my head, and small mistakes (a wrong VLAN tag, a disk a few GB too small) only showed up weeks later, when something couldn't reach something else. That doesn't scale. The lab is now over twenty VMs across several VLANs: SOC tooling, core services, a Windows domain and a monitoring stack.

So I adopted one rule: if a change matters, it lives in the repo. The repo is the system of record, and the lab is whatever the repo says it is.

One caveat on the word "GitOps". Strictly it means an agent that pulls from Git and reconciles the live system by itself. Mine is looser: Git is the source of truth and every change is reviewed before it lands, but I run the tools myself and nothing reconciles automatically.

## Three jobs, three tools

{{< diagram name="gitops-pipeline" caption="Each step has one owner, and Terraform and Ansible each have a review gate before they change anything." >}}

The split matters more than the tools. Terraform never installs software or edits config files on a running host, and its job ends the moment the VM exists and boots. Ansible never creates VMs. When something is wrong, it is obvious which layer to look at.

| Layer | Owner |
|---|---|
| Base image (cloud-init template) | Built by hand once, steps documented. Packer is the plan |
| VM exists, sized, VLAN-tagged | Terraform |
| OS hardening, agents, services | Ansible roles |
| Record in the CMDB | Ansible, as the last step of every fleet playbook |
| Firewall rules | By hand, checked against a written intent document |
| Domain controller promotion | Ansible, run deliberately and once |
| Secrets store, CA root key, break-glass credentials | Human only |

That last row is deliberate. However convenient automation would be, the things that could lock me out of my own lab, or let someone impersonate it, don't go through a pipeline.

## The template: boring, hand-built and documented

My original plan said Packer would build the base template. What I actually have is a template I built by hand, following a documented sequence of `qm` commands, because it unblocked everything else. Packer would make it repeatable and is still worth doing, but a serviceable template now beats a perfect one later.

The template is an Ubuntu 24.04 cloud image. The recipe, in order:

1. Create an empty VM shell and import the cloud image as its disk.
2. Add a cloud-init drive and set the boot order to the imported disk.
3. Give it a serial console, which cloud images expect.
4. Attach a small cloud-init vendor snippet that installs the QEMU guest agent on first boot.
5. Convert it to a template with `qm template`.

Four things in the notes have already saved me time:

- **A blank console isn't a hung VM.** With a serial console, the web console shows nothing. Use `qm terminal` instead.
- **Cloud-init changes need a full stop and start.** After changing cloud-init settings, run `qm cloudinit update` and then fully stop and start the VM. A reboot from inside the guest doesn't pick them up.
- **"Destination Host Unreachable" on first boot is usually cloud-init still running.** Check `cloud-init status` for `done` versus `running` before chasing VLAN and switch ghosts.
- **Clones made before the vendor snippet existed have no guest agent.** Install it by hand once.

## Terraform's job: make the VM exist

I use the `bpg/proxmox` provider, constrained in `versions.tf` because it changes quickly. The repo layout is small:

```
terraform/
  versions.tf
  provider.tf
  variables.tf
  modules/proxmox-vm/            # one VM, parameterised
  environments/homelab/
    main.tf                      # the real VM definitions
    terraform.tfvars.example     # the shape only, never real values
```

The whole module is one resource. A trimmed version:

```hcl
resource "proxmox_virtual_environment_vm" "this" {
  name      = var.name
  vm_id     = var.vm_id          # explicit, never auto-assigned
  node_name = var.node_name

  agent {
    enabled = true
  }

  clone {
    vm_id = var.template_vm_id
    full  = true                 # a full copy, not a linked clone
  }

  network_device {
    bridge  = "vmbr0"
    vlan_id = var.vlan_id        # the VLAN tag is in code, not in my memory
  }

  # cpu (type host), memory, disk and the cloud-init IP and SSH key omitted

  lifecycle {
    ignore_changes = [
      initialization,            # after first boot, Ansible owns the OS
    ]
  }
}
```

The `ignore_changes` block is the handover. Terraform sets the IP and SSH key through cloud-init at creation, then stops caring about them, so it never fights Ansible over how the OS is configured.

A VM definition is about a dozen lines. This one uses example values:

```hcl
module "app01" {
  source       = "../../modules/proxmox-vm"
  name         = "app01"
  cores        = 2
  memory_mb    = 2048
  disk_size_gb = 32
  vlan_id      = 30
  ip_address   = "192.0.2.10/24"
  # vm_id, template and SSH key omitted
}
```

The guardrails around it:

- **A dedicated API token, never root.** It belongs to its own user with a custom role: enough to create, clone, configure and power on VMs and allocate disk, and nothing that edits users or permissions. It is created with privilege separation on, so it is limited to that role rather than inheriting the user's full rights.
- **The token secret lives in the secrets store.** It reaches Terraform as an environment variable at apply time, never in a `tfvars` file.
- **State and real `tfvars` are gitignored.** State can hold sensitive values, and `tfvars` holds real addresses and tokens.
- **`terraform plan` is read in full before every `apply`.**

## Ansible's job: make the host trustworthy

Every Linux VM gets the same baseline role. The order is deliberate:

1. **Accounts first.** A personal admin account and an automation account, both key-only with locked passwords, so there is no password to guess. Legacy generic `admin` and `administrator` accounts are removed.
2. **Then SSH.** `sshd` is set to key-only authentication, no root login, `AllowUsers` naming exactly those two accounts, and the automation account additionally pinned to the controller's source address. It has to come after step 1, because `AllowUsers` would otherwise lock out accounts that don't exist yet.
3. **fail2ban** on `sshd`.
4. **Time** from a single source, the firewall, via chrony.
5. **auditd** with a baseline ruleset that watches the identity files, sudoers, `sshd_config` and the auth log for tampering.
6. **Trust for the internal CA's root certificate**, when one is configured.

Other roles follow the same habit of picking the less convenient, safer option:

- **docker_host** deliberately never adds the automation account to the `docker` group. That group is root-equivalent, since a container can bind-mount the host filesystem.
- **The Beszel monitoring agent** runs as a shell-less user from a pinned binary I download directly, in a sandboxed systemd unit. I don't pipe a vendor's install script into a shell.
- **The Velociraptor client** gets its config from the secrets store, written verbatim because it contains a pinned server certificate fingerprint, and the task has `no_log`.
- **The patch timer** reports through a webhook.
- **The bastion is excluded from fleet-wide automation on purpose.** It has its own role, a single admin account and full session recording. It is also a separate machine from the Ansible controller, so compromising one doesn't hand over the other.

## One routine for every change

Every kind of change has a "look before you apply" step, and the kinds that can't be undone get the most care:

| Change | Look first | Why |
|---|---|---|
| Ansible playbook | `--check --diff` | See the diff before it is a fact |
| Terraform | `terraform plan`, read in full | A bad apply can replace or destroy a VM |
| Firewall rule | Compare with the written intent before typing it in | A bad rule can lock me out of the only way in |
| No dry run exists (domain promotion, sandbox installs) | Read the role carefully instead | Nothing else will catch it |

When I use an AI assistant to help write config, the same rule applies: it writes, I read and run. The design for letting an agent touch the lab at all is a separate identity confined to a sandboxed lab network, with no route to the secrets store, the CA or break-glass credentials. A homelab with a firewall and a domain controller is exactly the place where one misapplied command has an outsized effect.

## Keeping secrets out of Git

A repo that documents a whole lab practically lists where every credential lives, so the guardrails matter.

{{< diagram name="gitops-secrets" caption="Three checks sit between a slip and history. The secrets themselves take a different route and reach the tools at run time." >}}

- **`.gitignore` is the first layer.** It blocks keys and certificates, `.env` files, Ansible vault files, Terraform state and real `tfvars`, firewall config backups, and the audit reports (which contain account names, key fingerprints and ACL findings). Where a file has to exist in some form (`tfvars`, vault files, `.env`), a committed `.example` sibling shows the shape without the values.
- **gitleaks runs as a pre-commit hook.** The repo ships a pre-commit config pinned to a gitleaks release. A real secret blocks the commit instead of landing in history, where it is much harder to remove. The hook is installed once per clone, so a new machine needs the setup step.
- **The push script checks too.** The script that set up the remote refuses to push if any vault, state or key file is tracked.
- **Secrets arrive at run time.** Ansible reads an encrypted vars file that is itself gitignored. Where a service needs a `.env` file, a playbook writes it from the encrypted store with tight permissions and `no_log`, so the real value never touches Git or the Ansible output:

```yaml
- name: Write .env with the real database password
  ansible.builtin.copy:
    dest: "{{ docker_compose_dir }}/app/.env"
    content: |
      DB_PASS={{ vault_app_db_pass }}
    mode: "0600"
  no_log: true
```

A few decisions around the repo itself:

- **The repo lives on a self-hosted Git server**, with a private GitHub repo as the off-site copy. I found a real gap while setting that up in July: the installer page was briefly reachable over plain HTTP. The fix became the template for every web service in the lab: TLS terminates at a proxy in front, and the app's own port is never published.
- **No self-hosted CI runner.** A runner needs access to the Docker socket, which is root-equivalent on that host. The local pre-commit hook covers the same ground without that risk.
- **Signed commits are a documented workstation habit,** not something Ansible manages, in the same category as break-glass credentials: a human process that is written down so it isn't forgotten.
- **Container image scanning with Trivy is documented but not built yet.**

## Catching drift

Two checks, and they catch different things.

**1. A read-only audit playbook** compares live hosts against fixed expectations. Every task is a read (`stat`, `getent`, `cat`, service facts), so it changes nothing and is safe to run any time. It proves, per host:

- which SSH account actually connected (it should be the automation account)
- that the automation account exists, can use sudo and has an `authorized_keys` file
- that `sshd` really is hardened, read from the running daemon rather than the file
- that fail2ban, the Wazuh agent, the monitoring agent and the forensic agent are running
- that the resolver points at the DNS filter, not the firewall
- that no stray `ubuntu` user from the cloud image is still around

The `sshd` check is worth a closer look, because it asks the daemon what it is running with, not what the file says:

```yaml
- name: Read effective sshd config
  ansible.builtin.command: sshd -T
  changed_when: false
  failed_when: false
  register: sshd_effective
```

`failed_when: false` means an unreachable or odd host produces a clean finding instead of aborting the whole run, and the playbook is set so one bad host never stops the rest. The result is a Markdown report built from a template, with one live line per host while it runs. The report goes in a gitignored folder.

**2. The baseline in check mode** (`--check --diff`) compares live hosts against what the repo's roles would enforce. Every `changed` line is somewhere a host has drifted.

The rule that goes with them: when an audit finds a problem, fix the role, commit, and re-run the baseline against only the offenders, once I've read the diff. Don't hand-fix it on the box. Hand-fixing is how the drift crept in to begin with.

{{< diagram name="gitops-drift-loop" caption="Findings go back into the role and the repo. A hand-fix changes the host but not the repo, so the drift returns." >}}

Some things the audit can't prove, and the runbook says so rather than pretending:

- whether the Wazuh manager agrees that each agent is enrolled
- what Terraform state knows about
- whether the CMDB matches what the hypervisor lists
- which certificate strategy is the standard: a private CA or a public wildcard, since I now run both

## The CMDB, written from Ansible

{{< diagram name="gitops-cmdb" caption="A NetBox record is written only after a host is configured. The comparison at the bottom is designed but not built yet." >}}

A `cmdb_sync` role runs last in every fleet playbook and upserts a NetBox device record: name, IP, platform, role and a last-configured timestamp. Two choices matter:

- **It syncs from Ansible, not Terraform.** A VM existing is a weaker signal than a VM that was configured and verified at the end of a successful play. The record appears once a host is genuinely onboarded, not when an empty shell is created.
- **It can never fail the play.** The CMDB is a record of what happened, not a gate on whether configuration succeeds, so the sync tasks have `failed_when: false`. Until a token is set, the role logs a skip instead of erroring.

The more interesting half is not built yet: a daily check that compares Wazuh's active agents and AD's computer objects with NetBox's device list. A host in NetBox that isn't reporting to Wazuh is a monitoring blind spot. A Wazuh agent or domain computer with no NetBox record is a shadow asset. Both are the sort of gap an incident hides in. There is also an example inventory file for the NetBox dynamic inventory plugin, as an alternative to the hand-kept hosts file once NetBox has real data.

## Where it isn't tidy yet

- **Terraform only knows about one VM.** The rest were built before I adopted it and were never imported, about twenty of them. Until they are, I run `apply` with `-target=module.<vm>`, and a plain `plan` shows a different set of resources each time. Importing the lot is a session of its own.
- **There is a post-clone hang I haven't root-caused.** The last time I looked, in August, `apply` cloned the VM fine (the Proxmox task log showed the clone finishing in under a minute), but the reconfigure and resize step never happened, and Terraform timed out after 30 minutes with "timeout while waiting for VM configuration to become unlocked". I ruled out resource contention, a hypervisor reboot, an expired certificate, a missing permission, the guest-agent wait bug, SSH key auth to the host, stale lock files, and the provider version (I tried two, a recent one and a much older one, with the same result). Next step is a `TF_LOG=TRACE` capture of the window where it hangs.
- **The provider can hang waiting for the guest agent to report an IP.** My workaround is to set that config directly on the hypervisor and skip the refresh.
- **Comments still say Packer.** The template is hand-built, but a couple of comments and variable descriptions in the Terraform code still say Packer built it. The kind of drift I'm trying to catch, in my own docs.
- **Records disagree with reality.** The repo and the CMDB had a VM under one ID while the hypervisor had it under another, which a spot-check of `qm list` caught.
- **Planned but not built:** the Packer template, the daily CMDB comparison, Trivy scans and the NetBox-driven inventory.

## Why bother

Because the lab can be rebuilt, reviewed and explained. Git history shows what changed and when, the plans and diffs show what will happen before it does, and the repo doubles as the record of why I made each decision.

Next up: importing the rest of the VMs into Terraform state, finding that hang, and building the Packer template to replace my hand-built one.
