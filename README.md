# VoidDrop 🕳️

> **Zero-trace, peer-to-peer file sharing via WebRTC.**  
> No accounts. No servers. No traces. Files travel directly between browsers.

![VoidDrop](https://img.shields.io/badge/WebRTC-P2P-9b30ff?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Signaling-009688?style=for-the-badge&logo=fastapi)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwind-css)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔒 Zero-trace | No files stored anywhere — direct P2P via WebRTC DataChannels |
| 🔐 AES-256 Encryption | Optional client-side encryption (toggle on send page, default ON) |
| 📡 QR Connect | Scan QR or enter 5-char code to join a session |
| 🔥 Burn After Send | Session auto-deletes on transfer complete |
| 🌀 3D Vortex UI | Three.js black hole particle vortex — cursor-reactive |
| ⚡ Chunked Transfer | 64 KB chunks with backpressure handling + live progress |
| 📱 Mobile First | Responsive, QR scanner, touch-friendly |

---

## 🏗️ Architecture

```
Browser (Sender)                      Browser (Receiver)
     │                                      │
     │  offer / answer / ICE candidates     │
     └───────── FastAPI Signaling ──────────┘
                  WebSocket
                  /ws/{code}
                      ↕
              Only metadata relays.
              Zero file data on server.

File data: Sender ──── WebRTC DataChannel ──── Receiver
```

---

## 📁 Project Structure

```
f:/Utk_Idea/
├── voiddrop/                    # Next.js 16 frontend
│   ├── app/
│   │   ├── layout.tsx           # Root layout + SEO
│   │   ├── page.tsx             # Landing (3D vortex)
│   │   ├── send/page.tsx        # Send flow
│   │   └── receive/page.tsx     # Receive flow
│   ├── components/
│   │   ├── VortexScene.jsx      # Three.js black hole
│   │   ├── FileDropZone.jsx     # Drag-and-drop
│   │   ├── QRDisplay.jsx        # Holographic QR
│   │   ├── QRScanner.jsx        # Camera QR reader
│   │   ├── CodeInput.jsx        # 5-char code input
│   │   ├── TransferProgress.jsx # Circular progress + stats
│   │   ├── ConnectionStatus.jsx # Live status badge
│   │   ├── GlassCard.jsx        # Glassmorphism card
│   │   └── GlowButton.jsx       # Neon glow button
│   ├── lib/
│   │   ├── webrtc/
│   │   │   ├── peer.js          # RTCPeerConnection setup
│   │   │   ├── sender.js        # Chunked file sending
│   │   │   ├── receiver.js      # Chunk reassembly
│   │   │   ├── signaling.js     # WebSocket client
│   │   │   └── encryption.js   # AES-256 (crypto-js)
│   │   └── utils/
│   │       ├── sessionCode.js   # 5-char code gen/validate
│   │       ├── formatBytes.js   # Speed/size formatting
│   │       └── fileChunker.js  # 64KB chunk generator
│   └── styles/globals.css       # Full design system
│
└── signaling-server/            # Python FastAPI
    ├── main.py                  # WS relay + session mgmt
    ├── requirements.txt
    ├── Dockerfile
    ├── railway.toml             # Railway deployment
    └── render.yaml              # Render deployment
```

---

## 🚀 Quick Start (Local)

### 1. Start the Signaling Server

```bash
cd signaling-server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Server runs at `ws://localhost:8000`

### 2. Start the Frontend

```bash
cd voiddrop
npm install
npm run dev
```

App runs at `http://localhost:3000`

---

## ☁️ Deploying to Production

### Signaling Server → Railway

1. Push `signaling-server/` to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Railway auto-detects `railway.toml`
4. Copy the generated URL (e.g. `voiddrop-signaling.up.railway.app`)

### Signaling Server → Render

1. Push `signaling-server/` to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. `render.yaml` auto-configures the service
4. Copy the Render URL

### Frontend → Vercel

1. Push `voiddrop/` to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Set environment variable:
   ```
   NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.up.railway.app
   ```
4. Deploy

---

## 🔐 Security Notes

- **No file data** ever touches the signaling server — only WebRTC handshake metadata
- **AES-256-CBC** encryption with PBKDF2 key derivation from session code + per-chunk random IV/salt
- **Rate limiting** — max 10 WebSocket connections/minute/IP (via slowapi)
- **Session expiry** — sessions auto-delete after 10 minutes of inactivity
- **Burn-after-send** — session destroyed immediately on transfer complete (when enabled)
- **No identity logging** — server logs only connection counts, never IP addresses

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + Tailwind v4 |
| 3D Scene | Three.js + React Three Fiber |
| Animations | Framer Motion |
| File Transfer | WebRTC RTCDataChannel |
| QR Code | qrcode.react + html5-qrcode |
| Encryption | crypto-js (AES-256-CBC) |
| Signaling | Python FastAPI + WebSocket |
| Rate Limiting | slowapi |
| Frontend Deploy | Vercel |
| Server Deploy | Railway / Render |

---

## 📄 License

MIT — use freely, no attribution required.
