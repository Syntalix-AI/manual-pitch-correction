import os
import uuid

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_file_id() -> str:
    return str(uuid.uuid4())

def get_file_path(file_id: str) -> str:
    return os.path.join(UPLOAD_DIR, f"{file_id}.wav")

def get_rendered_path(file_id: str) -> str:
    return os.path.join(UPLOAD_DIR, f"{file_id}_rendered.wav")
