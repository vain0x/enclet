# enclet

## IMPORTANT NOTICE

**DO NOT USE IN PRODUCTION.** Just a toy!

This application can be insecure, not audited by any security experts.

## What

Simple end-to-end encrypted backup tool.

## Install

*TODO*

## Usage

### Initialization Workflow

You need prepare a **master password** for data encryption.

**Don't forget the password, or unable to restore** from backup!

First of all, do:

```sh
enclet init

# Enter master password
# Enter source directory path
# Enter backup directory path
```

The command generates an *account* of the backup.
Configuration is saved in [user directory](#User-Directory).

### Backup workflow

The following command updates the backup. (Since configuration is done in init/restore workflow, this doesn't require any options.)

```sh
enclet backup
```

On the first backup, enclet creates `.enclet` directory in the backup directory, which includes the account.

To validate your backup is up-to-date, `enclet verify`.

### Restore Workflow

```sh
enclet restore

# Enter master password
# Enter target directory path
# Enter backup directory path
```

The target directory is where restored data would be written to.

#### Test Restoration Workflow

If you want to test the restoration in the same environment, temporarily rename [configuration](#User-Directory) to something else. After test, rename the directory to original.

## References

### Commands

- init
    - Generate fresh encryption key and setup local configuration. Master password is set.
- backup
    - Update backup
- restore
    - Restore from backup directory. Master password is required.
- verify
    - Verify backup

### File Exclusion with `.gitignore`

Optionally, `.gitignore` file in the root of the source directory specifies which files to be skipped to backup.

### User Directory

Init/restore command saves configuration in OS-specific place.

- `C:/Users/USERNAME/AppData/Local/enclet` on Windows
- `/home/USERNAME/.config/enclet` otherwise

## Appendix. Encryption Mechanism

- Use single master password (no store anywhere)
- Salt is generated and stored in backup (to restore.)
    - This is virtually the "account" of backup.
- Data encryption key (DEK) is derived from the master password and the salt using key derivation function (KDF)
- Data are encrypted with AES algorithm using DEK

```
    master password <--[type]-- user

    salt <--[random]-- *        # on init
    salt  --[copy]--> backup    # on backup
    salt <--[copy]--  backup    # on restore

    master password  --[derive(salt)]--> DEK

    data  --[encrypt(DEK)]--> backup    # on backup
    data <--[decrypt(DEK)]--  backup    # on restore
```
