---
title: "🚀 Using Terraform with vSphere: A Step-by-Step Guide"
date: 2025-02-18T18:19:49+13:00
draft: false
author: "James"
tags: ["Terraform", "vSphere", "Infrastructure as Code", "VM"]
summary: "Terraform Provisioning"
---


# 🛠️ Terraform + vSphere = A Match Made in Cloud Heaven ☁️

Terraform is a powerhouse for Infrastructure as Code (IaC) that lets you automate your VM provisioning process on VMware vSphere. Whether you’re a seasoned pro or just dipping your toes into automation, this guide will take you step by step through the process of using Terraform with vSphere to get your virtual machines (VMs) up and running in no time!

## 🔥 Prerequisites

Before you dive in, make sure you have the following:

- 🌍 A running vSphere environment with access to **vCenter**.
- ⚙️ **Terraform** installed on your machine (You can grab it [here](https://www.terraform.io/downloads.html)).
- 🧑‍💻 The necessary **permissions** to create and manage VMs.
- 🖼️ An existing **VM template** or **clone** for deployment (I have prebuilt a golden image).

(https://github.com/vmware-samples/packer-examples-for-vsphere/tree/develop/terraform/vsphere-role) Is a good place to start, this repo has the get starting templates to build templates with Packer. I have linked the folder which adds the correct roles to the user in vSphere as its quite lengthy doing it manually. 

I had used this as a guide to give my Terraform vSphere user the least privilege roles. 



## 🛠️ Step 1: Build the Terraform Image from a Clone

Let’s kick things off by creating a VM from an existing clone in vSphere. Why a clone? It ensures consistency and speeds up deployment – plus, Terraform does all the hard work for you! 🙌

### 1.1. Terraform Configuration

Create a file called `main.tf` with the following structure:

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

data "vsphere_network" "network" {
  name          = var.vsphere_network
  datacenter_id = data.vsphere_datacenter.datacenter.id
}

data "vsphere_compute_cluster" "cluster" {
  name          = var.vsphere_cluster
  datacenter_id = data.vsphere_datacenter.datacenter.id
}

data "vsphere_resource_pool" "pool" {
  name          = format("%s%s", data.vsphere_compute_cluster.cluster.name, "/Resources")
  datacenter_id = data.vsphere_datacenter.datacenter.id
}

data "vsphere_datastore" "datastore" {
  name          = var.vsphere_datastore
  datacenter_id = data.vsphere_datacenter.datacenter.id
}

data "vsphere_virtual_machine" "template" {
  name          = var.vsphere_template
  datacenter_id = data.vsphere_datacenter.datacenter.id
}

resource "vsphere_virtual_machine" "vm" {
  name                    = var.vm_name
  folder                  = var.vsphere_folder
  num_cpus                = var.vm_cpus
  memory                  = var.vm_memory
  firmware                = var.vm_firmware
  efi_secure_boot_enabled = var.vm_efi_secure_boot_enabled
  guest_id                = data.vsphere_virtual_machine.template.guest_id
  datastore_id            = data.vsphere_datastore.datastore.id
  resource_pool_id        = data.vsphere_resource_pool.pool.id
  network_interface {
    network_id = data.vsphere_network.network.id
  }
  disk {
    label            = "disk0"
    size             = data.vsphere_virtual_machine.template.disks[0].size
    eagerly_scrub    = data.vsphere_virtual_machine.template.disks[0].eagerly_scrub
    thin_provisioned = data.vsphere_virtual_machine.template.disks[0].thin_provisioned
  }
  clone {
    template_uuid = data.vsphere_virtual_machine.template.id
  }
  lifecycle {
    ignore_changes = [
      clone[0].template_uuid,
    ]
  }
  extra_config = {
    "guestinfo.metadata"          = base64encode(file("${path.module}/metadata.yml"))
    "guestinfo.metadata.encoding" = "base64"
    "guestinfo.userdata"          = base64encode(file("${path.module}/userdata.yml"))
    "guestinfo.userdata.encoding" = "base64"
  }
}
```

In this config, you're telling Terraform to create a VM based on a template and applying some basic customisations. 🎨

---

## ⚡ Step 1.2: Add The Variables

Add a `variables.tfvars` file: 

The Terraform configuration file for managing infrastructure with vSphere. It defines a set of variables that will be used to configure various aspects of a virtual machine (VM) and vSphere infrastructure.

```bash
##################################################################################
# VARIABLES
##################################################################################

# Credentials

vsphere_server   = "vcenter_IP"
vsphere_username = "administrator@vsphere.local"
vsphere_password = "vcenter_password"
vsphere_insecure = true

# vSphere Settings

vsphere_datacenter = "Datacenter"
vsphere_cluster    = "cluster"
vsphere_datastore  = "cluster"
vsphere_folder     = "folder"
vsphere_network    = "network"
vsphere_template   = "Debian 12 Template"

# Virtual Machines Settings

vm_name                    = "golden-image-staging"
vm_cpus                    = 8
vm_memory                  = 4096
vm_firmware                = "efi"
vm_efi_secure_boot_enabled = true

```


## ⚡ Step 2: Initialize Terraform

Before you get rolling, you’ll need to initialise your Terraform project. 

Run this command to get things set up:

```bash
terraform init
```

This command does the following:

- Downloads the necessary **providers**.
- Prepares the backend for storing **state**.
- Validates your configuration files and ensures there are no glaring issues. ✅

---

## 🎯 Step 3: Plan and Build the VM

Time to see the magic unfold! First, let's run a dry-run to check what Terraform will do:

```bash
terraform plan
```

If everything looks good, it’s showtime! Apply the changes and let Terraform work its charm:

```bash
terraform apply
```

You’ll be prompted to confirm. Type **`yes`** and hit Enter. 🎉

After the magic happens, your new VM will be ready to go in vSphere! 🚀

---

## ✨ Creating a New VM Without Editing an Existing One

I only note this part since I had a slight hiccup as I had edited/replaced the VM I had just built!

By default, Terraform keeps track of all your resources in a file called `terraform.tfstate`. If you reapply, it will modify existing resources, which can be a little... risky! 😬

### 4.1. Use a Different Terraform State File

To avoid modifying your current VM, you can use a fresh state file by running this command:

```bash
terraform apply -state=new_vm.tfstate
```

This tells Terraform to treat the new VM as a **new and independent resource**, giving you peace of mind. 😌

---

## 🏁 Conclusion

Boom! You're now a Terraform wizard in vSphere. 🧙‍♂️ By using Terraform’s powerful state management and automation, you can streamline your VM creation process, ensuring consistency and minimising human error. No more manual VM juggling—let Terraform handle the heavy lifting!


---


## Afterthoughts 

I want to secure the variables file either by using .env file, setting environment variables on the host or using Hashicorp vault. 

At the present time as I am rebuilding my SOC SIEM Lab I hope to come back and add further security enhancements.!

```

