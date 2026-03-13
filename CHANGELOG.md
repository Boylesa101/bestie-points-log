# Changelog

## 1.2.1 - 2026-03-13

- removed the rainbow from the splash screen and rebalanced the startup layout
- updated the splash branding to `BESTIE POINTS`
- changed the startup sound to a coin-style splash sound with a safe fallback if `/public/sounds/coin.mp3` is not present
- added a visible build hash in `Account -> Help & support` to make phone-version checks easier

## 1.2.0 - 2026-03-12

- reorganized the parent experience into a clearer `Home` and `Account` split
- added an Account hub with dedicated sections for child profile, points and rewards, sync and devices, settings, and help
- kept reward viewing and redeeming on the child-facing side while moving management flows into Account
- fixed the synced-family D1 foreign key failure by canonicalizing point-event device ownership on the server
- improved Worker error handling so D1 foreign key failures return a clean sync error instead of a raw crash

## 1.1.0 - 2026-03-11

- added a gentle language check for custom reasons, preset labels, and reward text
- added calmer wording suggestions with a soft override path for parents
- added a parent support sheet with Family Lives and NSPCC contact details
- kept tone-check controls local to each device in parent settings
- kept the existing PWA update prompt and daily reminder features in place
