
---

# 🌍 BuildRight — Transparent Infrastructure, Accountable Governance 🏗️

> A public infrastructure transparency platform that tracks government and donor-funded projects in real time — promoting accountability, citizen engagement, and data-driven governance.

---

## 🚧 Problem Statement

Billions of CFA francs are spent annually on critical infrastructure projects (roads, schools, hospitals) across **Cameroon** and **Africa**, yet citizens remain in the dark about:

* Who’s responsible for specific projects
* How much was budgeted and spent
* Project timelines and completion status
* Why projects get abandoned midway

This **lack of transparency** enables corruption, inefficiency, wastes public funds, and delays essential development.

---

## 💡 Our Solution — *BuildRight Platform*

**BuildRight** is a **public infrastructure transparency platform** that tracks government and donor-funded projects **in real time**, bringing visibility and accountability to public spending.

### 🔑 Key Features

* 📊 **Project Dashboard:** Interactive maps showing ongoing projects, budgets, contractors, and timelines.
* 📱 **Citizen Reporting:** On-site photo uploads and progress updates from local communities.
* 🤖 **AI Monitoring:** Automatic inconsistency detection (e.g., “completed” projects with no field updates).
* 👥 **Multi-Stakeholder Access:** Dedicated portals for governments, citizens, and NGOs to verify and update data.
* 🔍 **Transparency Tools:** Budget tracking, contractor performance ratings, and completion analytics.

---

## 🧠 Tech Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| **Frontend**   | Next.js 14 (React + TypeScript)             |
| **Backend**    | Node.js + Express                           |
| **Database**   | Firebase (Firestore, Authentication)        |
| **Maps**       | Mapbox GL JS                                |
| **AI/ML**      | Python (Anomaly Detection)  (tentative)     |
| **Storage**    | Firebase Storage                            |
| **Deployment** | Vercel (Frontend), Railway/Render (Backend) |

---

## 🌍 Impact

* 💼 **Accountability:** Shine light on public spending and contractor performance.
* 🧑‍🤝‍🧑 **Citizen Empowerment:** Enable communities to monitor local projects.
* 📰 **Journalist Tooling:** Provide data for investigative reporting.
* 🌐 **Donor Confidence:** Increase transparency for international funders.
* 🚨 **Reduced Corruption:** Create public pressure for project completion.

---

## ⚙️ Development Guide

### 🧩 Getting Started

#### Prerequisites

* Node.js 
* npm 
* Git

---

### 🛠️ Installation

```bash
# 1. Clone the Repository to local machine
git clone (https://github.com/Diyoh/CEF345GROUP16.git)
cd CEF345GROUP16

# 2. Install Dependencies
npm install        # Root dependencies (if monorepo)
cd frontend && npm install
cd ../backend && npm install

# 3. Setup Environment Variables
cp .env.example .env.local
# Fill in your API keys (Mapbox, Firebase, etc.)

# 4. Run Development Servers
# Frontend
cd frontend && npm run dev
# Backend
cd ../backend && npm run dev
```

---

## 🧭 Collaboration Workflow

### 🔀 Branch Strategy (Git Flow)

| Branch Type            | Description                     |
| ---------------------- | ------------------------------- |
| `main`                 | Production-ready code           |
| `develop`              | Integration branch for features |
| `feature/feature-name` | New features                    |
| `bugfix/bug-name`      | Bug fixes                       |
| `hotfix/hotfix-name`   | Critical production fixes       |

---

### 👩‍💻 Working on a Feature

```bash
# 1. Start from updated develop branch
git checkout develop
git pull origin develop

# 2. Create your feature branch
git checkout -b feature/your-feature-name
# Examples:
# feature/map-integration
# feature/user-authentication
# feature/project-reporting

# 3. Make your changes
git add .
git commit -m "feat: add realtime project tracking on map"
```

#### 💬 Commit Message Convention

We use **Conventional Commits**:

| Type        | Purpose               |
| ----------- | --------------------- |
| `feat:`     | New features          |
| `fix:`      | Bug fixes             |
| `docs:`     | Documentation updates |
| `style:`    | Code formatting       |
| `refactor:` | Code restructuring    |
| `test:`     | Tests                 |
| `chore:`    | Maintenance tasks     |

---

### 🚀 Pushing and Pull Requests

```bash
# Push your branch
git push origin feature/your-feature-name
```

Then:

1. Open a Pull Request (PR) on GitHub
2. Compare `feature/your-feature-name` → `develop`
3. Request reviews from teammates
4. Address feedback and **Squash & Merge**

---

## 🧹 Code Quality Standards

Before pushing, always run:

```bash
npm run lint       # Linting
npm test           # Unit tests
npm run format     # Code formatting
```

---

## 📂 Project Structure

```
buildright/
├── frontend/                  # Next.js application
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Next.js routes
│   ├── lib/                   # Configurations & utilities
│   └── styles/                # Global styles
├── backend/                   # Node.js API
│   ├── routes/                # Express routes
│   ├── controllers/           # Business logic
│   ├── models/                # Data models
│   └── middleware/            # Auth & validation
├── shared/                    # Shared code between frontend & backend
└── documents/                 # Documentation
└── Database/  
                    
```

---

## 📏 Contribution Rules

1. 🚫 Never push directly to `main` or `develop`
2. 🧩 Always create a PR for code reviews
3. ✅ Write unit tests for new features
4. 📝 Update documentation after changes
5. 🧱 Keep commits focused and atomic
6. 🤝 Resolve merge conflicts responsibly

---

## 🆘 Getting Help

* Check existing docs in `/docs`
* Ask in team Slack or Discord channels
* Request pair programming sessions
* Create GitHub Issues for bugs/features

---

## 🤝 Contributing

We welcome contributions from developers passionate about **transparency and accountability**!
Please read our [Contributing Guidelines](CONTRIBUTING.md) before getting started.

---

## 🧾 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact

* GitHub Issues → For technical discussions & bug reports
* Project Maintainers → **Group 16**
* Course → **CEF345: Software Development Tools**

---

> **BuildRight — Building transparency, one project at a time.**
> 🛣️🏥🏫


