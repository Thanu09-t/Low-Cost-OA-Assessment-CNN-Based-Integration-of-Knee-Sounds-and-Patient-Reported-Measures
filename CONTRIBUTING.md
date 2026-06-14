# Contributing to OA Insight

Thank you for your interest in contributing to OA Insight! We welcome community contributions to help improve this clinical Knee Osteoarthritis assessment portal.

---

## 🛠️ Local Development Setup

To get started with local development, follow the guidelines below for setting up both the backend and frontend components.

### 🐍 Backend Setup

The backend is powered by FastAPI and Python.

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```
2. **Create and Activate a Virtual Environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: If you are running Python 3.14+, tensorflow-cpu and psycopg2-binary might fail to compile on some platforms. The application will automatically fall back to SQLite and NumPy rule-based predictions.*
4. **Run the Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. **Run Backend Tests**:
   ```bash
   pytest
   ```

---

### ⚛️ Frontend Setup

The frontend is built using React, Vite, TailwindCSS, and TypeScript.

1. **Navigate to the Frontend Directory**:
   ```bash
   cd frontend
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run the Development Server**:
   ```bash
   npm run dev
   ```
4. **Validate Linting & Build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 🌿 Branching Policy

1. Always branch off `main` or `master`.
2. Name branches descriptively:
   - `feature/your-feature-name`
   - `bugfix/issue-description`
   - `docs/doc-updates`
3. Commit messages should be clear and follow the conventional commits format:
   - `feat: add MRI upload drag-and-drop zone`
   - `fix: correct layout displacement on smaller viewports`

---

## 🚀 Pull Request Process

1. **Check Linting and Formatting**: Ensure frontend linting passes and files are correctly formatted.
2. **Run All Tests**: Verify backend tests (`pytest`) pass before opening a PR.
3. **Fill the PR Template**: Be sure to document the changes, testing steps, and issues resolved.
4. **Code Review**: At least one maintainer review is required before merging.
