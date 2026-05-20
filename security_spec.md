# Security Specification - MobiFix Manager

## Data Invariants
1. A Brand must have a name.
2. A Model must belong to a valid Brand.
3. An InventoryItem must have a valid Model ID and Category ID.
4. A SalesLog must record an existing item's ID at the time of sale.
5. Item quantity cannot be negative.
6. Only authenticated admins can modify inventory, brands, models, and settings.
7. Authenticated users can read all data (technicians using the tablet).

## The Dirty Dozen Payloads
1. Attempt to create a Brand without a name.
2. Attempt to create a Model without a brandId.
3. Attempt to update an InventoryItem's quantity to a negative number.
4. Attempt to create a SalesLog with a future timestamp.
5. Attempt to modify a SalesLog entry once created.
6. Attempt to delete a Brand that has associated Models (Logic check).
7. Attempt to update an InventoryItem without being authenticated.
8. Attempt to escalate privileges to Admin.
9. Attempt to inject very large strings into item names (Resource poisoning).
10. Attempt to change the `ownerId` of a document (if applicable).
11. Attempt to create a document with restricted "Ghost Fields" (e.g., `isVerified: true`).
12. Attempt to read PII if added in the future without ownership.

## Test Runner (Conceptual)
Verified manually via `firestore.rules.test.ts` (if environment permits) or following Phases 3-5.
