# OA Insight – Low-Cost Knee Osteoarthritis Assessment System

**OA Insight** is a modern clinical decision-support system designed to assess Knee Osteoarthritis (OA) severity non-invasively and cost-effectively. It integrates **Knee Acoustic Emission (KAE)** signals captured via low-cost wearable vibration sensors with **Patient-Reported Measures (PRM)** surveys (such as WOMAC and KOOS). The system uses a **multimodal dual-branch Convolutional Neural Network (CNN)** to classify joints into Normal, Mild, Moderate, or Severe OA states.

---

## 🏥 Clinical & Technical Overview

### 1. Knee Acoustic Emissions (KAE)
Joint movement under loading triggers friction. While healthy cartilage articulates silently, osteoarthritic knees exhibit micro-acoustic bursts (clicks, crepitus, grinding sounds) caused by cartilage erosion, bone-on-bone contact, and synovial joint narrowing.
* **Frequency Range**: Typically 50 Hz to 2000 Hz.
* **Signal Pipeline**: Noise removal (50 Hz - 1000 Hz Butterworth bandpass) ➔ Peak amplitude normalization ➔ Cycle segmentation ➔ Short-Time Fourier Transform (STFT) Mel-spectrogram generation.

### 2. Patient-Reported Measures (PRM)
Standardized surveys capture subjective pain and functional limitations:
* **WOMAC Score (Western Ontario & McMaster Universities OA Index)**: Sums Likert-scale answers across Pain (0-20), Stiffness (0-8), and Physical Function (0-68). A higher score represents worse symptoms.
* **KOOS Score (Knee Injury & OA Outcome Score)**: Calculates normalized indices from 0 (extreme symptoms) to 100 (no symptoms).

### 3. Multimodal CNN Fusion Architecture
The network fuses heterogeneous clinical telemetry:
* **Acoustic Branch**: ResNet-like 2D Convolutions processing the Mel-spectrogram image grid to extract frequency-domain transient anomalies.
* **Survey Branch**: Dense layers embedding the patient's demographic factors and subscale scores.
* **Concatenation & Classification**: Late-stage features are concatenated and classified through a Softmax output layer, predicting severity levels alongside prediction confidence weights.
* **Explainable AI (XAI)**: Attributes clinical weight divisions between surveys and sound signals to explain risk drivers to clinicians.

---

## 🚀 Setup & Execution Guide

### Method A: Running with Docker Compose (Recommended)
This method launches both services in isolated containers. Persistent directories are mounted automatically.

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is running.
2. In the project root workspace directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the web portal:
   * **Frontend Portal**: `http://localhost:3000`
   * **FastAPI Swagger Docs**: `http://localhost:8000/docs`

---

### Method B: Manual Local Setup (Zero-Docker Developer Mode)
This method is useful for debugging. It utilizes the automatic **SQLite database fallback** and **ML NumPy simulation pipeline** if TensorFlow installation overhead is skipped.

#### 1. Setup Backend Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI dev server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2. Setup Frontend Application
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Launch the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL displayed in the console (typically `http://localhost:5173`).

---

## 🔑 Quick Demo Login Credentials

Upon startup, the backend database is auto-seeded with test accounts and historical progression logs:

| Role | Demo Email | Password | Pre-populated History |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@oainsight.com` | `Password123!` | 3 Historical assessments showing WOMAC improvement |
| **Clinician (Doctor)** | `doctor@oainsight.com` | `Password123!` | Global patient cohort registry and average trends |

---

## 📂 Project Structure

```
OA/
├── backend/
│   ├── app/
│   │   ├── ml/
│   │   │   ├── processor.py     # Butterworth filter, STFT, Spectrograms
│   │   │   ├── model.py         # Dual-branch Fusion CNN + NumPy Fallback
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── auth.py          # Signup & Login (JWT)
│   │   │   ├── patients.py      # Profile & progression trends
│   │   │   ├── doctors.py       # Patient list & aggregate stats
│   │   │   └── assessments.py   # Signal uploads, evaluations, PDF triggers
│   │   ├── utils/
│   │   │   ├── pdf_generator.py # ReportLab Clinical PDF layout
│   │   │   └── __init__.py
│   │   ├── config.py            # Pydantic Settings & path setups
│   │   ├── database.py          # SQLAlchemy Session dependencies
│   │   ├── models.py            # SQLite/PostgreSQL schemas
│   │   ├── schemas.py           # Request validations
│   │   └── main.py              # FastAPI startup & db seeding
│   ├── tests/
│   │   └── test_main.py         # Pytest endpoint health verification
│   ├── Dockerfile               # Backend container recipe
│   └── requirements.txt         # Python library manifest
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts        # Fetch wrapper appending bearer token
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Theme switch & logout banner
│   │   │   ├── DashboardLayout.tsx # Responsive sidebar menus
│   │   │   ├── QuestionnaireForm.tsx # real-time score calculation wizard
│   │   │   ├── SignalVisualizer.tsx # waveform canvas & spectrograms
│   │   │   ├── AssessmentReport.tsx # clinical gauge & doctor override
│   │   │   └── AnalyticsCharts.tsx  # Recharts curves & distributions
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Auth state manager
│   │   ├── App.tsx              # Coordinator dashboard router
│   │   ├── main.tsx             # React mount
│   │   └── index.css            # Custom CSS & Glassmorphism styles
│   ├── tailwind.config.js       # Theme definitions
│   ├── postcss.config.js
│   ├── index.html               # SEO Title & meta descriptors
│   ├── package.json
│   └── Dockerfile               # Multi-stage Nginx build recipe
│
├── docker-compose.yml           # Multi-container conductor
└── README.md                    # Project documentation
```
