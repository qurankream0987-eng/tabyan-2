---
name: Tabyan video attachment proof
description: Security contract for Placement and teacher KYC video uploads.
---

Video Placement and teacher KYC uploads use HMAC proofs signed with the existing session secret. The issued proof binds the authenticated user, role, explicit purpose, and object path; finalize verifies that proof, the object, and the actual ffprobe result, then returns a short-lived finalized proof containing the measured duration. Submit mutations verify the finalized proof instead of trusting a client-supplied duration or path.

**Why:** Object Storage paths and client metadata alone do not prove ownership, purpose, or that the uploaded bytes are a valid video. A stateless signed proof prevents path/proof swapping across users and works consistently between the API route and tRPC without storing video bytes or adding process-local state.

**How to apply:** Keep Placement on the measured 45–300 second range, keep KYC role/purpose binding strict, and use the finalized proof returned by `/api/storage/uploads/finalize` for `student.submitPlacement` or `teacher.submitKyc`.