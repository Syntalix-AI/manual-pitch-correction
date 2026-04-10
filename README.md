# Kord
## Manual Pitch Correction Engine

A full-stack web application designed for manual pitch correction, using audio processing and a graphical interface similar to Melodyne / Music Putty.

## Project Structure

- `frontend/`: React + TypeScript application featuring canvas waveform rendering and draggable note blobs. State is managed with Zustand.
- `backend/`: FastAPI + Python server performing pitch tracking (pYIN) and pitch/time rendering algorithms with librosa.

## Prerequisites

- Node.js (v16+)
- Python 3.9+
- Port `3000` available for the frontend
- Port `8000` available for the backend API

## Setup Instructions

### 1. Backend (FastAPI + Audio Processing)

Open a terminal window and navigate to the backend folder:

```bash
cd pitch-correction-app/backend
```

Create a virtual environment and load it:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI development server:

```bash
python main.py
```
*The server will run at `http://localhost:8000`*


### 2. Frontend (React + Vite)

Open a second terminal window and navigate to the frontend folder:

```bash
cd pitch-correction-app/frontend
```

Install the NPM dependencies required:

```bash
npm install
```

Start the Vite development web server:

```bash
npm run dev
```

*The frontend application will start and be accessible at `http://localhost:3000`*

## How to use

1. Go to `http://localhost:3000` in your web browser.
2. Click "**Upload Audio**" in the top right to upload a clean, dry vocal file (WAV or MP3). 
3. *Note: Analyzing the file will take a few seconds as the pYIN algorithm extracts pitch segments.*
4. Observe the waveform loading behind the pitch curve and orange pitch note blobs (MIDI mapping).
5. Drag an orange blob vertically to adjust its pitch (snaps to a real MIDI grid).
6. Hover over the left/right edges of a blob to adjust temporal length (stretch handles).
7. Press `Apply & Render` to send the changes to the Python backend to shift pitch using the Phase Vocoder algorithm across sliced audio.
8. Finally, press play `▶` to listen to your correctly re-pitched audio!
# manual-pitch-correction
# manual-pitch-correction
# manual-pitch-correction
# manual-pitch-correction
