# Security Specification & Test-Driven Design (TDD) for Firebase Security Rules

## 1. Data Invariants
- Each Prompt document must belong to a authenticated user (`userId == request.auth.uid`).
- A prompt cannot be created with a generic/empty title or empty `promptText`.
- Only standard categories are allowed (e.g. YouTube, Marketing, Coding, Writing, General).
- Timestamps `createdAt` and `updatedAt` must match `request.time`.
- Users cannot read or write prompts that belong to other users (`resource.data.userId == request.auth.uid`).
- Maximum size limit on string fields and tag arrays to prevent "Denial Of Wallet" data inflation.

---

## 2. The "Dirty Dozen" Payloads (Malicious Payloads)
Below are 12 JSON payloads designed to violate the invariants. Our final security rules MUST block all of these with `PERMISSION_DENIED`.

1. **Spoofed Ownership Create**: Creator attempts to write a prompt with `userId` representing another user.
2. **Unauthenticated Read**: Reading prompts collection without signing in.
3. **Cross-User Prompt Extrapolating (Get)**: An authenticated user tries to view a prompt owned by another user.
4. **Cross-User Prompt Mutating (Update)**: Editing a prompt belonged to a different `userId`.
5. **No-Name Shadow Create**: Creating a prompt without a title.
6. **Malicious ID Injection**: Creating a prompt with a document ID containing special characters or long junk data (ID poisoning).
7. **Bypass Temporal Integrity**: Setting a hardcoded futuristic client-side `createdAt` timestamp instead of `request.time`.
8. **Immortality Variable Hijack (Update)**: Modifying `createdAt` or `userId` during an update.
9. **Zombie Modification**: Overwriting a whitelisted update payload with non-whitelisted properties (e.g., trying to sneak in `isVerified: true`).
10. **Array Injection (Overload)**: Submitting a prompt with a tags list of size 50 (max limit exceeded to overload resource).
11. **Huge Buffer Payload**: Writing a title containing a 50KB string.
12. **Unverified Email Signup/Create**: Creating resource with a signed-in account that has an unverified email (if email verification is strictly required).

---

## 3. The Test Runner (`DRAFT_firestore.rules` or `firestore.rules.test.ts` references)
To enforce strict testing, we'll verify these conditions in `firestore.rules`.
No query or edit bypassing is permitted.
The Master Gate pattern dictates that standard CRUD operations must be governed by helper functions `isValidPrompt` and identity checks.
