import numpy as np
import uuid
import parselmouth
import scipy.signal
from models import PitchPoint, NoteBlob, VibratoPoint

def hz_to_midi(hz):
    return 69 + 12 * np.log2(hz / 440.0)

def detect_pitch(y, sr):
    print("Running Praat pitch detection...")
    
    sound = parselmouth.Sound(y, sr)
    pitch = sound.to_pitch(time_step=0.01, pitch_floor=65.0, pitch_ceiling=1046.0)
    
    times = pitch.xs()
    f0 = pitch.selected_array['frequency']
    
    duration = len(y) / sr
    
    pitch_curve = []
    for t, f in zip(times, f0):
        if f > 0:
            pitch_curve.append(PitchPoint(time=float(t), freq=float(f)))
            
    notes = []
    
    is_voiced = (f0 > 0).astype(int)
    diffs = np.diff(np.concatenate(([0], is_voiced, [0])))
    starts = np.where(diffs == 1)[0]
    ends = np.where(diffs == -1)[0]
    
    print(f"Found {len(starts)} voiced segments")
    for start_idx, end_idx in zip(starts, ends):
        segment_f0 = f0[start_idx:end_idx]
        if len(segment_f0) < 5:  # skip very short notes
            continue
            
        start_time = times[start_idx]
        end_time = times[min(end_idx, len(times)-1)]
        
        # SENSITIVE SEGMENTATION LOGIC
        # 1. Quantize segment to smoothed MIDI (remove vibrato)
        segment_midi = hz_to_midi(segment_f0)
        
        filt_size = 35 # About 350ms median filter
        if len(segment_midi) >= filt_size:
            smoothed_midi = scipy.signal.medfilt(segment_midi, filt_size)
        else:
            filt_size = len(segment_midi) | 1 # make odd
            smoothed_midi = scipy.signal.medfilt(segment_midi, filt_size) if filt_size > 2 else segment_midi
            
        quantized_midi = np.round(smoothed_midi)
        
        # Split when the underlying quantized pitch class changes
        # This prevents 3 different notes being fused into one!
        jumps = np.abs(np.diff(quantized_midi)) > 0.5
        split_indices = np.where(jumps)[0] + 1
        
        sub_segments = np.split(segment_f0, split_indices)
        sub_times = np.split(times[start_idx:end_idx], split_indices)
        
        for sub_f0, sub_t in zip(sub_segments, sub_times):
            if len(sub_f0) < 2:
                continue
                
            s_time = sub_t[0]
            e_time = sub_t[-1]
            
            # Much smaller threshold to capture transitions
            if e_time - s_time < 0.01:
                continue
                
            mean_pitch = float(np.median(sub_f0)) 
            midi = float(round(hz_to_midi(mean_pitch)))
            vibrato_depth = float(np.std(hz_to_midi(sub_f0)))
            
            # Generate vibrato curve from actual pitch deviations
            note_dur = e_time - s_time
            vibrato_curve = []
            if note_dur > 0 and len(sub_f0) > 2:
                sub_midi = hz_to_midi(sub_f0)
                for i, (f, t_val) in enumerate(zip(sub_f0, sub_t)):
                    offset = float((t_val - s_time) / note_dur)
                    cents = float((hz_to_midi(f) - midi) * 100)  # deviation in cents
                    if i % 2 == 0:  # sample every other point to keep it manageable
                        vibrato_curve.append(VibratoPoint(offset=offset, cents=cents))
            
            notes.append(NoteBlob(
                id=str(uuid.uuid4()),
                start=float(s_time),
                end=float(e_time),
                original_start=float(s_time),
                original_end=float(e_time),
                midi=midi,
                pitch=mean_pitch,
                vibrato_depth=vibrato_depth,
                vibrato_curve=vibrato_curve
            ))
            
    return pitch_curve, notes, duration
