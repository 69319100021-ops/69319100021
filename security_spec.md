# Security Specification & Hardening Audit

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every `/users/{userId}` document and all subcollections (`/transactions/{transactionId}`, `/budgets/{monthKey}`) belong strictly to `request.auth.uid == userId`. No cross-user reads, lists, creates, updates, or deletes are allowed.
2. **PII Protection**: `UserProfile` contains `email`. Blanket `list` on `/users` is denied; `get` is restricted exclusively to the owner (`request.auth.uid == userId`).
3. **Verified Identity for Writes**: All write operations (`create`, `update`, `delete`) require `request.auth != null && request.auth.token.email_verified == true`.
4. **Master Gate Parent Existence**: Writes to `/users/{userId}/transactions/{transactionId}` and `/users/{userId}/budgets/{monthKey}` verify that the parent `/users/{userId}` document exists.
5. **Immutable Ownership & Creation Timestamps**: `uid`, `userId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
6. **Strict Schema & Bounds**: Unknown/ghost fields are rejected via `keys().hasAll(...)` + `keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update. Amounts are finite numbers in `(0, 100000000]` for transactions and `[0, 100000000]` for budgets. Strings enforce explicit `.size()` bounds and regex patterns (`date`, `monthKey`, document IDs).

## 2. Adversarial "Dirty Dozen" Payloads (Must All Return PERMISSION_DENIED)
1. **Cross-Tenant Read**: User B attempts `get(/users/userA/transactions/tx1)`.
2. **Blanket User List**: Signed-in User A attempts `list(/users)` to scrape emails.
3. **Unverified Email Write**: User A with `email_verified: false` attempts `create` on `/users/userA/transactions/tx1`.
4. **UID Spoofing on Create**: User A attempts `create` on `/users/userA/transactions/tx1` with `{ userId: "userB", ... }`.
5. **Shadow / Ghost Field Injection**: User A attempts `create` on `/users/userA/transactions/tx1` with extra field `{ isAdmin: true }`.
6. **Negative / Zero Amount Injection**: User A attempts `create` on `/users/userA/transactions/tx1` with `{ amount: -500 }`.
7. **Invalid Type Enum**: User A attempts `create` with `{ type: "transfer" }` instead of `"income"` or `"expense"`.
8. **Malformed Date / MonthKey Mismatch**: User A attempts `create` with `{ date: "2026-11-15", monthKey: "2026-10" }` or oversized string.
9. **Client Timestamp Forgery**: User A attempts `create` with `{ createdAt: Timestamp.fromDate(new Date('2020-01-01')) }` instead of `serverTimestamp()`.
10. **Immutable Field Mutation**: User A attempts `update` on `/users/userA/transactions/tx1` changing `userId` or `createdAt`.
11. **ID Poisoning**: User A attempts `create` at `/users/userA/transactions/` with a 200-char or invalid-character ID (`tx$bad!`).
12. **Orphan Subcollection Write**: User A attempts `create` on `/users/userA/transactions/tx1` before `/users/userA` exists.
