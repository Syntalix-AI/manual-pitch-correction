#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from audio_processing import load_audio
import parselmouth
import numpy as np

# Load the audio file
audio_path = os.path.join(os.path.dirname(__file__), '..', 'Intro-dry.wav')
print(f"Loading audio from: {audio_path}")
y, sr = load_audio(audio_path)
print(f"✓ Loaded: {len(y)} samples @ {sr}Hz\n")

# Run Praat pitch detection
print("Running Praat analysis...")
sound = parselmouth.Sound(y, sr)
pitch = sound.to_pitch(time_step=0.01, pitch_floor=65.0, pitch_ceiling=1046.0)

times = pitch.xs()
f0 = pitch.selected_array['frequency']

print(f"Times array length: {len(times)}")
print(f"F0 array length: {len(f0)}")
print(f"\nFirst 10 times: {times[:10]}")
print(f"Last 10 times: {times[-10:]}")
print(f"\nFirst 10 f0 values: {f0[:10]}")
print(f"Last 10 f0 values: {f0[-10:]}")

# Check time spacing
time_diffs = np.diff(times)
print(f"\nTime spacing stats:")
print(f"  Min: {np.min(time_diffs):.6f}s")
print(f"  Max: {np.max(time_diffs):.6f}s")
print(f"  Mean: {np.mean(time_diffs):.6f}s")

# Find first few voiced regions
is_voiced = (f0 > 0).astype(int)
diffs = np.diff(np.concatenate(([0], is_voiced, [0])))
starts = np.where(diffs == 1)[0]
ends = np.where(diffs == -1)[0]

print(f"\nFirst 3 voiced segments:")
for i in range(min(3, len(starts))):
    start_idx, end_idx = starts[i], ends[i]
    print(f"  Segment {i}: indices [{start_idx}:{end_idx}]")
    print(f"    times[{start_idx}] = {times[start_idx]}")
    print(f"    times[{min(end_idx, len(times)-1)}] = {times[min(end_idx, len(times)-1)]}")
    print(f"    Sliced times: {times[start_idx:end_idx][:5]} ... {times[start_idx:end_idx][-5:]}")
