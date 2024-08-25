---
title: "Hack The Box"
date: 2024-08-25T13:38:26Z
draft: true
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

#### SMB

```smbclient -L``` is used to list file shares.

```smbclient -L \\IPADDRESS -U anonymous```
  Use tag "-W" to specify the workgroup.

Use ```get``` & ```put``` retrospecifively to download/upload files.
