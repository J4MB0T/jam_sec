---
title: "Useful Notes"
date: 2024-08-25T13:38:26Z
draft: false
author: "James"
tags: 
  - "Security"
  - "Penetration-Testing"
  - "Linux"
summary: "A page dedicated to quick and easy commands used."
---

## Introduction

I have decided to start progressing on Hack The Box while I have some free time to sharpen my skills and knowledge. 

## Useful commands 

#### Nmap

```nmap -F IPADDRESS``` - Fast scan the top 100 ports
```nmap -sV IPADDRESS``` - Service version detection
```nmap -O IPADDRESS``` - Operating system detection 
```nmap -sT IPADDRESS```- TCP Scan
```nmap -p- IPADDRESS```- Scan all ports

#### SMB

```smbclient -L``` is used to list file shares.

```smbclient -L \\IPADDRESS -U anonymous```
  Use tag "-W" to specify the workgroup.

Use ```get``` & ```put``` retrospecifively to download/upload files.

#### Redis
```redis-cli -u redis://host:port``` - To connect
```redis-cli -h``` - To get hostname

Once connected, run the ```info``` command to get the information about the system. 

Run the ```select``` command to enter the database.

#### Samba

```smbmap -H 10.10.10.3``` - Find shares