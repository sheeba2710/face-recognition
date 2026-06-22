# Universal AI Assistant

Universal AI Assistant is a full-stack, lightweight ChatGPT-style web application built with **Flask** (Python backend), **React.js** (static UMD single-page application delivery), and **Tailwind CSS** styling. It integrates the **Google Gemini 1.5 API** to provide smart conversational reasoning, context history memory, multilingual interaction, PDF and image analysis (multimodal OCR), text-to-speech (TTS), speech-to-text (STT), and web scraping tools for real-time information retrieval (news, weather, live cricket scores, stocks, and exchange rates).

## 🚀 Features

- **Conversational AI & Memory:** Multi-turn conversation logic with scrolling history and star bookmarks.
- **Real-Time Web Search:** Keyless weather, stock quotes, exchange rates, and DuckDuckGo-based news scrapers.
- **Multilingual Support:** Handles and translates English, Tamil, Hindi, Telugu, Malayalam, Kannada, French, German, Spanish, Japanese, Chinese, and Arabic.
- **Advanced File Uploads:**
  - PDF parser extracting text to use as prompt context.
  - Image descriptor utilizing Gemini multimodal capabilities (OCR text extraction).
- **Audio Interactions:** Web Speech API integration for hands-free voice typing (STT) and read-aloud (TTS).
- **Auth & Security:** Email login/registration, bcrypt password hashing, JWT token authentication, and API rate limiting.
- **UI/UX Aesthetics:** Ultra-modern dark mode, responsive mobile sidebars, code syntax highlighting (Highlight.js), markdown parsing (marked.js), and PDF chat exports (jsPDF).

---

## 📁 Project Structure

```
Universal AI/
├── backend/
│   ├── app.py                  # Main entry point (serves API & SPA index)
│   ├── config.py               # Security and configurations
│   ├── models.py               # Database schemas (User, Chat, Message)
│   ├── database.py             # SQLAlchemy wrapper
│   ├── requirements.txt        # Backend dependencies
│   ├── routes/
│   │   ├── auth.py             # JWT auth, reset password, user profiles
│   │   ├── chat.py             # Chat sessions and PDF/image uploads
│   │   └── ai.py               # Gemini streaming chatbot endpoint
│   ├── services/
│   │   ├── ai_service.py       # Gemini API client, memory, intent router
│   │   ├── search_service.py   # Real-time weather, stocks, news, scores scrapers
│   │   └── document_service.py # PDF text extraction and file validators
│   └── static/                 # Frontend assets (Static SPA delivery)
│       ├── index.html          # HTML Shell loading Tailwind, React UMD
│       └── js/
│           ├── app.js          # Root routing and main mounting logic
│           ├── context.js      # Auth, Theme, and Chat React Contexts
│           └── components/
│               ├── Auth.js     # Signup, Login, ForgotPassword cards
│               ├── Sidebar.js  # Timeline-grouped chat navigation
│               ├── ChatWindow.js # Speech tools, upload buttons, markdown chat
│               └── SettingsModal.js # Config custom API key and instructions
└── README.md
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.10 or Python 3.11/3.13 installed.
- Internet connection (to download UMD packages and query Gemini API).

### 1. Set Up Backend Virtual Environment
Navigate to the `backend/` directory:
```bash
cd backend
python -m venv venv
```

Activate the environment:
- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .\venv\Scripts\activate.bat
  ```
- **macOS/Linux:**
  ```bash
  source venv/bin/activate
  ```

Install dependencies:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory (a template is in the settings or config):
```env
# Required for AI chat to function
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: change database URI (defaults to SQLite: instance/universal_ai.db)
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

SECRET_KEY=custom_flask_session_secret_key
JWT_SECRET_KEY=custom_jwt_token_secret_key
```

> [!TIP]
> Users can also paste their custom Gemini API Key inside the **Config settings** panel on the frontend UI, which saves it to localStorage and overrides the server-side key!

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```
The server will boot on **`http://localhost:5000`**.
Open your browser and navigate to `http://localhost:5000/` to use the application!

---

## 🧪 Testing and Verification

To verify that the application has been set up correctly and the APIs are functional, a Python integration test script is provided in the repository.

To run the verification test:
1. Ensure the virtual environment is active.
2. Run:
   ```bash
   python test_integration.py
   ```
   This script will verify auth signup/login endpoints, chat creation, real-time weather scraping, and check database ORM consistency.
