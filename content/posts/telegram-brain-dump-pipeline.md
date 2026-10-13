---
title: "Brain Dump to Notion: A Self-Hosted Telegram Voice Note Pipeline"
date: 2026-10-12T12:00:00+01:00
draft: false
author: "James"
tags: ["n8n", "Telegram", "Automation", "Homelab", "Notion", "Ollama", "Whisper"]
summary: "How I built a voice-note-to-task pipeline: send a Telegram message from anywhere, and a self-hosted n8n workflow transcribes it, sorts it into tasks, ideas, notes and journal entries, and files it in Notion. No inbound ports, no subscriptions."
---

## **The problem**

Ideas show up at bad moments: driving, at work, halfway through dinner. By the time I'm at a keyboard they're gone, or they end up in a pile of notes I never sort.

I wanted one thing: **say it out loud, and have it filed in the right place with zero manual sorting.**

The rules I set myself:

- Works from anywhere, not just on my home network
- No subscriptions and no ads
- Sensitive homelab notes shouldn't be sent to a third-party AI
- No inbound ports opened on the firewall

---

## 🗺️ **Why not just use an app?**

I looked at the usual brain-dump apps. The pattern is the same everywhere: the AI categorisation that makes them useful eventually sits behind a paywall. I already run a homelab, so building it myself was cheaper and a lot more fun.

---

## ⚙️ **How it works**

```text
Telegram (voice or text, from anywhere)
        │
        ▼
  n8n Telegram Trigger   ← outbound long-polling only
        │
        ▼
  Identity check         ← only my Telegram user ID is obeyed
        │
        ▼
  faster-whisper         ← local transcription
        │
        ▼
  Ollama (local LLM)     ← splits into items, tags them
        │
        ▼
  Validation node        ← rejects malformed LLM output
        │
        ▼
  Notion API             ← database + dashboard
```

### **1. Capture: a Telegram bot**

A bot made with @BotFather is the whole front end. Hold the mic button, talk, send. Telegram queues the message if I have no signal and delivers it when I'm back online.

The key detail is that **n8n polls Telegram**, not the other way round. The server makes an outbound HTTPS request to `api.telegram.org` and picks up new messages, so nothing on my network is reachable from the internet.

### **2. Identity check**

A bot token alone isn't access control: anyone who finds the bot can message it. The workflow compares the sender's Telegram user ID against the owner ID and silently drops everything else.

### **3. Local transcription**

Voice notes go to a `faster-whisper` container on the same machine. Audio never leaves my network.

### **4. Local categorisation**

A local Ollama model reads the transcript and splits it into separate items. One rambling voice note can produce several. Each item gets:

- **Type**: task, idea, note or journal
- **Domain**: Homelab, Personal or Work
- **Date or time**: only if I actually said one out loud

That last rule matters. Early prompts happily invented deadlines, and a dated task I never asked for is worse than an undated one.

Tasks and ideas also get a short AI-suggested next step.

### **5. Filing in Notion**

The workflow writes each item into a Notion database through the API. A setup script creates the database and the dashboard views: a calendar, overdue and today lists, a board grouped by domain, an ideas gallery, and a journal list. Notion's free plan allows unlimited views and API access, with charts capped at one, which suits a "wants everything free" brief.

---

## 🔒 **Security choices**

- **No inbound ports.** Telegram and Notion are both reached outbound only.
- **Egress allowlist.** The server's outbound firewall rule is tightened to just `api.telegram.org` and `api.notion.com`.
- **Owner-only bot.** Messages from any other Telegram ID are ignored.
- **Local models.** Audio and transcripts are processed on my own hardware. Only the structured items go to Notion, and storing the raw transcript there is optional.
- **Secrets stay out of git.** Tokens live in a `.env` file with mode 600 that is never committed.

---

## 🧱 **What didn't work first time**

This is the third version.

1. **Obsidian + self-hosted sync.** The first design wrote Markdown into an Obsidian vault synced through CouchDB. Before the workflow even existed I was deep in Terraform and Proxmox troubleshooting: untracked VM state, a stuck VLAN tag, and firewall rules that existed in my docs but not on the firewall. I shelved it.
2. **Tana.** I tried a cloud outliner and used Claude Code against its local MCP server to work out why my voice-captured fields weren't populating. The cause was that the fields were plain text bullets, not real field definitions. Worse, its autofill command can write text but can't apply tags or push events to an external calendar. That's a structural limit, not a prompting problem, so I moved on.
3. **Notion + n8n.** I already used Notion, the free plan covers everything I need, and its API is easy to script against.

Moving the install off the Proxmox cluster onto a small standalone Ubuntu box also took the infrastructure yak-shaving out of the loop.

---

## 🐛 **Gotchas worth knowing**

**A leftover webhook silently breaks polling.** If your bot ever had a webhook registered, `getUpdates` returns nothing and nothing errors. Clear it first:

```bash
curl -s "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"
```

**LLMs return broken JSON.** Sometimes you get trailing commas, a missing field or prose wrapped around the payload. A validation step between the model and Notion is not optional. I tested that code node against multi-item batches, malformed output and a mock Notion API that enforces the real schema, so bad data fails loudly instead of landing in the database.

**Don't trust the first dry run.** Whisper and Ollama load their models on first use, so the first voice note is slow. That's normal.

---

## 🚧 **Status and what's next**

The workflow logic is built and tested offline. The first live run against real accounts is the next milestone.

Still to do:

- An **iPhone Shortcut** as a one-tap capture path. It needs a certificate my phone trusts, so Telegram comes first.
- Apple Calendar events for dated tasks. Dropped for now to keep the first version simple.

If you're building something similar, start with the validation step and the identity check. Both are small, and they're what makes it safe to leave running.
