# enclet

## IMPORTANT NOTICE

**DO NOT USE IN PRODUCTION.** Just a toy!

This application can be insecure, not audited by any security experts.

## What

Simple end-to-end encrypted backup tool.

## Commands

- init
    - Generate fresh encryption key and setup local configuration. Master password is set.
- backup
    - Update backup
- restore
    - Restore from backup directory. Master password is required.
- verify
    - Verify backup

## Mechanism

- Use single master password (no store anywhere)
- Salt is generated and stored in backup (to restore)
- Data encryption key (DEK) is derived from the master password and the salt using key derivation function (KDF)
- Data are encrypted with AES algorithm using DEK

```
    master password <- user given

    salt <--[random]-- *      | on init
    salt <--[copy]-- backup   | on restore

    password --[derive(salt)]--> DEK

    data --[encrypt(DEK)]--> backup
    data <--[decrypt(DEK)]-- backup
```
