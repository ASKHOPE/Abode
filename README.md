# Abode - Simple Offline Property Management 🏡

![logo](https://github.com/user-attachments/assets/1c6c89c5-3b0d-48e3-8b41-48083cc4d4df)


Abode is a lightweight, browser-based web application designed for landlords and small property managers to easily manage properties, tenants, rent payments, and tasks. It operates entirely offline, storing all data directly in your browser's IndexedDB.


## ✨ Key Features

*   **Property Management:** Add, view, edit, and archive property details (address, floors, rooms).
*   **Tenant Management:** Track tenant information, link them to properties, manage lease dates, rent amounts, and archive tenants.
*   **Rent Payment Tracking:** Record rent payments with status (Paid, Partial, Overdue, etc.), amount, date, and month.
*   **Action Center:**
    *   Alerts for leases expiring within 3 months.
    *   Reminders for tenants with an 'Overdue' rent status.
    *   Summary of monthly rent collection progress.
    *   Simple To-Do list for personal tasks.
*   **Basic Authentication:** Simple user registration and login system.
*   **Offline First:** All data is stored locally in your browser using IndexedDB via `idb-keyval`. No internet connection required after initial load.
*   **Data Seeding:** Includes sample data on first launch for demonstration.
*   **Theming:** Basic color theming configured via Tailwind CSS.
*   **User Profile:** Update display name and password.

## 🛠️ Technology Stack

*   **Frontend:** Vue 3 (Composition API with `<script setup>`)
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (with Forms and Typography plugins)
*   **State Management:** Vue Reactivity (Refs, Computed) & Composables
*   **Routing:** Vue Router
*   **Local Storage:** IndexedDB (via `idb-keyval`)

## 🚀 Getting Started

1.  **Prerequisites:**
    *   Node.js (LTS version recommended)
    *   npm or yarn

2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/abode.git # Replace with your repo URL
    cd abode
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application should now be running, typically at `http://localhost:5173` (Vite's default).
5. **Default Credentials :**
    ```
    username: 'testuser',
    password: 'password123',
    # Use this data seeded credentials or register as new user.
    ```

## 📋 Usage

1.  **Register/Login:** On first visit, you'll likely need to register a user account using a username and password. Subsequently, log in.
2.  **Seed Data:** The first time the app loads with an empty database, it will populate with sample properties, tenants, payments, and tasks.
3.  **Navigate:** Use the links (or dashboard cards) to navigate between sections:
    *   **Properties:** Add your rental properties.
    *   **Tenants:** Add tenants and link them to properties.
    *   **Rent Tracking:** Log payments received.
    *   **Action Center:** View alerts, rent summary, and manage your To-Do list.
    *   **Profile:** Click your username in the header to manage your profile.
    *   **About:** Learn more about the application (contains usage tips).
4.  **Manage Data:** Use the Edit, Archive, and Delete buttons within each section to maintain your records.

*(See the "About" page within the application for more detailed usage steps).*

## ⚠️ Important Considerations & Limitations

*   **Frontend-Only / Local Storage:** **All data is stored exclusively in your web browser's IndexedDB storage on the specific computer and browser profile you use.**
    *   There is **no backend server** and **no cloud synchronization**.
    *   Data **will not** be available on other devices or browsers.
    *   **Clearing your browser's site data/cache for this application WILL permanently delete all your stored information.** Regular backups (if you implement an export feature) are crucial for important data.
*   **Insecure Authentication:** The current authentication system stores passwords in plaintext within IndexedDB. **This is NOT secure and is only suitable for demonstration, local development, or personal use where security is not a concern.** Do not use this application for sensitive real-world data in its current state without implementing proper backend authentication with password hashing.
*   **Single User (Implicit):** While registration exists, the application is primarily designed around the data stored in a single browser profile. There's no concept of shared data between different registered users on different machines.



## 📄 License & Author
Author : Arnold Sujan Katru | CSE 325 BYU-I

© 2025 WallEve. Open License For Personal Use and Non Commercial.
