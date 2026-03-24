import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from models import AnalysisResult, RenderRequest, NoteBlob
from storage import generate_file_id, get_file_path, get_rendered_path
from audio_processing import load_audio, save_audio
from pitch_detection import detect_pitch
from pitch_render import render_pitch_changes

app = FastAPI(title="Pitch Correction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

original_notes_map = {}

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    file_id = generate_file_id()
    path = get_file_path(file_id)
    
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
        
    return {"file_id": file_id}

@app.post("/analyze/{file_id}", response_model=AnalysisResult)
async def analyze_audio(file_id: str):
    path = get_file_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
        
    y, sr = load_audio(path)
    pitch_curve, notes, duration = detect_pitch(y, sr)
    
    original_notes_map[file_id] = notes
    
    return AnalysisResult(
        sample_rate=sr,
        duration=duration,
        pitch_curve=pitch_curve,
        notes=notes
    )

@app.post("/render_pitch")
async def render_pitch(req: RenderRequest):
    orig_path = get_file_path(req.file_id)
    if not os.path.exists(orig_path):
        raise HTTPException(status_code=404, detail="Original file not found")
        
    y, sr = load_audio(orig_path)
    
    try:
        y_out = render_pitch_changes(y, sr, req.notes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render failed: {str(e)}")
    
    out_path = get_rendered_path(req.file_id)
    save_audio(out_path, y_out, sr)
    
    return {"status": "ok", "file_id": req.file_id}

@app.get("/stream/{file_id}")
async def stream_audio(file_id: str, rendered: bool = False):
    path = get_rendered_path(file_id) if rendered else get_file_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    return FileResponse(path, media_type="audio/wav")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
