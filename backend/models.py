from pydantic import BaseModel
from typing import List, Optional

class PitchPoint(BaseModel):
    time: float
    freq: float

class VibratoPoint(BaseModel):
    offset: float  # 0-1 normalized time within the note
    cents: float   # deviation in cents from base pitch

class NoteBlob(BaseModel):
    id: str
    start: float
    end: float
    original_start: float
    original_end: float
    midi: float
    pitch: float
    vibrato_depth: float
    vibrato_curve: List[VibratoPoint] = []
    selected: bool = False

class AnalysisResult(BaseModel):
    sample_rate: int
    duration: float
    pitch_curve: List[PitchPoint]
    notes: List[NoteBlob]

class RenderRequest(BaseModel):
    file_id: str
    notes: List[NoteBlob]
