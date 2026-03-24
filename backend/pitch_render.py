import numpy as np
import parselmouth
from parselmouth.praat import call
from models import NoteBlob
from typing import List

def stretch_and_shift(y: np.ndarray, sr: int, stretch_ratio: float, target_midi: float, vibrato_curve: List = []) -> np.ndarray:
    try:
        duration = len(y) / sr
        safe_pitch_floor = max(75, 3.0 / duration + 1)
        sound = parselmouth.Sound(y, sr)
        manipulation = call(sound, "To Manipulation", 0.01, safe_pitch_floor, 600)

        if stretch_ratio != 1.0 and stretch_ratio > 0.05:
            duration_tier = call(manipulation, "Extract duration tier")
            call(duration_tier, "Remove points between", sound.xmin, sound.xmax)
            call(duration_tier, "Add point", sound.xmin, stretch_ratio)
            call([duration_tier, manipulation], "Replace duration tier")

        pitch_tier = call(manipulation, "Extract pitch tier")

        if len(vibrato_curve) > 0:
            new_pitch_tier = call("Create PitchTier", "corrected", sound.xmin, sound.xmax)
            num_points = call(pitch_tier, "Get number of points")
            if num_points > 0:
                v_offsets = np.array([p.offset for p in vibrato_curve])
                v_cents = np.array([p.cents for p in vibrato_curve])
                for i in range(1, num_points + 1):
                    t = call(pitch_tier, "Get time from index", i)
                    norm_t = (t - sound.xmin) / (sound.xmax - sound.xmin) if (sound.xmax - sound.xmin) > 0 else 0
                    cents_offset = np.interp(norm_t, v_offsets, v_cents)
                    target_note = target_midi + (cents_offset / 100.0)
                    target_f = 440.0 * (2.0 ** ((target_note - 69.0) / 12.0))
                    call(new_pitch_tier, "Add point", t, target_f)
            call([new_pitch_tier, manipulation], "Replace pitch tier")

        resynth = call(manipulation, "Get resynthesis (overlap-add)")
        return resynth.values[0]
    except Exception as e:
        print(f"PSOLA Error: {e}")
        return y

