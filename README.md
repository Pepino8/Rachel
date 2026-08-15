# 🤖 Rachel AutoPoster

**Rachel AutoPoster** is an automation and inventory management platform designed for sellers on **Gameflip**. It allows users to manage a local catalog of products, import existing listings directly from the marketplace, and automate the creation, rotation, and purging of listings via background agents, ensuring their inventory remains visible and active.

The project features a modern, responsive frontend (dark mode with glassmorphic designs and fluid transitions) and a secure backend with a local database and credential encryption.

---

## 🚀 Key Features

- **Local Product Catalog**: Register and keep track of items with custom images, detailed descriptions, official categories, and prices.
- **Quick Gameflip Import**: Paste the URL of any public Gameflip listing to automatically extract its name, description, price, and cover image, saving it directly as a new product in your local catalog.
- **Auto-Posting Agent**: A cyclic background bot that automatically publishes active products to your Gameflip store, keeping your listings at the top of search results.
- **Listing Purge Agent**: Instantly clears drafts and expired listings with one click or through automated cleanup rules.
- **Cryptographic Security**: Gameflip API keys and TOTP secrets are securely encrypted locally using **AES-256-GCM**.
- **Integrated TOTP Generation**: Automated two-factor authentication (2FA) for signing requests to the Gameflip API without manual user intervention.

---

## 📁 Project Architecture & Structure

The project is divided into two primary directories:

```text
Rachel/
├── Rachel-frontend/       # Client Web (React + Vite)
└── Rachel-backend/        # API Server (Node.js + Express + SQLite)
```

### 💻 Frontend (`Rachel-frontend`)
Built using a modern web stack focused on performance and seamless user experience.
* **React + Vite**: Fast compilation and Hot Module Replacement (HMR).
* **Tailwind CSS**: Premium responsive styles optimized for mobile, tablet, and desktop viewports.
* **Axios**: Communicates with the backend using session token authentication interceptors.
* **Core Components**:
  - `Login`: Simple entry portal with registration forms, animations, and error handling.
  - `Content`: Central dashboard displaying auto-posting logs, purge options, listing import panel, and the product list.
  - `CreateImport`: Manual product creation form and the new Gameflip listing URL import modal.
  - `ProductList` & `Product`: Catalog view with fast auto-post toggles, edit modals, and delete controls.
  - `Settings`: Credentials manager for API keys, TOTP codes, and user profiles.

### ⚙️ Backend (`Rachel-backend`)
A lightweight, fast API server acting as a secure proxy between your control panel and the Gameflip API.
* **Node.js & Express**: RESTful API server.
* **SQLite (better-sqlite3)**: Relational database storing users, products, listings, and logs.
* **Cloudinary**: Cloud-based storage for product images.
* **Zod**: Robust request body validation schemas.
* **JWT (JSON Web Tokens)**: Secure user session token auth.

---

## 🛠️ Installation & Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**

---

### Backend Setup (`Rachel-backend`)

1. Navigate to the backend directory:
   ```bash
   cd Rachel-backend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the backend folder using the following template:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_signing_secret_here
   ENCRYPTION_KEY=a_secure_32_character_aes_key_here
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   DATABASE_PATH=./rachel.db
   ```
4. Start the development server:
   ```bash
   npm start
   ```

---

### Frontend Setup (`Rachel-frontend`)

1. Navigate to the frontend directory:
   ```bash
   cd ../Rachel-frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the frontend folder pointing to your local backend server:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
4. Start the application:
   ```bash
   npm run dev
   ```
5. Open the Vite local dev URL (usually `http://localhost:5173/`) in your browser.

---

## 📊 Database Schema (SQLite)

The system automatically generates the SQLite database file `rachel.db` and sets up the following schema on its first run:

1. **`users`**: Stores local profiles and encrypted Gameflip credentials.
2. **`products`**: Your local inventory catalog used as templates for automation.
3. **`listings`**: Keeps track of active or completed listings on the marketplace mapped to local products.
4. **`agent_logs`**: Logs detailed events and errors executed by the auto-posting and purge agents.

---

## 🛡️ Security & Contributions
* **Local Encryption**: This tool does **not** store your Gameflip credentials in plain text. Your API keys are encrypted at-rest and decrypted only in-memory when signing API payloads sent to Gameflip servers.
