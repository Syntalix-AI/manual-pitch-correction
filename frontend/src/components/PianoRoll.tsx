import React, { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

const NOTE_HEIGHT = 20;
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6
const TOTAL_ROWS = MAX_MIDI - MIN_MIDI + 1;
const CANVAS_HEIGHT = TOTAL_ROWS * NOTE_HEIGHT;
const PIANO_KEY_WIDTH = 48;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    return NOTE_NAMES[midi % 12] + octave;
}

function isBlackKey(midi: number): boolean {
    return [1, 3, 6, 8, 10].includes(midi % 12);
}

function midiToY(midi: number): number {
    return (MAX_MIDI - midi) * NOTE_HEIGHT;
}

export default function PianoRoll() {
    const undo = useStore(s => s.undo);
    const redo = useStore(s => s.redo);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const zoom = useStore(s => s.zoom);
    const duration = useStore(s => s.duration);
    const notes = useStore(s => s.notes);
    const pitchCurve = useStore(s => s.pitchCurve);
    const currentTime = useStore(s => s.currentTime);
    const updateNote = useStore(s => s.updateNote);
    const audioBlob = useStore(s => s.audioBlob);
    const selectedNoteId = useStore(s => s.selectedNoteId);
    const selectNote = useStore(s => s.selectNote);
    const setContextMenu = useStore(s => s.setContextMenu);

    const scrollRef = useRef<HTMLDivElement>(null);
    const gridCanvasRef = useRef<HTMLCanvasElement>(null);
    const waveCanvasRef = useRef<HTMLCanvasElement>(null);
    const pitchCanvasRef = useRef<HTMLCanvasElement>(null);

    const dragRef = useRef<{
        noteId: string | null;
        type: 'move' | 'resize-left' | 'resize-right' | 'vibrato' | 'playhead' | null;
        startY: number;
        startX: number;
        origMidi: number;
        origStart: number;
        origEnd: number;
        origVibrato?: any[];
    }>({ noteId: null, type: null, startY: 0, startX: 0, origMidi: 0, origStart: 0, origEnd: 0 });

    const totalWidth = Math.max(duration * zoom, 800);

    // --- Draw grid ---
    useEffect(() => {
        const canvas = gridCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = totalWidth + PIANO_KEY_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
            const y = midiToY(midi);
            const black = isBlackKey(midi);
            ctx.fillStyle = black ? 'rgba(15, 15, 30, 0.6)' : 'rgba(20, 20, 40, 0.3)';
            ctx.fillRect(PIANO_KEY_WIDTH, y, totalWidth, NOTE_HEIGHT);
            ctx.strokeStyle = 'rgba(60, 60, 100, 0.25)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(PIANO_KEY_WIDTH, y + NOTE_HEIGHT);
            ctx.lineTo(totalWidth + PIANO_KEY_WIDTH, y + NOTE_HEIGHT);
            ctx.stroke();
            if (midi % 12 === 0) {
                ctx.strokeStyle = 'rgba(100, 100, 180, 0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(PIANO_KEY_WIDTH, y + NOTE_HEIGHT);
                ctx.lineTo(totalWidth + PIANO_KEY_WIDTH, y + NOTE_HEIGHT);
                ctx.stroke();
            }
        }

        for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
            const y = midiToY(midi);
            const black = isBlackKey(midi);
            ctx.fillStyle = black ? '#1a1a30' : '#2a2a50';
            ctx.fillRect(0, y, PIANO_KEY_WIDTH, NOTE_HEIGHT);
            ctx.strokeStyle = 'rgba(80, 80, 120, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(0, y, PIANO_KEY_WIDTH, NOTE_HEIGHT);
            ctx.fillStyle = black ? '#8888aa' : '#aaaacc';
            ctx.font = '9px monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(midiToNoteName(midi), PIANO_KEY_WIDTH - 6, y + NOTE_HEIGHT / 2);
        }

        ctx.fillStyle = 'rgba(100, 100, 160, 0.4)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        for (let t = 0; t <= duration; t += 1) {
            const x = PIANO_KEY_WIDTH + t * zoom;
            ctx.strokeStyle = 'rgba(60, 60, 100, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
            ctx.fillText(`${t}s`, x, CANVAS_HEIGHT - 4);
        }
    }, [zoom, duration, totalWidth]);

    // --- Draw waveform ---
    useEffect(() => {
        if (!audioBlob) return;
        const canvas = waveCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = totalWidth + PIANO_KEY_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        const audioCtx = new window.AudioContext();
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return;
            try {
                const buffer = await audioCtx.decodeAudioData(e.target.result as ArrayBuffer);
                const data = buffer.getChannelData(0);
                const pixelWidth = totalWidth;
                const step = Math.max(1, Math.ceil(data.length / pixelWidth));
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(80, 120, 220, 0.12)';
                for (let i = 0; i < pixelWidth; i++) {
                    let min = 1.0, max = -1.0;
                    for (let j = 0; j < step; j++) {
                        const idx = i * step + j;
                        if (idx >= data.length) break;
                        if (data[idx] < min) min = data[idx];
                        if (data[idx] > max) max = data[idx];
                    }
                    const centerY = CANVAS_HEIGHT / 2;
                    const yTop = centerY + min * centerY;
                    const yBot = centerY + max * centerY;
                    ctx.fillRect(PIANO_KEY_WIDTH + i, yTop, 1, Math.max(1, yBot - yTop));
                }
            } catch (err) {
                console.error('Decode error', err);
            }
            audioCtx.close();
        };
        reader.readAsArrayBuffer(audioBlob as Blob);
    }, [audioBlob, zoom, totalWidth]);

    // --- Draw pitch curve ---
    useEffect(() => {
        const canvas = pitchCanvasRef.current;
        if (!canvas || !pitchCurve || pitchCurve.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = totalWidth + PIANO_KEY_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();

        let drawing = false;
        for (const pt of pitchCurve) {
            if (pt.freq <= 0) { drawing = false; continue; }
            const midi = 69 + 12 * Math.log2(pt.freq / 440);
            if (midi < MIN_MIDI || midi > MAX_MIDI) { drawing = false; continue; }
            const x = PIANO_KEY_WIDTH + pt.time * zoom;
            const y = (MAX_MIDI - midi) * NOTE_HEIGHT + NOTE_HEIGHT / 2;
            if (!drawing) { ctx.moveTo(x, y); drawing = true; }
            else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
    }, [pitchCurve, zoom, totalWidth]);

    // --- Blob interaction ---
    const handlePointerDown = useCallback((e: React.PointerEvent, noteId: string, type: 'move' | 'resize-left' | 'resize-right') => {
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const currentTool = useStore.getState().currentTool;
        const actualType = (currentTool === 'vibrato' && type === 'move') ? 'vibrato' : type;

        // Select the note on click
        selectNote(noteId);

        const note = useStore.getState().notes.find(n => n.id === noteId);
        if (!note) return;

        dragRef.current = {
            noteId, type: actualType,
            startY: e.clientY, startX: e.clientX,
            origMidi: note.midi, origStart: note.start, origEnd: note.end,
            origVibrato: note.vibrato_curve ? JSON.parse(JSON.stringify(note.vibrato_curve)) : [],
        };
    }, [selectNote]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        const zoom = useStore.getState().zoom;

        if (d.type === 'playhead') {
            const rect = scrollRef.current?.getBoundingClientRect();
            if (!rect) return;
            const scrollLeft = scrollRef.current?.scrollLeft || 0;
            const x = e.clientX - rect.left + scrollLeft - PIANO_KEY_WIDTH;
            useStore.getState().setCurrentTime(Math.max(0, x / zoom));
            return;
        }

        if (!d.noteId || !d.type) return;

        if (d.type === 'move') {
            const deltaY = e.clientY - d.startY;
            const deltaX = e.clientX - d.startX;
            const rowDelta = Math.round(-deltaY / NOTE_HEIGHT);
            const timeDelta = deltaX / zoom;
            const newMidi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, d.origMidi + rowDelta));
            const dur = d.origEnd - d.origStart;
            const newStart = Math.max(0, d.origStart + timeDelta);
            updateNote(d.noteId, {
                midi: newMidi,
                pitch: 440 * Math.pow(2, (newMidi - 69) / 12),
                start: newStart, end: newStart + dur,
            });
        } else if (d.type === 'resize-left') {
            const deltaX = e.clientX - d.startX;
            const timeDelta = deltaX / zoom;
            const newStart = Math.max(0, d.origStart + timeDelta);
            if (newStart < d.origEnd - 0.03) updateNote(d.noteId, { start: newStart });
        } else if (d.type === 'resize-right') {
            const deltaX = e.clientX - d.startX;
            const timeDelta = deltaX / zoom;
            const newEnd = d.origEnd + timeDelta;
            if (newEnd > d.origStart + 0.03) updateNote(d.noteId, { end: newEnd });
        } else if (d.type === 'vibrato' && d.origVibrato) {
            const deltaY = e.clientY - d.startY;
            const scale = Math.max(0, 1.0 - (deltaY / 100.0)); // Drag up to deepen, down to flatten
            const newCurve = d.origVibrato.map(p => ({
                ...p,
                cents: p.cents * scale
            }));
            useStore.getState().setVibratoCurve(d.noteId, newCurve);
        }
    }, [updateNote]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
        dragRef.current = { noteId: null, type: null, startY: 0, startX: 0, origMidi: 0, origStart: 0, origEnd: 0 };
    }, []);

    // Right-click handler for context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, noteId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const note = useStore.getState().notes.find(n => n.id === noteId);
        if (!note) return;

        // Calculate what time position the cursor is at
        const scrollEl = scrollRef.current;
        const scrollLeft = scrollEl ? scrollEl.scrollLeft : 0;
        const rect = scrollEl?.getBoundingClientRect();
        const relativeX = e.clientX - (rect?.left || 0) + scrollLeft - PIANO_KEY_WIDTH;
        const cursorTime = relativeX / useStore.getState().zoom;

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            noteId,
            splitTime: cursorTime,
        });
    }, [setContextMenu]);

    const setZoom = useStore(s => s.setZoom);
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(Math.max(40, Math.min(800, zoom * factor)));
        }
    }, [zoom, setZoom]);

    // Click on background: seek playhead OR deselect
    const handleBackgroundPointerDown = useCallback((e: React.PointerEvent) => {
        const role = (e.target as HTMLElement).dataset?.role;
        if (role === 'blob') return;

        const rect = scrollRef.current?.getBoundingClientRect();
        if (!rect) return;
        const scrollLeft = scrollRef.current?.scrollLeft || 0;
        const x = e.clientX - rect.left + scrollLeft - PIANO_KEY_WIDTH;
        const time = Math.max(0, x / useStore.getState().zoom);

        // ALWAYS Seek playhead on background click
        useStore.getState().setCurrentTime(time);
        
        // Start dragging playhead
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = { ...dragRef.current, type: 'playhead', startX: e.clientX };

        selectNote(null);
    }, [selectNote]);

    // Auto-scroll on first load
    useEffect(() => {
        if (scrollRef.current && notes.length > 0) {
            const avgMidi = notes.reduce((s, n) => s + n.midi, 0) / notes.length;
            const targetY = midiToY(Math.round(avgMidi)) - scrollRef.current.clientHeight / 2;
            scrollRef.current.scrollTop = Math.max(0, targetY);
        }
    }, [notes.length > 0]);

    const playheadX = PIANO_KEY_WIDTH + currentTime * zoom;

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-auto relative bg-[#0e0e1a]"
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ touchAction: 'none' }}
        >
            <div className="relative" style={{ width: totalWidth + PIANO_KEY_WIDTH, height: CANVAS_HEIGHT, minWidth: '100%' }}>
                <canvas ref={gridCanvasRef} className="absolute top-0 left-0" style={{ width: totalWidth + PIANO_KEY_WIDTH, height: CANVAS_HEIGHT }} />
                <canvas ref={waveCanvasRef} className="absolute top-0 left-0 opacity-40 pointer-events-none" style={{ width: totalWidth + PIANO_KEY_WIDTH, height: CANVAS_HEIGHT }} />
                <canvas ref={pitchCanvasRef} className="absolute top-0 left-0 opacity-50 pointer-events-none" style={{ width: totalWidth + PIANO_KEY_WIDTH, height: CANVAS_HEIGHT }} />

                {/* Note blobs */}
                {notes.map((note) => {
                    const top = midiToY(note.midi);
                    const left = PIANO_KEY_WIDTH + note.start * zoom;
                    const width = Math.max(4, (note.end - note.start) * zoom);
                    const label = midiToNoteName(note.midi);
                    const isSelected = note.id === selectedNoteId;

                    return (
                        <div
                            key={note.id}
                            className="absolute group"
                            style={{ top, left, width, height: NOTE_HEIGHT }}
                            onContextMenu={(e) => handleContextMenu(e, note.id)}
                        >
                            {/* Main blob body */}
                            <div
                                data-role="blob"
                                className="absolute inset-0 rounded-md cursor-grab active:cursor-grabbing transition-all"
                                style={{
                                    background: isSelected
                                        ? 'linear-gradient(180deg, rgba(167,139,250,0.95) 0%, rgba(139,92,246,0.9) 100%)'
                                        : 'linear-gradient(180deg, rgba(251,146,60,0.9) 0%, rgba(234,88,12,0.85) 100%)',
                                    border: isSelected
                                        ? '2px solid rgba(196,181,253,0.8)'
                                        : '1px solid rgba(255,180,100,0.4)',
                                    boxShadow: isSelected
                                        ? '0 0 12px rgba(167,139,250,0.5), 0 2px 8px rgba(0,0,0,0.3)'
                                        : '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                                onPointerDown={(e) => handlePointerDown(e, note.id, 'move')}
                                onDoubleClick={() => useStore.getState().setInspectorOpen(true)}
                            >
                                {width > 30 && (
                                    <span className="absolute left-1.5 top-0 bottom-0 flex items-center text-[10px] font-bold text-white/90 pointer-events-none select-none">
                                        {label}
                                    </span>
                                )}

                                {/* Vibrato mini-preview inside blob */}
                                {note.vibrato_curve && note.vibrato_curve.length > 2 && width > 40 && (
                                    <svg className="absolute inset-0 pointer-events-none overflow-visible" width={width} height={NOTE_HEIGHT}>
                                        <polyline
                                            points={note.vibrato_curve.map(p => {
                                                const x = p.offset * width;
                                                const y = NOTE_HEIGHT / 2 - (p.cents / 200) * (NOTE_HEIGHT / 2);
                                                return `${x},${y}`;
                                            }).join(' ')}
                                            fill="none"
                                            stroke="rgba(255,255,255,0.3)"
                                            strokeWidth="1"
                                        />
                                    </svg>
                                )}
                            </div>

                            {/* Resize handles */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded-l-md z-10 transition-opacity"
                                onPointerDown={(e) => handlePointerDown(e, note.id, 'resize-left')}
                            />
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded-r-md z-10 transition-opacity"
                                onPointerDown={(e) => handlePointerDown(e, note.id, 'resize-right')}
                            />
                        </div>
                    );
                })}

                {/* Playhead */}
                <div className="absolute top-0 pointer-events-none z-50" style={{ left: playheadX, height: CANVAS_HEIGHT }}>
                    <div className="w-[2px] h-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                    <div className="absolute -top-0 -left-[5px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-400" />
                </div>

                {/* Sticky piano keys backing */}
                <div className="sticky left-0 top-0 z-40 pointer-events-none" style={{ width: PIANO_KEY_WIDTH, height: 0 }}>
                    <div className="absolute top-0 left-0" style={{ width: PIANO_KEY_WIDTH, height: CANVAS_HEIGHT, background: 'linear-gradient(90deg, #16213e 90%, transparent)' }} />
                </div>
            </div>
        </div>
    );
}
