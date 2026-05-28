# 🧐 Explanation of each technology

Of course, Felipe. Here’s a **brief explanation of each technology** listed in **Phase 2**, so you and your team can clearly understand their roles:

---

### **🧩**

### **Frontend (Mobile App)**

| **Technology** | **Description** |
| --- | --- |
| **React Native** | Framework to build cross-platform mobile apps (iOS/Android) with one codebase using JavaScript/TypeScript. |
| **TypeScript** | JavaScript with static typing — makes your code more reliable and easier to scale. |
| **React Navigation** | Library to handle screen navigation (stacks, tabs, etc.) in React Native apps. |
| **Context API** | Built-in React state manager for sharing data across components. |
| **Formik** | Simplifies handling form inputs and state. |
| **Yup** | Schema-based form validation (works with Formik). |
| **i18n (react-i18next)** | Enables translation and language switching in your app. |
| **expo-localization** | Detects the user’s device language for setting the app’s default language. |
| **AsyncStorage** | Stores small amounts of persistent data locally on the user’s device (e.g., language, auth tokens). |

---

### **🧠**

### **Backend**

| **Technology** | **Description** |
| --- | --- |
| **Node.js** | JavaScript runtime for running backend code (server-side). |
| **Express.js** | Lightweight backend framework for building APIs with Node.js. |
| **NestJS** | Scalable backend framework using TypeScript and modular structure (optional alternative to Express). |
| **PostgreSQL** | Relational database that stores structured app data (users, teams, matches, etc.). |
| **Supabase** | Open-source Firebase alternative — PostgreSQL + auth + storage with a UI. |
| **Firebase Auth** | Provides secure user login via email, Google, or Apple. |
| **Auth0** | Identity platform to handle authentication and authorization. |
| **Firebase Cloud Messaging** | Sends push notifications to users (e.g., match reminders). |
| **Firebase Storage / AWS S3** | Stores user files like profile pictures and team badges. |
| **Stripe / MercadoPago** | Online payment processing platforms to handle tournament fees. |
| **Railway / Render** | Cloud platforms that host your backend, database, and APIs. |

---

### **🛠️**

### **Dev & Project Tools**

| **Tool** | **Description** |
| --- | --- |
| **Git** | Version control system — tracks code changes and history. |
| **GitHub** | Platform to host code, manage branches, and collaborate. |
| **GitHub Actions** | Automates testing and deployment when you push code. |
| **Postman** | Tool for testing your backend APIs (GET, POST, etc.). |
| **Swagger** | Generates live documentation for your APIs. |
| **Sentry** *(optional)* | Error tracking tool to monitor bugs in real-time. |

---

## **✅ Technologies You Should Study First (Foundational)**

### **1.**

### **JavaScript & TypeScript**

- 📌 Why: Core language for React Native and Node.js
- ✅ Learn:
    - Variables, functions, objects, arrays
    - async/await, promises
    - Basic typing in TypeScript

### **2.**

### **React Native**

- 📌 Why: Your entire frontend is built with it
- ✅ Learn:
    - How to create components and manage state
    - Navigation with React Navigation
    - Styling (StyleSheet, Flexbox)

### **3.**

### **React Navigation**

- 📌 Why: You’ll handle many screens and flows
- ✅ Learn:
    - Stack vs. Tab vs. Drawer navigation
    - Navigation parameters and guards

### **4.**

### **Formik + Yup**

- 📌 Why: You’re using forms for login, registration, profile setup
- ✅ Learn:
    - Creating form components
    - Handling validation schemas with Yup

### **5.**

### **Firebase Auth**

- 📌 Why: Handles login and user identity
- ✅ Learn:
    - Setting up auth providers (email, Google)
    - Managing login state and user data

### **6.**

### **REST APIs & HTTP Requests**

- 📌 Why: You’ll consume APIs in the frontend and build them in the backend
- ✅ Learn:
    - Making GET/POST requests (e.g., with Axios or Fetch)
    - Understanding JSON data flow

---

## **🛠️ Once you’re comfortable, study these next (optional for MVP, useful later):**

| **Tech** | **Why** |
| --- | --- |
| PostgreSQL (or Supabase) | To understand how your data is stored and queried |
| Node.js + Express | If you plan to build your own backend or understand what the API is doing |
| i18n | For implementing multilingual support |
| Git & GitHub | To manage code and collaborate effectively |
| Stripe or MercadoPago | For payments (Phase 2+ only) |