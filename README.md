<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=36&pause=1000&color=8B5CF6&center=true&vCenter=true&width=600&lines=ESMA+AI+Platform;Your+AI%2C+Your+Rules." alt="Typing SVG" />

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge&logo=statuspage&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-8B5CF6?style=for-the-badge" />
</p>

<p align="center">
  <a href="https://esma-ai.pages.dev" target="_blank">
    <img src="https://img.shields.io/badge/🌐%20Live%20Demo-esma--ai.pages.dev-8B5CF6?style=for-the-badge" />
  </a>
</p>

</div>

---

<div align="center">
  <h3>🤖 7 AI Provider · ⚡ Real-time Streaming · 🔐 Secure Proxy · 📱 Mobile-First</h3>
</div>

---

## ✨ What is ESMA?

**ESMA** is a premium, all-in-one AI platform that brings together **7 of the world's most powerful AI models** under a single, elegant interface. No subscriptions, no limits — just raw AI power directly in your browser.

Built with a **glassmorphism dark UI**, real-time streaming responses, and a secure backend proxy that keeps all API keys hidden from the client side.

---

## 🚀 Features

### 🧠 AI Chat
- Real-time **streaming** responses (token by token — like watching AI think)
- **Automatic fallback** across 7 providers — if one fails, the next kicks in instantly
- Full **conversation history** with localStorage persistence
- **Voice input** via Web Speech API
- **File upload** support (images, documents)
- **Markdown rendering** with code syntax highlighting

### 💻 Code Editor
- Powered by **Monaco Editor** (same as VS Code)
- In-browser **code execution** with live console output
- Multiple language support

### ✅ Cowork — AI Task Manager
- Add tasks in plain language
- AI executes them **step-by-step** with streaming progress display
- Real-time status tracking per task

### 🔬 Deep Research (Coming Soon)
- Multi-depth AI research with configurable reasoning levels

### 📱 Mobile-First Design
- Pixel-perfect on all screen sizes — phones, tablets, desktops
- Virtual keyboard-aware layout (input always visible)
- iOS safe-area support via `env(safe-area-inset-bottom)`
- Uses `100dvh` dynamic viewport for flawless mobile rendering

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                            │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │           ESMA Frontend (Cloudflare Pages)               │   │
│   │                                                          │   │
│   │   index.html ──► css/ ──► js/                           │   │
│   │                    │         ├── api.js   (proxy layer)  │   │
│   │                    │         ├── chat.js  (AI chat)      │   │
│   │                    │         ├── tasks.js (cowork)       │   │
│   │                    │         ├── code.js  (editor)       │   │
│   │                    │         └── app.js   (SPA router)   │   │
│   └──────────────────────────────────────────────────────────┘   │
│                              │ HTTPS / SSE Streaming             │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              AI Proxy Server (Kamatera VPS)                     │
│                                                                  │
│   POST /proxy ──► auth check ──► route to provider              │
│                                    ├── OpenRouter               │
│                                    ├── Qwen (Alibaba)           │
│                                    ├── Mistral AI               │
│                                    ├── Google Gemini            │
│                                    ├── OpenAI                   │
│                                    ├── Groq (LLaMA 3.3)        │
│                                    └── GitHub Models            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Providers

| Provider | Model | Type | Speed |
|----------|-------|------|-------|
| 🔀 **OpenRouter** | openrouter/free | OpenAI-compat | ⚡⚡⚡ |
| 🌸 **Qwen** | qwen-turbo | OpenAI-compat | ⚡⚡⚡ |
| 🌀 **Mistral AI** | mistral-small-latest | OpenAI-compat | ⚡⚡⚡ |
| 💎 **Google Gemini** | gemini-1.5-flash | Gemini | ⚡⚡⚡ |
| 🤖 **OpenAI** | gpt-4o-mini | OpenAI | ⚡⚡ |
| 🔴 **Groq** | llama-3.3-70b-versatile | OpenAI-compat | ⚡⚡⚡⚡ |
| 🐙 **GitHub Models** | gpt-4o-mini | OpenAI-compat | ⚡⚡ |

> All requests route through the secure proxy. API keys **never** touch the browser.

---

