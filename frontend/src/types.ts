export interface PitchPoint {
    time: number;
    freq: number;
}

export interface VibratoPoint {
    offset: number; // 0-1 normalized time within the note
    cents: number;  // deviation in cents from base pitch
}

export interface NoteBlob {
    id: string;
    start: number;
    end: number;
    original_start: number;
    original_end: number;
    midi: number;
    pitch: number;
    vibrato_depth: number;
    vibrato_curve: VibratoPoint[];
    selected?: boolean;
}

export interface AnalysisResult {
    sample_rate: number;
    duration: number;
    pitch_curve: PitchPoint[];
    notes: NoteBlob[];
}
