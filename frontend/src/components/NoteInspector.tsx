import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { VibratoPoint } from '../types';

const CANVAS_W = 280;
const CANVAS_H = 120;

function midiToNoteName(midi: number): string {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    return NOTE_NAMES[midi % 12] + octave;
}

function midiToHz(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function NoteInspector() {
    const selectedNoteId = useStore(s => s.selectedNoteId);
    const notes = useStore(s => s.notes);
    const inspectorOpen = useStore(s => s.inspectorOpen);
    const setInspectorOpen = useStore(s => s.setInspectorOpen);
    const updateNote = useStore(s => s.updateNote);
    const setVibratoCurve = useStore(s => s.setVibratoCurve);

    const note = notes.find(n => n.id === selectedNoteId);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);

    useEffect(() => {
        if (!inspectorOpen || !note) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw center line (0 cents deviation)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H / 2);
        ctx.lineTo(CANVAS_W, CANVAS_H / 2);
        ctx.stroke();

        // Draw curve
        if (note.vibrato_curve && note.vibrato_curve.length > 0) {
            ctx.strokeStyle = '#a78bfa'; // purple-400
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();

            note.vibrato_curve.forEach((p, i) => {
                const x = p.offset * CANVAS_W;
                // +/- 200 cents max displayed range
                const y = CANVAS_H / 2 - (p.cents / 200) * (CANVAS_H / 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }, [note, inspectorOpen]);

    const handleCanvasPointerDown = (e: React.PointerEvent) => {
        if (!note) return;
        drawingRef.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handleCanvasPointerMove(e);
    };

    const handleCanvasPointerMove = (e: React.PointerEvent) => {
        if (!drawingRef.current || !note) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(CANVAS_W, e.clientX - rect.left));
        const y = Math.max(0, Math.min(CANVAS_H, e.clientY - rect.top));

        const offset = x / CANVAS_W;
        const cents = ((CANVAS_H / 2 - y) / (CANVAS_H / 2)) * 200;

        const currentCurve = note.vibrato_curve || [];
        // Insert or update point
        let newCurve = [...currentCurve];
        const existingIdx = newCurve.findIndex(p => Math.abs(p.offset - offset) < 0.05);
        if (existingIdx >= 0) {
            newCurve[existingIdx] = { offset, cents };
        } else {
            newCurve.push({ offset, cents });
            newCurve.sort((a, b) => a.offset - b.offset);
        }

        setVibratoCurve(note.id, newCurve);
    };

    const handleCanvasPointerUp = (e: React.PointerEvent) => {
        drawingRef.current = false;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    };

    const applyPreset = (type: 'sine' | 'wide' | 'slow' | 'trill') => {
        if (!note) return;
        const points: VibratoPoint[] = [];
        const numPoints = 50;
        let freq = 5; // Hz
        let depth = 50; // cents

        if (type === 'wide') { freq = 4; depth = 100; }
        if (type === 'slow') { freq = 2; depth = 40; }
        if (type === 'trill') { freq = 8; depth = 80; }

        const noteDur = note.end - note.start;
        for (let i = 0; i <= numPoints; i++) {
            const offset = i / numPoints;
            const timeInNote = offset * noteDur;
            const cents = Math.sin(timeInNote * Math.PI * 2 * freq) * depth;
            points.push({ offset, cents });
        }
        setVibratoCurve(note.id, points);
    };

    const clearVibrato = () => {
        if (note) setVibratoCurve(note.id, []);
    };

    if (!inspectorOpen || !note) return null;

    const noteDur = note.end - note.start;
    const noteHz = midiToHz(note.midi);

    return (
        <div className="w-[540px] bg-[#16213e] border-l border-[#0f3460]/60 flex flex-col shrink-0 z-30 shadow-2xl">
            <div className="flex items-center justify-between px-4 h-10 border-b border-[#0f3460]/60">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Note Inspector</span>
                <button onClick={() => setInspectorOpen(false)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white rounded hover:bg-white/10 transition-colors text-sm">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="px-4 py-3 border-b border-[#0f3460]/40">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.8), rgba(234,88,12,0.7))' }}>
                            {midiToNoteName(note.midi)}
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-white">{midiToNoteName(note.midi)}</div>
                            <div className="text-[10px] text-gray-400">MIDI {note.midi} · {noteHz.toFixed(1)} Hz</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="bg-[#0e0e1a] rounded px-2 py-1.5">
                            <span className="text-gray-500 block">Start</span>
                            <span className="text-gray-300 font-mono">{note.start.toFixed(3)}s</span>
                        </div>
                        <div className="bg-[#0e0e1a] rounded px-2 py-1.5">
                            <span className="text-gray-500 block">End</span>
                            <span className="text-gray-300 font-mono">{note.end.toFixed(3)}s</span>
                        </div>
                        <div className="bg-[#0e0e1a] rounded px-2 py-1.5">
                            <span className="text-gray-500 block">Duration</span>
                            <span className="text-gray-300 font-mono">{noteDur.toFixed(3)}s</span>
                        </div>
                    </div>

                    <div className="mt-3">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Fine Pitch (MIDI)</label>
                        <div className="flex items-center gap-2">
                            <button className="w-6 h-6 rounded bg-[#0e0e1a] text-gray-400 hover:text-white hover:bg-purple-600/30 text-xs transition-colors"
                                onClick={() => updateNote(note.id, { midi: note.midi - 1, pitch: midiToHz(note.midi - 1) })}>−</button>
                            <span className="text-sm font-mono text-white flex-1 text-center">{note.midi}</span>
                            <button className="w-6 h-6 rounded bg-[#0e0e1a] text-gray-400 hover:text-white hover:bg-purple-600/30 text-xs transition-colors"
                                onClick={() => updateNote(note.id, { midi: note.midi + 1, pitch: midiToHz(note.midi + 1) })}>+</button>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#0f3460]/40">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">Quick Actions</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => useStore.getState().splitNote(note.id, useStore.getState().currentTime)}
                                className="flex items-center justify-center gap-2 py-2 bg-[#0e0e1a] hover:bg-blue-600/20 text-blue-400 hover:text-white rounded border border-[#2a2a50] text-[11px] font-medium transition-all"
                            >
                                <span>✂️</span> Split at Cursor
                            </button>
                            <button
                                onClick={() => useStore.getState().deleteNote(note.id)}
                                className="flex items-center justify-center gap-2 py-2 bg-[#0e0e1a] hover:bg-red-600/20 text-red-400 hover:text-white rounded border border-[#2a2a50] text-[11px] font-medium transition-all"
                            >
                                <span>🗑️</span> Delete Note
                            </button>
                            <button
                                onClick={() => updateNote(note.id, { midi: note.midi + 1, pitch: midiToHz(note.midi + 1) })}
                                className="flex items-center justify-center gap-2 py-2 bg-[#0e0e1a] hover:bg-purple-600/20 text-purple-400 hover:text-white rounded border border-[#2a2a50] text-[11px] font-medium transition-all"
                            >
                                <span>🔼</span> Snap Up
                            </button>
                            <button
                                onClick={() => updateNote(note.id, { midi: note.midi - 1, pitch: midiToHz(note.midi - 1) })}
                                className="flex items-center justify-center gap-2 py-2 bg-[#0e0e1a] hover:bg-purple-600/20 text-purple-400 hover:text-white rounded border border-[#2a2a50] text-[11px] font-medium transition-all"
                            >
                                <span>🔽</span> Snap Down
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-3 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Vibrato Editor</span>
                        <span className="text-[9px] text-gray-600">Draw with mouse · Click & drag</span>
                    </div>

                    <div className="rounded-lg overflow-hidden border border-[#2a2a50] mb-3" style={{ width: CANVAS_W, height: CANVAS_H }}>
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            className="cursor-crosshair"
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerUp}
                            onPointerCancel={handleCanvasPointerUp}
                        />
                    </div>

                    <div className="mb-3">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Presets</span>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { key: 'sine', label: '〰 Normal' },
                                { key: 'wide', label: '🌊 Wide' },
                                { key: 'slow', label: '🎵 Slow' },
                                { key: 'trill', label: '⚡ Trill' },
                            ].map(preset => (
                                <button
                                    key={preset.key}
                                    onClick={() => applyPreset(preset.key as any)}
                                    className="px-2.5 py-1 rounded bg-[#0e0e1a] border border-[#2a2a50] text-gray-300 hover:text-white hover:border-purple-500 text-[10px] transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={clearVibrato}
                        className="w-full py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 bg-[#0e0e1a] hover:bg-red-600/10 border border-[#2a2a50] transition-colors"
                    >
                        Clear Vibrato Curve
                    </button>

                    <div className="mt-3 text-[10px] text-gray-600 leading-relaxed">
                        <strong className="text-gray-500">Vibrato depth:</strong> {note.vibrato_depth.toFixed(2)} semitones ·
                        <strong className="text-gray-500"> Points:</strong> {(note.vibrato_curve || []).length}
                    </div>
                </div>
            </div>
        </div>
    );
}
