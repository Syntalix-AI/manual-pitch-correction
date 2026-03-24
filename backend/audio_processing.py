import numpy as np
import soundfile as sf

def load_audio(path: str):
    y, sr = sf.read(path)
    if len(y.shape) > 1:
        y = np.mean(y, axis=1) # convert to mono
    return y, sr

def save_audio(path: str, y: np.ndarray, sr: int):
    sf.write(path, y, sr)
