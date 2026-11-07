# Security Specification - Barbearia Afonso Cortes

## Data Invariants
1. A barber must have a name, role, and active status.
2. A service must have a name, category, price, and duration.
3. An appointment must belong to a barber and a service, and have a client name and phone.
4. Admin changes must record who made the change and when.
5. Clients can only see their own appointments (via phone number search) or public shop info.
6. Only authenticated admins/barbers can modify shop config, services, and team.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Creating an appointment for another person.
2. **Privilege Escalation**: A barber giving themselves admin access.
3. **Ghost Field Update**: Adding a hidden field to shop config.
4. **ID Poisoning**: Using a 1MB string as a barber ID.
5. **PII Leak**: A client fetching all appointments to get other people's phone numbers.
6. **Price Tampering**: A client creating an appointment with a $0 price.
7. **Temporal Fraud**: Setting an appointment createdAt to the future.
8. **Relational Orphan**: Creating an appointment for a non-existent barber.
9. **Status Shortcutting**: A client marking their own appointment as 'concluido'.
10. **State Corruption**: Updating a terminal 'cancelado' appointment back to 'pendente'.
11. **Mass Deletion**: An unauthenticated user attempting to delete the shop config.
12. **Unverified Admin**: A user with an unverified email attempting to log admin changes.

## Test Runner Plan
I will create a comprehensive `DRAFT_firestore.rules` and then verify it.
