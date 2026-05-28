# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amateur soccer tournament management app for Colombia (Cali-first). Players register solo or with teams; organizers manage tournaments, schedules, and payments. Bilingual EN/ES from day one.

**Status:** Pre-development. All planning is in `Project From Notion/Soccer App Documents/`. No code exists yet.

---

## Tech Stack

**Frontend**
- React Native + TypeScript via Expo
- React Navigation (stack + tab navigators)
- Context API + useReducer for state (upgrade to Redux Toolkit only if complexity demands it)
- Formik + Yup for all forms
- react-i18next + expo-localization for EN/ES
- AsyncStorage for auth tokens and language preference

**Backend / Services**
- Supabase: PostgreSQL database + auth + file storage (preferred over a custom Node.js API at MVP stage)
- Firebase Auth as auth alternative if Supabase Auth is insufficient (email, Google, Apple)
- Firebase Cloud Messaging for push notifications
- MercadoPago for payments (Colombia market; Stripe is secondary option)

**Hosting:** Railway or Render for any custom backend functions

---

## Commands

Once the Expo project is initialized, standard commands will be:

```bash
npx expo start          # Start dev server
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npx expo run:ios        # Native build for iOS
npx expo run:android    # Native build for Android

npx tsc --noEmit        # Type check without building
npx eslint .            # Lint
npx jest                # Run all tests
npx jest --testPathPattern=<file> # Run a single test file
```

---

## Architecture

### Planned Folder Structure (Expo + TypeScript)

```
src/
  screens/          # One file per screen
  components/       # Reusable UI components
  navigation/       # React Navigation stack/tab definitions
  hooks/            # Custom hooks
  context/          # Context providers (Auth, Language, etc.)
  services/         # Supabase client, API calls, FCM
  locales/          # en.json, es.json translation files
  utils/            # Shared helpers
  types/            # Shared TypeScript types/interfaces
```

### Navigation Structure

```
RootNavigator
  ├── AuthStack (unauthenticated)
  │     ├── SplashScreen
  │     ├── GuestHomeScreen   ← read-only; any tap → Login
  │     ├── LoginScreen
  │     └── RegisterScreen → ProfileSetupScreen
  └── AppTabs (authenticated)
        ├── HomeScreen
        ├── MyTeamScreen
        ├── MatchScheduleScreen
        ├── InboxScreen
        └── ProfileScreen
            (+ modal stacks: JoinTeam, CreateTeam, OneGame)
```

### Data Models

| Entity | Key Fields |
|---|---|
| Users | name, lastName, email, age, country, city, position, foot, height, skillLevel, favoriteTeam, avatarUrl |
| Teams | name, badgeUrl, format (5\|11), playerIds, ownerId, createdAt |
| Tournaments | name, type (league\|daily), format, startDate, location, registrationDeadline, price |
| Matches | date, time, location, homeTeamId, awayTeamId, result, confirmedPlayerIds |
| Registrations | userId\|teamId, tournamentId, status, paymentId |
| Messages | fromId, toId, content, timestamp |

### API / Supabase Pattern

All data access goes through `src/services/`. Never call Supabase directly from screens or components — always through a service function. This keeps screens clean and makes backend swaps easier.

### Internationalization

All user-visible strings must use `t('key')` from react-i18next. Translation files live in `src/locales/en.json` and `src/locales/es.json`. Language is detected via `expo-localization` on first launch and can be overridden in profile settings (persisted to AsyncStorage).

---

## MVP Screens (Phase 3, Week 1–8)

| Week | Screens / Modules |
|---|---|
| 1–2 | Splash, Guest Home, Auth (Login + Register), Profile Setup |
| 3–4 | Home (full access), My Team, Match Schedule, One Game |
| 5–6 | Join Team, Create Team, Payment integration (MercadoPago sandbox) |
| 7–8 | Inbox, Push notifications, Language toggle |
| 9+ | Testing, polish, beta release |

---

## Key Decisions

- **Name candidates:** KickUp vs ComunaLeague — `comunaleague.app` and `@ComunaLeague` social handles available; KickUp .com is taken.
- **Brand colors:** `#F21D2F` `#F21D44` `#497373` `#F2B366` `#F25116`
- **Guest Mode:** All interactions on the guest home screen redirect to Login/Register — no data fetching needed for guests.
- **Organizer role** is post-MVP. For the Cali pilot, tournament data can be seeded directly into the database.
- **Payment at MVP:** Decide whether to use MercadoPago sandbox (mock) or real integration before Week 5.
