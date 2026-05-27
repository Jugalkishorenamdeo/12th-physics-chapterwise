# Security Spec for 12th Physics Quiz App

## 1. Data Invariants
- **Users**:
  - Every user document ID must match their authentication UID.
  - Role can only be changed by an existing admin (verified via `exists()` check).
  - Students cannot set themselves as admins during registration.
- **Questions**:
  - Only admins can manage the question bank.
  - Questions must have all required fields (topic, difficulty, correctOption).
- **Attempts**:
  - `userId` in the payload must match `request.auth.uid`.
  - Attempts are immutable once created (no updates allowed).
  - Admins can delete attempts for management purposes.
- **Settings**:
  - Single document `config` in `settings` collection.
  - Only admins can update settings.

## 2. The "Dirty Dozen" Payloads
1. **Self-Promotion**: Student tries to create/update their profile with `role: 'admin'`.
2. **Attempt Hijacking**: Student tries to save an attempt with `userId: 'someone_else_uid'`.
3. **Admin settings sabotage**: Student tries to set `maintenanceMode: true`.
4. **Question Deletion**: Student tries to delete a question via Firestore SDK.
5. **Score Injection**: Student tries to update an existing attempt to increase their score.
6. **Bulk Read Leak**: Student tries to list the entire `users` collection.
7. **Resource Poisoning**: User tries to create a profile with a 1MB `displayName`.
8. **Orphaned Attempt**: Student tries to save an attempt for a non-existent topic (if validation enforced).
9. **Shadow Data**: Attacker tries to add `isVerified: true` to a question document.
10. **ID Injection**: Attacker tries to create a question with a document ID that is 2KB long.
11. **PII Leak**: Student tries to `get` another student's profile directly using their UID.
12. **Query Scrape**: Student tries to list `attempts` without a `where` clause filtering by their own `userId`.

## 3. Test Runner (firestore.rules.test.ts)
```typescript
// Skeleton for testing (to be implemented if testing environment was available)
// 1. Test: Non-owner cannot read user profile -> Expect PERMISSION_DENIED
// 2. Test: Student cannot write to questions -> Expect PERMISSION_DENIED
// 3. Test: Student cannot write attempt for another user -> Expect PERMISSION_DENIED
// 4. Test: Attempts are immutable -> Expect PERMISSION_DENIED on update
```
