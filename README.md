# RooMatch – Intelligent Roommate Matching Platform

**RooMatch** is a cloud-native web application designed to intelligently match roommates based on lifestyle compatibility, personal habits, and housing preferences. Built as part of a final-year B.Sc. in Information Systems project, it demonstrates scalable architecture, production-ready infrastructure, and end-to-end automation using modern DevOps and full-stack development practices.

---

## 🔍 Overview

RooMatch combines a dynamic single-page application with cloud-hosted services to deliver real-time, data-driven roommate recommendations. With a focus on modularity, scalability, and automation, the platform reflects best practices in microservices, CI/CD, and serverless architecture.

---

## 🚀 Features

* **Responsive Web App**: Built with HTML, CSS, JavaScript, Vite, and TailwindCSS for a smooth, mobile-first user experience.
* **Backend API**: Node.js (Express) service hosted on Cloud Run, providing RESTful endpoints for user interactions, matching logic, and file processing.
* **Cloud Storage Uploads**: Secure, signed URL mechanism enables direct image uploads from the browser to Google Cloud Storage.
* **Authentication & Database**: Supabase provides PostgreSQL-based persistence and JWT-secured authentication.
* **CI/CD Pipeline**: GitHub Actions automates build, test, and deployment workflows to Google Cloud.

---

## 🧰 Tech Stack

| Layer             | Technology Stack                                |
| ----------------- | ----------------------------------------------- |
| **Frontend**      | HTML, CSS, JavaScript, TailwindCSS, Vite        |
| **Backend**       | Node.js (Express), Docker                       |
| **Database**      | Supabase (PostgreSQL), JWT authentication       |
| **File Storage**  | Google Cloud Storage (Signed URLs)              |
| **Cloud Hosting** | Google Cloud Run, Load Balancer, Secret Manager |
| **CI/CD**         | GitHub Actions, Cloud Build, Artifact Registry  |

---

## 🗺️ System Architecture

```
             ┌────────────────────────────┐
             │        Frontend           │
             │  HTML / CSS / JS / Vite   │
             └────────────┬──────────────┘
                          │
                          ▼
        ┌────────────────────────────────────────┐
        │   Google Cloud Storage (Static Site)   │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │     Node.js Backend API (Cloud Run)    │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │    Supabase (PostgreSQL + Auth)        │
        └────────────────────────────────────────┘
                         ▲
                         │
        ┌────────────────────────────────────────┐
        │     GitHub Actions + Cloud Build       │
        │   (CI/CD, Artifact Registry, Deploy)   │
        └────────────────────────────────────────┘
```

---

## 🛠️ DevOps Pipeline

The development workflow is fully automated using GitHub Actions:

1. **Code Push** → Triggers CI workflow
2. **Docker Build** → Creates containerized backend
3. **Cloud Storage Upload** → Updates static frontend files
4. **Cloud Run Deploy** → Rolls out new backend revisions

All deployments are zero-downtime with automatic rollback support.

---

## 🔭 Future Roadmap

* **Google OAuth 2.0**: Add secure, single-sign-on authentication
* **AI Matching Engine**: Integrate OpenAI embeddings + `pgvector` for smarter compatibility scoring
* **Push Notifications**: Use Firebase Cloud Messaging for real-time alerts
* **Mobile App**: Build a React Native client for iOS and Android
* **End-to-End Testing**: Integrate Jest and Cypress for automated test coverage

---

## 👤 About the Author

**Niv Badash**
Cloud-native full-stack engineer focused on intelligent system design and automated delivery pipelines.
Contact: [nivbadd@gmail.com](mailto:nivbadd@gmail.com)

---

## 🤝 Contribute & Collaborate

Contributions, ideas, and feedback are welcome.
To collaborate or report issues, please open a GitHub issue or reach out directly.

---
