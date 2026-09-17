# Supabase

Schema lives in `migrations/20260916140000_create_core_tables.sql`.

## Tables

- `profiles` — app user; one row per `auth.users` row (same UUID, created by trigger)
- `playgrounds` — a group of friends
- `playground_members` — who is in each group (`admin` | `member`); the creator is added as admin automatically

Bets and points are not here yet.

For local Auth without SMTP, disable **Confirm email** in Authentication → Providers → Email.
