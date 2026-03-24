import { create } from 'zustand';
import { NoteBlob, PitchPoint, VibratoPoint } from '../types';
import { uploadAudio, analyzeAudio, renderPitch, getStreamUrl } from '../api';

interface AppState {
    fileId: string | null;
    audioBlob: Blob | null;
    notes: NoteBlob[];
    pitchCurve: PitchPoint[];
    duration: number;
    sampleRate: number;
    loading: boolean;
    playing: boolean;
    currentTime: number;
    zoom: number;
    currentTool: 'move' | 'vibrato';
    error: string | null;
    renderedUrl: string | null;
    selectedNoteId: string | null;
    contextMenu: any | null;
    inspectorOpen: boolean;
    past: NoteBlob[][];
    future: NoteBlob[][];
    renderTimer: any | null;

    undo: () => void;
    redo: () => void;
    debouncedRender: () => void;

    setFile: (file: File) => Promise<void>;
    updateNote: (id: string, updates: Partial<NoteBlob>) => void;
    renderChanges: () => Promise<void>;
    setPlaying: (playing: boolean) => void;
    setCurrentTime: (time: number) => void;
    setZoom: (zoom: number) => void;
    setCurrentTool: (tool: 'move' | 'vibrato') => void;
    selectNote: (id: string | null) => void;
    deleteNote: (id: string) => void;
    splitNote: (id: string, atTime: number) => void;
    setContextMenu: (menu: any | null) => void;
    setInspectorOpen: (open: boolean) => void;
    updateVibratoPoint: (noteId: string, pointIndex: number, cents: number) => void;
    setVibratoCurve: (noteId: string, curve: VibratoPoint[]) => void;
}

function generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export const useStore = create<AppState>((set, get) => ({
    fileId: null,
    audioBlob: null,
    notes: [],
    pitchCurve: [],
    duration: 0,
    sampleRate: 0,
    loading: false,
    playing: false,
    currentTime: 0,
    zoom: 150,
    currentTool: 'move',
    error: null,
    renderedUrl: null,
    selectedNoteId: null,
    contextMenu: null,
    inspectorOpen: false,
    past: [],
    future: [],
    renderTimer: null,

    debouncedRender: () => {
        const { renderTimer } = get();
        if (renderTimer) clearTimeout(renderTimer);
        const newTimer = setTimeout(() => {
            get().renderChanges();
        }, 500);
        set({ renderTimer: newTimer });
    },

    undo: () => {
        const { past, notes, future } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        set({
            past: newPast,
            notes: previous,
            future: [notes, ...future]
        });
        get().debouncedRender();
    },

    redo: () => {
        const { past, notes, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        set({
            past: [...past, notes],
            notes: next,
            future: newFuture
        });
        get().debouncedRender();
    },

    setFile: async (file: File) => {
        set({ loading: true, error: null });
        try {
            const fileId = await uploadAudio(file);
            const data = await analyzeAudio(fileId);

            const notes = data.notes.map(n => ({
                ...n,
                vibrato_curve: n.vibrato_curve || [],
            }));

            set({
                fileId,
                audioBlob: file,
                notes,
                pitchCurve: data.pitch_curve,
                duration: data.duration,
                sampleRate: data.sample_rate,
                loading: false,
                renderedUrl: getStreamUrl(fileId, false),
                selectedNoteId: null,
                inspectorOpen: false,
            });
        } catch (err: any) {
            set({ error: err.message || 'Failed to open file', loading: false });
        }
    },

    updateNote: (id: string, updates: Partial<NoteBlob>) => {
        const { notes, past } = get();
        set({
            past: [...past, notes],
            future: [],
            notes: notes.map(n => n.id === id ? { ...n, ...updates } : n)
        });
        get().debouncedRender();
    },

    selectNote: (id: string | null) => {
        set({ selectedNoteId: id });
    },

    deleteNote: (id: string) => {
        const { notes, past } = get();
        set((state) => ({
            past: [...past, notes],
            future: [],
            notes: state.notes.filter(n => n.id !== id),
            selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
            inspectorOpen: state.selectedNoteId === id ? false : state.inspectorOpen,
            contextMenu: null,
        }));
        get().debouncedRender();
    },

    splitNote: (id: string, atTime: number) => {
        set((state) => {
            const note = state.notes.find(n => n.id === id);
            if (!note || atTime <= note.start || atTime >= note.end) {
                return { contextMenu: null };
            }

            const splitPoint = (atTime - note.start) / (note.end - note.start);
            const origDurTotal = note.original_end - note.original_start;
            const absoluteOrigSplit = note.original_start + splitPoint * origDurTotal;

            const leftNote: NoteBlob = {
                ...note,
                id: generateId(),
                end: atTime,
                original_end: absoluteOrigSplit,
                vibrato_curve: note.vibrato_curve.filter(p => {
                    const absoluteTime = note.start + p.offset * (note.end - note.start);
                    return absoluteTime < atTime;
                }).map(p => {
                    const dur = atTime - note.start;
                    const origDur = note.end - note.start;
                    return { offset: (p.offset * origDur) / dur, cents: p.cents };
                }),
            };

            const rightNote: NoteBlob = {
                ...note,
                id: generateId(),
                start: atTime,
                original_start: absoluteOrigSplit,
                vibrato_curve: note.vibrato_curve.filter(p => {
                    const absoluteTime = note.start + p.offset * (note.end - note.start);
                    return absoluteTime >= atTime;
                }).map(p => {
                    const dur = note.end - atTime;
                    const origDur = note.end - note.start;
                    const absTime = note.start + p.offset * origDur;
                    return { offset: (absTime - atTime) / dur, cents: p.cents };
                }),
            };

            const { notes: currentNotes, past } = get();
            return {
                past: [...past, currentNotes],
                future: [],
                notes: state.notes.map(n => n.id === id ? leftNote : n).concat([rightNote]).sort((a, b) => a.start - b.start),
                contextMenu: null,
                selectedNoteId: null,
            };
        });
        get().debouncedRender();
    },

    setContextMenu: (menu: any | null) => set({ contextMenu: menu }),
    setInspectorOpen: (open: boolean) => set({ inspectorOpen: open, selectedNoteId: open ? get().selectedNoteId : null }),

    updateVibratoPoint: (noteId: string, pointIndex: number, cents: number) => {
        set((state) => ({
            notes: state.notes.map(n => {
                if (n.id !== noteId) return n;
                const curve = [...n.vibrato_curve];
                if (pointIndex >= 0 && pointIndex < curve.length) {
                    curve[pointIndex] = { ...curve[pointIndex], cents };
                }
                return { ...n, vibrato_curve: curve };
            }),
        }));
    },

    setVibratoCurve: (noteId: string, curve: VibratoPoint[]) => {
        const { notes, past } = get();
        set({
            past: [...past, notes],
            future: [],
            notes: notes.map(n => n.id === noteId ? { ...n, vibrato_curve: curve } : n),
        });
        get().debouncedRender();
    },

    renderChanges: async () => {
        const { fileId, notes } = get();
        if (!fileId) return;
        set({ loading: true, error: null });
        try {
            await renderPitch(fileId, notes);
            set({ loading: false, renderedUrl: getStreamUrl(fileId, true) });
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    setPlaying: (playing: boolean) => set({ playing }),
    setCurrentTime: (currentTime: number) => set({ currentTime }),
    setZoom: (zoom: number) => set({ zoom }),
    setCurrentTool: (currentTool: 'move' | 'vibrato') => set({ currentTool }),
}));
