import React, { useRef, useEffect } from 'react';
import { useStore } from './store/useStore';
import PianoRoll from './components/PianoRoll';
import NoteInspector from './components/NoteInspector';

export default function App() {
    const fileId = useStore(s => s.fileId);
    const setFile = useStore(s => s.setFile);
    const loading = useStore(s => s.loading);
    const error = useStore(s => s.error);
    const playing = useStore(s => s.playing);
    const setPlaying = useStore(s => s.setPlaying);
    const currentTime = useStore(s => s.currentTime);
    const setCurrentTime = useStore(s => s.setCurrentTime);
    const renderedUrl = useStore(s => s.renderedUrl);
    const currentTool = useStore(s => s.currentTool);
    const setCurrentTool = useStore(s => s.setCurrentTool);
    const contextMenu = useStore(s => s.contextMenu);
    const setContextMenu = useStore(s => s.setContextMenu);
    const splitNote = useStore(s => s.splitNote);
    const deleteNote = useStore(s => s.deleteNote);
    const setInspectorOpen = useStore(s => s.setInspectorOpen);

    const audioRef = useRef<HTMLAudioElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (playing) {
            audio.currentTime = currentTime;
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }
    }, [playing]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const updateTime = () => {
            if (playing) setCurrentTime(audio.currentTime);
        };
        audio.addEventListener('timeupdate', updateTime);
        return () => audio.removeEventListener('timeupdate', updateTime);
    }, [playing, setCurrentTime]);

    const closeContextMenu = () => setContextMenu(null);

    return (
        <div className="flex flex-col h-screen bg-[#0e0e1a] text-white font-sans overflow-hidden" onClick={closeContextMenu}>
            <header className="flex items-center justify-between px-6 py-4 bg-[#16213e] border-b border-[#0f3460] shrink-0 z-10 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center font-bold text-lg shadow-lg">P</div>
                    <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">PitchCraft</h1>
                </div>
                
                <div className="flex items-center gap-4">
                    {!fileId && (
                        <label className="bg-purple-600 hover:bg-purple-500 transition-colors px-6 py-2 rounded-full font-medium cursor-pointer shadow-lg shadow-purple-900/20 active:scale-95">
                            Upload Vocal Track
                            <input type="file" accept="audio/*" onChange={handleFile} className="hidden" />
                        </label>
                    )}
                    
                    {fileId && (
                        <>
                            <div className="flex bg-[#0a0f1d] rounded-lg p-1 border border-[#2a2a50]">
                                <button
                                    className={`px-4 py-1.5 rounded-md text-sm transition-all ${currentTool === 'move' ? 'bg-[#2a2a50] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setCurrentTool('move')}
                                >
                                    Move
                                </button>
                                <button
                                    className={`px-4 py-1.5 rounded-md text-sm transition-all ${currentTool === 'vibrato' ? 'bg-[#2a2a50] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setCurrentTool('vibrato')}
                                >
                                    Vibrato
                                </button>
                            </div>

                            <button
                                onClick={() => setPlaying(!playing)}
                                className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center transition-all shadow-lg active:scale-90"
                            >
                                {playing ? '⏸' : '▶'}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0e0e1a]/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <span className="text-purple-400 font-medium animate-pulse">Processing Audio with PSOLA...</span>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 border border-red-400 text-white px-6 py-3 rounded-lg shadow-xl shadow-red-900/20">
                    {error}
                </div>
            )}

            <main className="flex-1 flex overflow-hidden relative">
                {fileId ? (
                    <>
                        <PianoRoll />
                        <NoteInspector />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 select-none">
                        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500/20 to-orange-500/20 flex items-center justify-center mb-6">
                            <span className="text-6xl">🎵</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No audio loaded</h2>
                        <p className="text-gray-400 max-w-sm">Upload a clean, monophonic vocal or instrumental track to begin editing pitch.</p>
                    </div>
                )}
                
                {contextMenu && (
                    <div 
                        className="fixed z-50 bg-[#1a1a2e] border border-[#2a2a50] rounded-lg shadow-2xl py-1 w-48 overflow-hidden"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button 
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => {
                                splitNote(contextMenu.noteId, contextMenu.splitTime);
                                closeContextMenu();
                            }}
                        >
                            <span>✂️</span> Split Note
                        </button>
                        <button 
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => {
                                setInspectorOpen(true);
                                closeContextMenu();
                            }}
                        >
                            <span>〰</span> Edit Vibrato
                        </button>
                        <div className="h-px bg-[#2a2a50] my-1" />
                        <button 
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center gap-2"
                            onClick={() => {
                                deleteNote(contextMenu.noteId);
                                closeContextMenu();
                            }}
                        >
                            <span>🗑️</span> Delete Note
                        </button>
                    </div>
                )}
            </main>

            {renderedUrl && (
                <audio ref={audioRef} src={renderedUrl} onEnded={() => setPlaying(false)} className="hidden" />
            )}
        </div>
    );
}
