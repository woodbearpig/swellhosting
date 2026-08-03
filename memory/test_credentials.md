# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## Admin Credentials (Seeded at startup)
- Email: admin@swelldesignla.com
- Password: swell2025
- Role: admin
- Name: Swell Admin

## Notes
- Admin credentials are seeded idempotently on backend startup
- Password is hashed using bcrypt before storage
- JWT tokens are used for authentication (Bearer token in Authorization header)