## 🔐 Security Model

```
Browser ──[x-proxy-pass: ••••••]──► Node.js Proxy ──[API Key]──► AI Provider
          Password-Protected                         Never exposed to client
```

- ✅ All API keys stored **server-side only** in `.env`
- ✅ Every request authenticated via `x-proxy-pass` header
- ✅ CORS enforced — only whitelisted origins allowed
- ✅ Response headers sanitized (no `Content-Encoding: gzip` leaks to mobile)

---

## 📁 Project Structure

```
ESMA-main/
│
├── 📄 index.html              # Main SPA entry point
│
├── 📁 css/
│   ├── main.css               # Global styles + CSS variables
│   ├── sidebar.css            # Navigation sidebar
│   ├── chat.css               # Chat interface
│   ├── code.css               # Monaco editor wrapper
│   ├── dashboard.css          # Home/dashboard page
│   └── mobile.css             # Mobile-first responsive overrides
│
├── 📁 js/
│   ├── api.js                 # Proxy client + streaming engine
│   ├── app.js                 # SPA router + initialization
│   ├── chat.js                # Chat logic, voice input, file upload
│   ├── code.js                # Monaco editor integration
│   ├── tasks.js               # Cowork AI task execution
│   ├── state.js               # Global state + localStorage
│   └── utils.js               # Markdown, toast, DOM helpers
│
├── 📁 ai-proxy/               # 🔒 Backend Proxy Server
│   ├── server.js              # Express proxy (main file)
│   ├── package.json
│   └── .env.example           # Environment variable template
│
├── 📁 cloudflare-deploy/      # Ready-to-deploy frontend bundle
├── 📁 functions/              # Cloudflare Pages Functions
├── 🖥️ run_server.sh            # Linux/macOS server launcher
└── 🖥️ run_server.bat           # Windows server launcher
```

---

## ⚙️ Setup & Deployment

### Prerequisites

- Node.js `v18+`
- A VPS or server (for the proxy)
- Cloudflare Pages account (for the frontend)

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/orkhankasumov4-netizen/ESMA-main.git
cd ESMA-main
```

### 2️⃣ Set Up the Proxy Server

```bash
cd ai-proxy

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Now edit `.env` with your real API keys:

```env
PORT=8081
PROXY_PASSWORD=your_strong_secret_password

OPENROUTER_API_KEY=sk-or-v1-...
QWEN_API_KEY=sk-...
MISTRAL_API_KEY=...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
GITHUB_TOKEN=github_pat_...
```

### 3️⃣ Start the Proxy Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start

# Or use PM2 for persistent background process
pm2 start server.js --name esma-proxy
```

### 4️⃣ Configure the Frontend

Update your proxy URL in `js/api.js`:

```js
export const PROXY_URL = 'https://your-server-domain.com/proxy';
export const PROXY_PASS = 'your_strong_secret_password';
```

### 5️⃣ Deploy Frontend to Cloudflare Pages

1. Go to [Cloudflare Pages Dashboard](https://pages.cloudflare.com/)
2. Create a new project → Upload the `cloudflare-deploy/` folder
3. Done! Your app is live. 🎉

---

## 💡 How the Streaming Works

```
User types message
      │
      ▼
js/api.js::streamWithFallback()
      │
      ├──► Try Provider #1 (e.g. Groq)
      │         │
      │    Success? ──► Stream SSE tokens to UI in real-time
      │         │
      │    Fail?   ──► Try Provider #2 automatically
      │
      └──► All failed? ──► Show error with all provider details
```

The streaming engine uses the **Web Streams API** (`ReadableStream`) to parse Server-Sent Events (SSE) and render tokens one-by-one in the DOM — creating the signature "AI typing" effect.

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#0d0d12` |
| Accent | `#8b5cf6` (Purple) |
| Glass Panel | `rgba(30, 30, 35, 0.4)` + backdrop-blur |
| Font | Inter (Google Fonts) |
| Mono Font | Fira Code |
| Border Radius | `12px` |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

**Built with 💜 by [orkhankasumov4-netizen](https://github.com/orkhankasumov4-netizen)**

<br/>

⭐ **Star this repo if you found it useful!** ⭐

</div>
