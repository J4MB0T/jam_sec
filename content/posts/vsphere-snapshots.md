---
title: "vSphere Snapshots"
date: 2025-03-06T00:53:40+07:00
draft: False
author: "James"
tags: ["terraform", "vsphere", "automation", "snapshots"]
summary: "A step-by-step guide to automating vSphere snapshots using Terraform."
---
Here’s an **engaging Hugo Markdown guide** that documents the process in a fun and structured way! 🚀  

---

### **📜 Automating vSphere Snapshots with Terraform**  

*Ever wished you could take VM snapshots in vSphere without clicking through the UI?* **Welcome to automation heaven!** 🎉 With **Terraform**, we’ll set up a repeatable, scalable way to snapshot multiple VMs in one command.  

This guide will walk you through:  
✅ Setting up Terraform  
✅ Creating configuration files  
✅ Running the automation  
✅ Taking snapshots like a boss 😎  

---

## **🛠️ Prerequisites**
Before we begin, make sure you have:  
- ✅ **Terraform installed** → [Download Here](https://developer.hashicorp.com/terraform/downloads)  
- ✅ **Access to vSphere** (including your vCenter credentials)  
- ✅ **A Debian 12 system** (or similar Linux distro)  
- ✅ **List of VMs you want to snapshot**  

---

## **📂 Step 1: Create Your Terraform Project**
First, create a directory to store your Terraform files:  
```bash
mkdir -p ~/vm/terraform/snapshots && cd ~/vm/terraform/snapshots
```

---

## **📄 Step 2: Create the Configuration Files**
Terraform uses several config files. Let’s create them one by one.  

### **1️⃣ `main.tf` - The Core Configuration**
Create a file called **`main.tf`** and add the following:  

```hcl
provider "vsphere" {
  vsphere_server       = var.vsphere_server
  user                 = var.vsphere_username
  password             = var.vsphere_password
  allow_unverified_ssl = var.vsphere_insecure
}

data "vsphere_datacenter" "datacenter" {
  name = var.vsphere_datacenter
}

data "vsphere_virtual_machine" "vms" {
  for_each      = toset(var.vm_names)
  name          = each.key
  datacenter_id = data.vsphere_datacenter.datacenter.id
}

resource "vsphere_virtual_machine_snapshot" "snapshots" {
  for_each            = data.vsphere_virtual_machine.vms
  virtual_machine_uuid = each.value.id
  snapshot_name        = format("snapshot-%s-%s", each.key, timestamp())
  description          = "Scheduled snapshot via Terraform"
  memory               = true
  quiesce              = true
}
```
🔥 **What this does:**  
- Connects to vSphere  
- Finds the datacenter and VMs  
- Creates a snapshot for each VM  

---

### **2️⃣ `variables.tf` - Making It Configurable**
Create a file called **`variables.tf`** and add:  

```hcl
variable "vsphere_server" {}
variable "vsphere_username" {}
variable "vsphere_password" {}
variable "vsphere_insecure" {
  type    = bool
  default = true
}
variable "vsphere_datacenter" {}

variable "vm_names" {
  type    = list(string)
  default = [
    "VM1",
    "VM2",
    "VM3
  ]
}
```
🔥 **Why this rocks:**  
- Stores all VM names in one place for easy changes  

---

### **3️⃣ `terraform.tfvars` - Securely Store Credentials**
Create a **`terraform.tfvars`** file to store your credentials (DO NOT COMMIT THIS FILE! 🚨).  

```hcl
vsphere_server     = "your-vcenter-server"
vsphere_username   = "your-username"
vsphere_password   = "your-password"
vsphere_insecure   = true
vsphere_datacenter = "Your-Datacenter-Name"
```
🔥 **Why this is important:**  
- Keeps sensitive info separate  
- Terraform loads this automatically  

---

## **🚀 Step 3: Run the Automation**
Now, let’s put everything together and **run Terraform!**  

### **1️⃣ Initialize Terraform**
```bash
terraform init
```
💡 *This downloads the vSphere provider and prepares Terraform.*  

### **2️⃣ Check the Execution Plan**
```bash
terraform plan
```
💡 *This shows what Terraform will do before making changes.*  

### **3️⃣ Apply the Configuration**
```bash
terraform apply -auto-approve
```
💡 *This creates snapshots for all listed VMs!* 🎉  

---

## **🎯 Step 4: Verify the Snapshots**
To make sure everything worked, check your vSphere UI:  
1. Log in to **vSphere Web Client**  
2. Navigate to one of the VMs in the list  
3. Click **Snapshots** → You should see the newly created snapshots! 🎊  

---

## **🔥 Bonus: Automate with a Cron Job**
Want to **run this on a schedule**? Use a cron job!  

1. Edit your crontab:
   ```bash
   crontab -e
   ```
2. Add this line to **run Terraform every night at 2 AM**:
   ```bash
   0 2 * * * cd ~/vm/terraform/snapshots && terraform apply -auto-approve
   ```
💡 *Now your snapshots run automatically!* 🤖  

---

## **✅ Wrapping Up**
🎉 **Congratulations!** You’ve successfully:  
✅ Set up Terraform for vSphere snapshots  
✅ Configured everything dynamically  
✅ Automated the process like a pro  

💡 **Next Steps:**  
- Try restoring a snapshot from vSphere UI  
- Explore Terraform state management  
- Set up email notifications for snapshot success/failure  

---
