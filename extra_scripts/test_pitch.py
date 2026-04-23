#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from audio_processing import load_audio
from pitch_detection import detect_pitch

# Load the audio file
audio_path = os.path.join(os.path.dirname(__file__), '..', 'Intro-dry.wav')
print(f"Loading audio from: {audio_path}")
y, sr = load_audio(audio_path)
print(f"✓ Loaded: {len(y)} samples @ {sr}Hz")
print(f"  Duration: {len(y)/sr:.2f}s\n")

# Run pitch detection
print("Running pitch detection...\n")
pitch_curve, notes, duration = detect_pitch(y, sr)

print(f"\n✓ Detection complete:")
print(f"  - Duration: {duration:.2f}s")
print(f"  - Pitch curve points: {len(pitch_curve)}")
print(f"  - Notes detected: {len(notes)}")

if notes:
    print(f"\n✓ Notes found:")
    for i, note in enumerate(notes[:20]):  # Show first 20
        print(f"    {i+1}. MIDI {note.midi:.0f} ({note.pitch:.1f}Hz) @ {note.start:.3f}s-{note.end:.3f}s, vibrato_depth={note.vibrato_depth:.2f}")
    if len(notes) > 20:
        print(f"    ... and {len(notes) - 20} more notes")
else:
    print("✗ No notes found!")
