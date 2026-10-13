---
title: "GitOps for a Homelab: Packer, Terraform and Ansible, All in Git"
date: 2026-10-13T17:39:57+01:00
draft: false
author: "James"
topic: "Infrastructure"
tags: ["Homelab", "Terraform", "Ansible", "Proxmox", "Infrastructure as Code", "DevOps"]
summary: "How my homelab SOC is built from a Git repo: Packer makes the template, Terraform creates the VM, Ansible configures it, and every change is reviewed before it is applied."
---

## The problem

For a long time, every VM in my lab was a click-through in the Proxmox web UI. Nothing was written down except in my head, and small mistakes (a wrong VLAN tag, a disk a few GB too small) only showed up weeks later, when something couldn't reach something else.

So I adopted one rule: if a change matters, it lives in the repo. The repo is the system of record, and the lab is whatever the repo says it is.

## Three tools, three jobs

{{< diagram name="gitops-pipeline" caption="Each tool owns one step, and each step has a review gate before it changes anything." >}}

The split matters more than the tools. Terraform never installs software or edits config files on a running host, and its job ends the moment the VM exists and boots. Ansible never creates VMs. When something is wrong, it is obvious which layer to look at.

| Layer | Tool |
|---|---|
| VM exists, sized, VLAN-tagged | Terraform |
| OS hardening, agents, services | Ansible roles |
| Firewall rules | By hand, checked against a written intent document |
| Domain controller promotion | Ansible, run deliberately and once |

A few things stay manual on purpose. Anything that touches the secrets store, the CA root key or break-glass credentials is human-only, however convenient automation would be.

## One routine for every change

Every kind of change has a "look before you apply" step:

| Change | Look first |
|---|---|
| Ansible playbook | `--check --diff` |
| Terraform | `terraform plan`, read in full, then `apply` |
| Firewall rule | Compare with the written intent before typing it in |
| No dry run exists (e.g. domain promotion) | Read the role carefully instead |

When I use an AI assistant to help write config, the same rule applies: it writes, I read and run. A homelab with a firewall and a domain controller is exactly the place where one misapplied command has an outsized effect.

## Keeping secrets out of Git

A repo that documents a whole lab practically lists where every credential lives, so the guardrails matter.

- `.gitignore` blocks state files, real `tfvars`, `.env` files, keys and firewall config backups. Terraform state can hold sensitive values, so it never goes near the repo. The repo only carries `.example` files that show the shape.
- A pre-commit hook runs gitleaks. A real secret blocks the commit instead of landing in history, where it is much harder to remove.
- Terraform uses a dedicated API token with its own narrow role and privilege separation, never root.
- Commits are signed.
- The primary copy lives on a self-hosted Git server, with a private GitHub mirror as the off-box copy. I verify the mirror by comparing commit hashes rather than trusting that the push worked.

## Catching drift

Two checks, and they catch different things:

1. **A read-only audit playbook** compares live hosts against fixed expectations: accounts, SSH hardening, agents running, DNS settings. It changes nothing, so it is safe to run any time.
2. **The baseline in check mode** (`--check --diff`) compares live hosts against what the repo's roles would enforce. Every `changed` line is somewhere a host has drifted.

The rule that goes with them: when an audit finds a problem, fix the role, commit, and re-run. Don't hand-fix it on the box. Hand-fixing is how the drift crept in to begin with.

{{< diagram name="gitops-drift-loop" caption="Findings go back into the role and the repo. A hand-fix changes the host but not the repo, so the drift returns." >}}

## Where it isn't tidy yet

- **Terraform only knows about one VM.** The rest were built before I adopted it and were never imported. Until they are, I run `apply` with `-target` for each new VM. It works, but a plain `plan` can't show the whole picture.
- **The provider has quirks.** The Proxmox provider can hang waiting for the guest agent to report an IP, so I set that config directly on the hypervisor and skip the refresh. As of August I also had a post-clone hang I couldn't root-cause, even after trying two provider versions.
- **Records disagree with reality.** My CMDB had a VM recorded under the wrong ID, which a spot-check against the hypervisor caught.

## Why bother

Because the lab can be rebuilt, reviewed and explained. Git history shows what changed and when, the plans show what will happen before it does, and the repo doubles as the record of why I made each decision.

Next up: importing the rest of the VMs into Terraform state, and having Ansible read its inventory from the CMDB instead of a hand-kept file.
