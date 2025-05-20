# RooMatch 🏡

**RooMatch** is a cloud‑native web platform that matches compatible roommates, simplifies shared‑apartment logistics and elevates the co‑living experience, delivered as the capstone project for my B.Sc. in Information Systems.

---

## 🚀 Highlights

* Fully responsive single‑page interface built with vanilla **HTML / CSS / JavaScript** and Tailwind, optimised for desktop and mobile alike.
* Backend microservices: a \*\*Node.js\*\* (Express) API **and** a lightweight \*\*Python (Flask) match‑engine\*\* — both containerised and auto‑scaling on \*\*Google Cloud Run\*\*.
* Static assets and user‑generated media served from **Google Cloud Storage** with signed‑URL uploads for secure, direct‑from‑browser transfers.
* Persistent data stored in **Supabase (PostgreSQL)**; near‑real‑time collaboration enabled by native Postgres listen/notify via WebSockets.
* CI/CD pipeline built on **GitHub Actions** → **Cloud Build**, pushing images to Artifact Registry and promoting to staging / prod automatically on merge.

---

## 🛠️ Tech Stack

| Layer          | Technologies                                                                   |
| -------------- | ------------------------------------------------------------------------------ |
| Frontend       | HTML, CSS, JavaScript, Tailwind, Vite build                                    |
| Backend        | Node.js 20 (Express) & Python 3.12 (Flask) microservices, Multer, WebSocket    |
| Data           | Supabase Postgres (primary), Redis cache (planned)                             |
| Cloud & DevOps | Google Cloud Run, Cloud Storage, Cloud Build, Artifact Registry, Terraform IaC |

---

## 📁 Project Structure

```
roomatch/
├── frontend/        # Static site source
├── backend/         # Node.js API & Dockerfile
├── infra/           # Terraform modules
└── .github/         # GitHub Actions workflows
```

---

## 🌐 Live Deployment

Development environment live at **https://roomatch-prod-1-109620478954.europe-west1.run.app** backed by Cloud Run; static frontend is served from **http://storage.googleapis.com/roomatch-prod-static-site/index.html** and linked to the same API.

---

## 🔮 Roadmap

* Integrate Google OAuth and JWT for full authentication flow.
* Add AI‑powered roommate‑matching engine using OpenAI embeddings and pgvector.
* Implement push notifications via Firebase Cloud Messaging.
* Release mobile companion app with React Native.

---

## 👨‍💻 Built By

**Niv Badash** — full‑stack development, cloud architecture, CI/CD.

---

## 🤝 Feedback & Collaboration

Open an issue or contact me at **nivbadd@gmail.com** with suggestions or collaboration ideas.


