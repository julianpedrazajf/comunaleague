# 🛠️ PHASE 3: Development

# **🛠️ PHASE 3 – Development Plan**

---

## **✅ Development Strategy**

### **🔧 Methodology:**

- **Agile & Modular** development in **milestones/sprints**
- Start with a **minimum viable version** of each screen → add enhancements later
- Use **GitHub Projects** or **Miro** for sprint planning + task boards

---

## **🔄 Core Development Phases**

### **🔹 Phase 1: Core MVP Build**

> Goal: Make the app usable from end to end with only essential logic, UI, and flows
> 

| **Module** | **Features** |
| --- | --- |
| **Splash & Guest Home** | Load app, show guest UI (read-only), redirect on interaction |
| **Auth** | Login + registration with Firebase/Auth0 |
| **Profile Setup** | Form (multi-step) for player data collection |
| **Home (Full Access)** | Main nav + scrollable content + embedded stats |
| **Team Management** | Create team, view squad, invite players |
| **Match Schedule** | Display matches + game info |
| **Solo Game (One Game)** | Simple join flow for daily games |
| **Join Team** | Browse open teams, apply or accept invite |
| **Create Team** | Team form with format, badge, roster |
| **Inbox** | Basic UI + hardcoded message list (mock) |
| **Language toggle** | Use i18n + device language for EN/ES |

### **🔹 Phase 2: Functional Enhancements**

> Goal: Add validations, real backend integration, UX polish
> 

| **Module** | **Enhancements** |
| --- | --- |
| **Form Validation** | Use Formik + Yup across all forms |
| **Payment Flow** | Integrate Stripe or MercadoPago sandbox |
| **Data Storage** | Connect PostgreSQL via Supabase / Prisma |
| **Image Upload** | Firebase Storage for profile + badge |
| **Push Notifications** | Match reminders (Firebase Cloud Messaging) |
| **Auth Guards** | Restrict screens for non-auth users |

### **🔹 Phase 3: Testing, Debug & Polish**

> Goal: Prepare app for soft launch or beta release
> 
- Manual user testing on both iOS and Android
- Test user flows (login → join team → register in league → check schedule)
- Polish UI (spacing, icons, accessibility labels)
- Translate entire UI for EN/ES switch
- Track issues in GitHub

**🧰 Dev Tools Setup**

| **Tool** | **Purpose** |
| --- | --- |
| **VS Code + GitHub Copilot** | Main dev environment |
| **Expo** | Quick React Native development |
| **Postman** | API test + mock |
| **Railway / Render** | Backend and DB hosting |
| **Figma** | Reference flow/UI |
| **Miro** | Task planning + feature roadmap |
| **GitHub Projects** | Sprint planning + code issue tracking |

**🗓️ Development Timeline Suggestion**

| **Sprint** | **Goals** |
| --- | --- |
| Week 1–2 | Splash, Guest Home, Auth, Profile Setup |
| Week 3–4 | Team features, Solo Game, Match Schedule |
| Week 5–6 | Payment, DB integration, Team Join/Create |
| Week 7–8 | Notifications, Inbox, Language toggle |
| Week 9+ | Testing, polishing, beta release |

**🧪 Testing Focus**

| **Area** | **Tool / Strategy** |
| --- | --- |
| **Frontend (UI)** | Manual + Expo testing |
| **Forms** | Formik validation |
| **Backend APIs** | Postman + mock responses |
| **Multilingual** | Visual review of EN/ES UI |
| **Performance** | React DevTools, loading state handling |

## **📲 Readiness for Beta Release**

Once Phase 3 is complete, your app should:

- Support login, full player onboarding, team building, and game registration
- Have working navigation, form validation, and basic feedback
- Be ready for testing in a **real tournament setting**