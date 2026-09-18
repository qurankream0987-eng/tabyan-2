# Tabyan Build 6 — Apple Review Accounts Audit

**Audit date:** 2026-09-04  
**Method:** read-only production database inspection; no records were created,
updated, deleted, or exposed.

## Decision

```text
STUDENT_REVIEW_ACCOUNT: FAIL
TEACHER_REVIEW_ACCOUNT: FAIL
SUPERVISOR_REVIEW_ACCOUNT: NOT_REQUIRED_FOR_CURRENT_APP_REVIEW_ACCOUNT
OTP_REQUIRED: NO (required review design)
REVIEW_ACCOUNTS_GATE: FAIL
```

The database is reachable, but the available data does not identify dedicated
Apple Review accounts. Login success cannot be tested without the credentials,
and passwords were intentionally not queried or printed.

## Safe production summary

The read-only aggregate query returned:

| Role | Active accounts | Accounts with password login data | Accounts with username | Verified email accounts |
|---|---:|---:|---:|---:|
| Student | 47 | 29 | 0 | 4 |
| Teacher | 11 | 4 | 0 | 0 |
| Admin | 1 | 1 | 1 | 0 |

These counts do not prove that any account is dedicated to Apple Review, has
safe test data, or can log in successfully. No names, emails, phone numbers,
password hashes, tokens, or credentials are included in this report.

## Required review-account contract

At minimum, prepare a stable student account. Prepare teacher and supervisor
accounts if those roles are exposed or necessary for Apple to inspect the
submitted app.

Each account must:

- be a dedicated test/review account;
- exist in the production environment;
- have a valid password-login path;
- require no OTP or manual approval;
- have role-specific safe data;
- remain active throughout the review period;
- use no personal data;
- be supplied to Apple only through the secure App Store Connect fields.

Use these placeholders in the final notes:

```text
[APPLE_REVIEW_STUDENT_USERNAME]
[APPLE_REVIEW_STUDENT_PASSWORD]
[APPLE_REVIEW_TEACHER_USERNAME]
[APPLE_REVIEW_TEACHER_PASSWORD]
[APPLE_REVIEW_SUPERVISOR_USERNAME]
[APPLE_REVIEW_SUPERVISOR_PASSWORD]
```

Do not place real credentials in Git, reports, chat, source files, or
screenshots. After the owner supplies approved credentials through the secure
process, run login checks without echoing values and update this document with
PASS/FAIL evidence only.