def render_pitch_changes(y: np.ndarray, sr: int, edited_notes: List[NoteBlob]) -> np.ndarray:
    print("Rendering pitch changes using Praat PSOLA High-Quality Algorithm...")
    max_end = max([n.end for n in edited_notes]) if edited_notes else len(y) / sr
    out_len = int(max(max_end * sr, len(y)))
    y_out = np.copy(y).astype(float)
    if len(y_out) < out_len:
        y_out = np.pad(y_out, (0, out_len - len(y_out)))

    sorted_notes = sorted(edited_notes, key=lambda x: x.start)
    for edited in sorted_notes:
        v_curve = edited.vibrato_curve
        start_sample = int(edited.original_start * sr)
        end_sample = int(edited.original_end * sr)
        start_sample = max(0, start_sample)
        end_sample = min(len(y), end_sample)
        if start_sample >= end_sample:
            continue
        slice_y = y[start_sample:end_sample]
        orig_dur = edited.original_end - edited.original_start
        new_dur = edited.end - edited.start
        rate = new_dur / orig_dur if orig_dur > 0.005 else 1.0
        if len(slice_y) > int(sr * 0.02):
            modified = stretch_and_shift(slice_y, sr, rate, edited.midi, v_curve)
            new_start_sample = int(edited.start * sr)
            new_end_sample = new_start_sample + len(modified)
            if new_end_sample > len(y_out):
                y_out = np.pad(y_out, (0, new_end_sample - len(y_out)))
            existing = y_out[new_start_sample:new_end_sample]
            if len(existing) < len(modified):
                existing = np.pad(existing, (0, len(modified) - len(existing)))
            fade_ms = 20
            fade_len = min(int(sr * (fade_ms / 1000.0)), len(modified) // 4, len(existing) // 4)
            if fade_len < 1:
                y_out[new_start_sample:new_end_sample] = modified
            else:
                window = np.ones(len(modified), dtype=float)
                win_in = np.linspace(0.0, 1.0, fade_len)
                win_out = np.linspace(1.0, 0.0, fade_len)
                window[:fade_len] = win_in
                window[-fade_len:] = win_out
                if len(existing) < len(modified):
                    existing = np.pad(existing, (0, len(modified) - len(existing)))
                blended = existing * (1.0 - window) + modified * window
                y_out[new_start_sample:new_end_sample] = blended
    return y_out
import numpy as np
import parselmouth
from parselmouth.praat import call
from models import NoteBlob
from typing import List

def stretch_and_shift(y: np.ndarray, sr: int, stretch_ratio: float, target_midi: int, vibrato_curve: List = []) -> np.ndarray:
    try:
        duration = len(y) / sr
        # Praat requires pitch_floor >= 3/duration to perform manipulation
        # For very short segments, we must increase the floor or pad the sound
        safe_pitch_floor = max(75, 3.0 / duration + 1)
        
        sound = parselmouth.Sound(y, sr)
        manipulation = call(sound, "To Manipulation", 0.01, safe_pitch_floor, 600)
        
        # 1. Stretch duration
        if stretch_ratio != 1.0 and stretch_ratio > 0.05:
            duration_tier = call(manipulation, "Extract duration tier")
            call(duration_tier, "Remove points between", sound.xmin, sound.xmax)
            call(duration_tier, "Add point", sound.xmin, stretch_ratio)
            call([duration_tier, manipulation], "Replace duration tier")
        
        pitch_tier = call(manipulation, "Extract pitch tier")
        
        if len(vibrato_curve) > 0:
            # Create a new pitch tier to avoid index shifting issues
            new_pitch_tier = call("Create PitchTier", "corrected", sound.xmin, sound.xmax)
            
            num_points = call(pitch_tier, "Get number of points")
            if num_points > 0:
                v_offsets = np.array([p.offset for p in vibrato_curve])
                v_cents = np.array([p.cents for p in vibrato_curve])
                
                for i in range(1, num_points + 1):
                    t = call(pitch_tier, "Get time from index", i)
                    
                    norm_t = (t - sound.xmin) / (sound.xmax - sound.xmin) if (sound.xmax - sound.xmin) > 0 else 0
                    cents_offset = np.interp(norm_t, v_offsets, v_cents)
                    
                    target_note = target_midi + (cents_offset / 100.0)
                    target_f = 440.0 * (2.0 ** ((target_note - 69.0) / 12.0))
                    
                    call(new_pitch_tier, "Add point", t, target_f)
            
            call([new_pitch_tier, manipulation], "Replace pitch tier")
        
        # Resynthesize
        resynth = call(manipulation, "Get resynthesis (overlap-add)")
        return resynth.values[0]
    except Exception as e:
        print(f"PSOLA Error: {e}")
        return y

def render_pitch_changes(y: np.ndarray, sr: int, edited_notes: List[NoteBlob]) -> np.ndarray:
    print("Rendering pitch changes using Praat PSOLA High-Quality Algorithm...")
    # Initialize output as a copy of the original audio so unedited regions remain intact
    max_end = max([n.end for n in edited_notes]) if edited_notes else len(y) / sr
    out_len = int(max(max_end * sr, len(y)))
    y_out = np.copy(y).astype(float)
    if len(y_out) < out_len:
        y_out = np.pad(y_out, (0, out_len - len(y_out)))
    
    # Sort notes to process them in order (though additive layering is fine)
    sorted_notes = sorted(edited_notes, key=lambda x: x.start)
    
    for edited in sorted_notes:
        v_curve = edited.vibrato_curve
        
        # Source material
        start_sample = int(edited.original_start * sr)
        end_sample = int(edited.original_end * sr)
        start_sample = max(0, start_sample)
        end_sample = min(len(y), end_sample)
        
        if start_sample >= end_sample:
            continue
            
        slice_y = y[start_sample:end_sample]
        
        orig_dur = edited.original_end - edited.original_start
        new_dur = edited.end - edited.start
        rate = new_dur / orig_dur if orig_dur > 0.005 else 1.0
        
        if len(slice_y) > int(sr * 0.02):
            # Apply time/pitch changes
            modified = stretch_and_shift(slice_y, sr, rate, edited.midi, v_curve)

            new_start_sample = int(edited.start * sr)
            new_end_sample = new_start_sample + len(modified)

            if new_end_sample > len(y_out):
                y_out = np.pad(y_out, (0, new_end_sample - len(y_out)))

            # Get existing segment (pad with zeros if necessary)
            existing = y_out[new_start_sample:new_end_sample]
            if len(existing) < len(modified):
                existing = np.pad(existing, (0, len(modified) - len(existing)))

            # Crossfade edges to avoid clicks/artifacts
            fade_ms = 20
            fade_len = min(int(sr * (fade_ms / 1000.0)), len(modified) // 4, len(existing) // 4)
            if fade_len < 1:
                # Simple replacement when too short
                y_out[new_start_sample:new_end_sample] = modified
            else:
                window = np.ones(len(modified), dtype=float)
                win_in = np.linspace(0.0, 1.0, fade_len)
                win_out = np.linspace(1.0, 0.0, fade_len)
                window[:fade_len] = win_in
                window[-fade_len:] = win_out

                # Ensure existing has same length
                if len(existing) < len(modified):
                    existing = np.pad(existing, (0, len(modified) - len(existing)))

                blended = existing * (1.0 - window) + modified * window
                y_out[new_start_sample:new_end_sample] = blended
                
    return y_out
