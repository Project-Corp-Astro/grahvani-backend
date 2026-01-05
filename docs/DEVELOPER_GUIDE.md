# Grahvani Backend: Developer Onboarding & Workflow Guide
**The complete handbook for microservices development and collaboration.**

---

## 1. Project Overview & Structure
This is a **Monorepo** architecture using **NPM Workspaces** and **Turborepo**. 

### 📁 File Structure
- `/contracts`: Shared library containing event definitions (The "Common Language" of our services).
- `/services`: Individual microservices (e.g., `auth-service`, `user-service`, `client-service`).
- `package.json`: Root configuration for the entire monorepo.
- `turbo.json`: Build system configuration for parallel execution.

---

## 2. Setting Up Your Environment (Zero to Hero)

### Step 1: Clone the Project
```bash
git clone https://github.com/Project-Corp-Astro/grahvani-backend.git
cd grahvani-backend
```

### Step 2: Install Dependencies
Run this at the **root** folder only. It installs everything for all services.
```bash
npm install
```

### Step 3: Environment Variables
1.  Copy the example file to create your own: `cp .env.example .env`
2.  Open `.env` and fill in the required keys (Supabase, Database, Redis).
3.  **Security Note**: Never push your `.env` to GitHub. It is already in `.gitignore`.

### Step 4: Initialize the Database (AUTOMATED)
When you run `npm install` in Step 2, the system automatically runs:
```bash
npx turbo run generate
```

> [!TIP]
> **Why is this automated?** Prisma generates a **Type-Safe Client** (the "bridge" between our code and the DB) that is specific to your computer's Operating System. By automating it, we ensure every developer has a correct, ready-to-use client immediately after installing dependencies.
> 
> **Note**: You only need to run this manually if you change the database structure yourself in the future.

---

## 3. Running the Backend

### Scenario A: Running the Entire Platform
To start all microservices (Auth, User, Client, etc.) at once:
```bash
# Must be run from the root directory
npm run dev
```

### Scenario B: Running a Single Service
If you are only working on the **Client Service** and don't want to run everything else:
```bash
# Option 1: Using Turbo (Recommended)
npx turbo run dev --filter=@grahvani/client-service

# Option 2: Navigating into the folder
cd services/client-service
npm run dev
```

---

## 4. Multi-Developer Git Workflow (The Professional Way)

### 🌿 Phase 1: Preparation (Daily Start)
Before you start any code, make sure your local machine matches the latest code from the team.
```bash
git checkout main
git pull origin main
```

### 🌿 Phase 2: Feature Branching
Never write code directly on `main`. Create a branch named after your task.
```bash
# Template: feat/<service-name>/<feature-description>
git checkout -b feat/client-svc/profile-crud
```

### 🌿 Phase 3: Work & Commit
Do your work inside your assigned folder (e.g., `services/client-service`).
```bash
git add .
git commit -m "feat(client-svc): implement basic profile creation and update"
```

### 🌿 Phase 4: Push to GitHub & Pull Request (PR)
When you are ready for other developers to see your work:
1.  **Push your branch**:
    ```bash
    git push origin feat/client-svc/profile-crud
    ```
2.  **Open a PR**: Go to https://github.com/Project-Corp-Astro/grahvani-backend and click **"Compare & Pull Request"**.
3.  **Review**: A teammate (or lead) will check your code. Once approved, the PR is merged into `main` using the GitHub website.

### 🌿 Phase 5: Local Cleanup
After your code is merged on GitHub, clean up your local computer.
```bash
git checkout main
git pull origin main
git branch -d feat/client-svc/profile-crud
```

---

## 5. Important Rules for Developers
1.  **Shared Contracts**: If you need to change how services talk to each other, change the files in `/contracts` first.
2.  **Linting & Building**: Before you push, run `npm run build` at the root to make sure you Haven't broken other people's services.
3.  **Local Isolation**: Use the prefix in the root `.env` for service-specific variables (e.g., `AUTH_JWT_SECRET`) if you want to avoid conflicts.

---
**Happy Coding! 🎩🚀**
