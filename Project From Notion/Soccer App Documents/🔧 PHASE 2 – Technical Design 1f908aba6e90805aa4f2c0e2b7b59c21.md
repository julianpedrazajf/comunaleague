# 🔧 PHASE 2 – Technical Design

---

## **🧱**

## **Core Architecture**

### **🔸 App Type:**

**Cross-platform mobile app** (iOS + Android) using React Native with optional future support for Web.

### **🔸 Architectural Style:**

**Modular, service-based backend** using REST API (GraphQL-ready) and a **component-based frontend**.

---

## **🛠️**

## **Technology Stack**

### **✅ Frontend (Mobile App)**

- **Framework:** React Native with TypeScript
- **UI Navigation:** React Navigation
- **State Management:** Context API + useReducer (or Redux Toolkit if complexity increases)
- **Internationalization (i18n):** react-i18next + expo-localization
- **Form Handling:** Formik + Yup (for validation)
- **Design System:** Custom components or libraries like NativeBase or React Native Paper
- **Device Storage:** AsyncStorage (for auth tokens, language prefs, etc.)

---

### **✅ Backend**

- **Language & Framework:** Node.js with Express or NestJS
- **Authentication:** Firebase Auth or Auth0
- **Database:** PostgreSQL (hosted on Supabase or Railway)
- **Email & Notifications:** Firebase Cloud Messaging (push) + Nodemailer (optional)
- **Storage:** Firebase Storage or AWS S3 (for profile pictures & team badges)
- **Payments:** Stripe or MercadoPago integration
- **Deployment:** Railway (recommended for simplicity) or Render

**📄 Data Models (Initial)**

| **Entity** | **Key Fields** |
| --- | --- |
| **Users** | name, last name, email, age, country, city, preferred position, preferred foot, height, skill level, favorite team, profile picture |
| **Teams** | name, badge, format (5/11), player list, owner (userId), createdAt |
| **Tournaments** | name, type (league/daily), format, start date, location, registration deadline, price |
| **Matches** | date, time, location, teams, result, confirmed players |
| **Registrations** | userId/teamId, tournamentId, status, paymentId |
| **Messages** | from, to, content, timestamp |

**🌐 API Routes (REST)**

| **Endpoint** | **Purpose** |
| --- | --- |
| POST /auth/login | Authenticate user |
| POST /auth/register | Create user + profile |
| GET /home/tournaments | List tournaments |
| POST /teams | Create a team |
| POST /teams/:id/invite | Invite players |
| GET /matches/schedule | Retrieve match calendar |
| POST /register/team | Register a team to tournament |
| POST /register/player | Register solo player |
| GET /messages | Fetch inbox messages |
| POST /payment/checkout | Process payment via Stripe |

## **🧰 Developer Tools**

- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions (auto deploy on push)
- **API Testing:** Postman or Insomnia
- **Error Tracking:** Sentry (optional)
- **Documentation:** Swagger for API docs, Notion for internal notes

---

## **🌍 Multilingual Support (EN/ES)**

- Store JSON files in locales/ (e.g., en.json, es.json)
- Wrap all text in t('key_name') using react-i18next
- Detect language with device locale or user preference

---

## **🔐 Security Considerations**

- Token-based authentication (JWT via Firebase or Auth0)
- Secure password handling
- Input validation on backend and frontend
- Role-based access (e.g., player vs. admin – coming later)

---

## **💡 Ready-to-Build Modules (based on MVP)**

- Auth & Onboarding
- Profile Setup
- Home with read-only Guest Mode
- Team Management
- Tournament Registration
- Match Schedule
- Inbox Messaging
- One Game Mode
- Create / Join Team
- Multilingual Support (EN/ES)

## **🧰 Developer Tools**

- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions (auto deploy on push)
- **API Testing:** Postman or Insomnia
- **Error Tracking:** Sentry (optional)
- **Documentation:** Swagger for API docs, Notion for internal notes

---

## **🌍 Multilingual Support (EN/ES)**

- Store JSON files in locales/ (e.g., en.json, es.json)
- Wrap all text in t('key_name') using react-i18next
- Detect language with device locale or user preference

---

## **🔐 Security Considerations**

- Token-based authentication (JWT via Firebase or Auth0)
- Secure password handling
- Input validation on backend and frontend
- Role-based access (e.g., player vs. admin – coming later)

---

## **💡 Ready-to-Build Modules (based on MVP)**

- Auth & Onboarding
- Profile Setup
- Home with read-only Guest Mode
- Team Management
- Tournament Registration
- Match Schedule
- Inbox Messaging
- One Game Mode
- Create / Join Team
- Multilingual Support (EN/ES)