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
    
    f0 = pitch.selected_array['frequency']
    
    # Reconstruct time array from Praat pitch object
    # pitch.xs() returns broken array, so calculate times based on object properties
    num_frames = len(f0)
    t_min = pitch.start_time
    t_step = pitch.dx  # time step between frames
    times = np.array([t_min + i * t_step for i in range(num_frames)])
    
    total_duration = len(y) / sr
    
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
    for seg_num, (start_idx, end_idx) in enumerate(zip(starts, ends)):
        segment_f0 = f0[start_idx:end_idx]
        seg_dur = (times[min(end_idx, len(times)-1)] - times[start_idx])
        print(f"  Segment {seg_num}: samples={len(segment_f0)}, duration={seg_dur:.3f}s")
        if len(segment_f0) < 5:  # skip very short notes
            print(f"    -> SKIPPED: < 5 samples")
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
        
        print(f"    After quantization splits: {len(sub_segments)} sub-segments")
        for sub_num, (sub_f0, sub_t) in enumerate(zip(sub_segments, sub_times)):
            if len(sub_f0) < 2:
                print(f"      Sub {sub_num}: SKIPPED (< 2 samples)")
                continue
            
            s_time = sub_t[0]
            e_time = sub_t[-1]
            note_duration = e_time - s_time
            
            # Use sample count instead of time duration (time slicing is unreliable)
            # Keep anything with at least 2 samples
            print(f"      Sub {sub_num}: KEPT {len(sub_f0)} samples, duration={note_duration:.4f}s")
                
            mean_pitch = float(np.median(sub_f0)) 
            midi = float(round(hz_to_midi(mean_pitch)))
            vibrato_depth = float(np.std(hz_to_midi(sub_f0)))
            
            # Generate vibrato curve from actual pitch deviations
            vibrato_curve = []
            if note_duration > 0 and len(sub_f0) > 2:
                sub_midi = hz_to_midi(sub_f0)
                for i, (f, t_val) in enumerate(zip(sub_f0, sub_t)):
                    offset = float((t_val - s_time) / note_duration) if note_duration > 0 else float(i / len(sub_f0))
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
            
    return pitch_curve, notes, total_duration
