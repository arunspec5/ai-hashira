# Medicinal Info Chatbot

A chatbot that collects user health details and provides personalized medicinal information. Built with React + Vite (frontend) and Express (backend).

**Disclaimer:** This app provides general wellness information only. Always consult a qualified healthcare professional for medical advice.

## Features

- **User profile:** Collect name, age, gender, existing conditions, and allergies
- **Personalized responses:** Tailors remedies and cautions based on user profile
- **Topics covered:** Headache, cough, cold, fever, indigestion, sleep issues, skin problems, anxiety, joint pain, blood sugar, general wellness

## Setup

### 1. Install dependencies

From the project root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Environment (optional)

Backend uses `backend/.env`:

```
PORT=5002
NODE_ENV=development
```

### 3. Run the app

**Development (recommended):**

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

Or both at once (requires `concurrently`):

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:5002/api

## Project structure

```
medicinal-chatbot/
├── backend/
│   ├── src/
│   │   ├── data/medicinalKnowledge.js   # Knowledge base
│   │   ├── routes/chat.route.js         # API routes
│   │   ├── services/chatService.js      # Chat logic
│   │   └── index.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx                 # Chat UI
│   │   │   └── UserDetailsForm.jsx      # User details form
│   │   └── App.jsx
│   └── package.json
└── package.json
```

## API

- `POST /api/chat` – Send a message, get medicinal info response
  - Body: `{ message, sessionId, userContext? }`
- `POST /api/user-details` – Save user details for a session
  - Body: `{ sessionId, name, age, gender, conditions[], allergies[] }`
