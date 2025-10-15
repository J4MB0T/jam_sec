---
title: "Mounting SMB Shares on Proxmox Backup Server"
date: 2025-10-15T21:12:00+01:00
draft: false
tags: ["proxmox", "backup", "smb", "nas", "storage"]
categories: ["Virtualization", "Storage"]
authors: ["James"]
summary: "A comprehensive guide to mounting SMB shares on Proxmox Backup Server for automated backups."
---

# Mounting SMB Shares on Proxmox Backup Server

This guide provides step-by-step instructions for mounting an SMB share on a Proxmox Backup Server (PBS) to use as a backup destination.

## Prerequisites

- Root access to Proxmox Backup Server
- CIFS utilities installed (install with `apt install cifs-utils` if needed)
- Valid SMB share credentials
- Network connectivity to the SMB server (e.g., QNAP NAS)

## 1. Install Required Packages

Ensure CIFS utilities are installed:

```bash
apt update
apt install cifs-utils
```

## 2. Create Credentials File

Create a secure file to store your SMB credentials:

```bash
nano /etc/samba/.smbcreds
```

Add your credentials in the following format:

```
username=your_username
password=your_password
domain=WORKGROUP_OR_DOMAIN
```

Set proper permissions on the credentials file:

```bash
chmod 600 /etc/samba/.smbcreds
```

## 3. Create Mount Point

Create a directory where the SMB share will be mounted:

```bash
mkdir -p /mnt/qnap-backup
```

## 4. Test the SMB Mount

Test mounting the share manually before making it permanent:

```bash
mount -t cifs //10.10.40.20/pve-backup /mnt/qnap-backup \
  -o credentials=/etc/samba/.smbcreds,uid=34,gid=34,file_mode=0700,dir_mode=0700,iocharset=utf8
```

### Troubleshooting Common Issues

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `Operation not supported` | SMB version mismatch | Try adding `vers=2.1` or `vers=2.0` to mount options |
| `Permission denied` | Incorrect credentials | Verify username/password in credentials file |
| `No route to host` | Network connectivity issue | Check network connection and firewall rules |
| `No such file or directory` | Incorrect share path | Verify the SMB share path and name |

## 5. Configure Automatic Mount at Boot

Add the following line to `/etc/fstab` to mount the share automatically on boot:

```
//10.10.40.20/pve-backup /mnt/qnap-backup cifs credentials=/etc/samba/.smbcreds,uid=34,gid=34,file_mode=0700,dir_mode=0700,iocharset=utf8 0 0
```

Test the fstab entry by running:

```bash
mount -a
```

## 6. Verify the Mount

Check if the share is mounted correctly:

```bash
df -h | grep qnap-backup
```

View recent mount logs:

```bash
dmesg | tail -n 20
```

## 7. Configure Proxmox Backup Server

Now that the SMB share is mounted, you can configure Proxmox Backup Server to use it as a datastore:

1. Log in to the Proxmox Backup Server web interface
2. Navigate to "Datastore" in the left sidebar
3. Click "Add" and select "Directory"
4. Enter the following details:
   - ID: Choose a name (e.g., `nas-backup`)
   - Directory: `/mnt/qnap-backup`
   - Content types: Select appropriate options (e.g., backups, ISO images)
5. Click "Add" to create the datastore

## Security Considerations

- **Credentials Security**: The credentials file should only be readable by root
- **Network Security**: Consider using a dedicated backup network or VLAN
- **Firewall Rules**: Ensure proper firewall rules are in place to protect the SMB traffic
- **Regular Testing**: Periodically test the backup and restore process

## Troubleshooting

### Checking SMB Version

To check the SMB version supported by your NAS:

```bash
smbclient -L //10.10.40.20 -U your_username
```

### Viewing Mount Options

To see current mount options:

```bash
mount | grep qnap-backup
```

### Forcing Unmount

If you need to unmount the share:

```bash
umount -l /mnt/qnap-backup
```

## Conclusion

Yo have successfully mounted an SMB share to your Proxmox Backup Server. This setup allows you to use network-attached storage for your Proxmox backups, providing additional storage capacity and flexibility for your backup strategy.

For production environments, consider implementing additional monitoring to ensure the mount remains available and functional.
