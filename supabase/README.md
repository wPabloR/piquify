# Supabase

Schema lives in `migrations/`.

## Tables

- `profiles` — app user; one row per `auth.users` row (same UUID, created by trigger)
- `playgrounds` — a group of friends
- `playground_members` — who is in each group (`admin` | `member`); the creator is added as admin automatically
- `bets` — a pique inside a playground (title, stake, deadline, status)
- `bet_options` — closed options for a pique
- `bet_participants` — who joined a pique and which option they picked
- `account_movements` — immutable points ledger (`signup`, `pique_join`, `pique_leave`, `pique_win`, `pique_refund`)
- `profiles.balance` — current points; 200 on signup
- `residual_pots` — remainder of an integer split, tagged with the exact participant set

For local Auth without SMTP, disable **Confirm email** in Authentication → Providers → Email.
