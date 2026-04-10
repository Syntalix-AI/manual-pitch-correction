import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getStreamUrl } from '../api';
import { Play, Pause, Download, Sparkles, Loader2 } from 'lucide-react';

export default function AudioPlayer() {
    const renderedUrl = useStore(s => s.renderedUrl);
    const playing = useStore(s => s.playing);
    const setPlaying = useStore(s => s.setPlaying);
    const setCurrentTime = useStore(s => s.setCurrentTime);
    const currentTime = useStore(s => s.currentTime);
    const duration = useStore(s => s.duration);
    const renderChanges = useStore(s => s.renderChanges);
    const loading = useStore(s => s.loading);
    const fileId = useStore(s => s.fileId);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current) {
            if (playing) {
                audioRef.current.play().catch(e => console.error(e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [playing, renderedUrl]);

    const onTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
        setCurrentTime(time);
    };

    const formatTime = (t: number) => {
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        const ms = Math.floor((t % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-6 px-6 h-16 bg-[#16213e]/80 backdrop-blur-lg border-b border-white/5 shrink-0 shadow-2xl z-10">
            <audio
                ref={audioRef}
                src={renderedUrl || ''}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setPlaying(false)}
            />

            <button
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] group active:scale-95"
                title={playing ? 'Pause' : 'Play'}
            >
                {playing ? (
                    <Pause className="w-5 h-5 text-white fill-white" />
                ) : (
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                )}
            </button>

            <div className="flex-1 flex items-center gap-4">
                <span className="text-[10px] text-blue-400 font-bold font-mono w-16 text-right tabular-nums tracking-wider">{formatTime(currentTime)}</span>
                <div className="flex-1 relative group py-2">
                    <input
                        type="range"
                        max={duration || 1}
                        step={0.01}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full accent-blue-500 h-1.5 bg-background rounded-full appearance-none cursor-pointer"
                    />
                </div>
                <span className="text-[10px] text-gray-500 font-bold font-mono w-16 tabular-nums tracking-wider">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={renderChanges}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 active:scale-95"
                >
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {loading ? 'Rendering...' : 'Render Audio'}
                </button>

                <button
                    onClick={async () => {
                        if (!fileId) return;
                        const useRendered = Boolean(renderedUrl);
                        const url = getStreamUrl(fileId, useRendered);
                        try {
                            const res = await fetch(url);
                            if (!res.ok) throw new Error('Failed to fetch audio');
                            const blob = await res.blob();
                            const a = document.createElement('a');
                            const name = `${fileId}${useRendered ? '_rendered.wav' : '.wav'}`;
                            a.href = URL.createObjectURL(blob);
                            a.download = name;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
                        } catch (err) {
                            console.error(err);
                        }
                    }}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all active:scale-95"
                    title="Download audio"
                >
                    <Download className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
