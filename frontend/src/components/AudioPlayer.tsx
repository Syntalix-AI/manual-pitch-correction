import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getStreamUrl } from '../api';

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
        <div className="flex items-center gap-4 px-5 h-12 bg-[#16213e] border-b border-[#0f3460]/60 shrink-0 shadow-md z-10">
            <audio
                ref={audioRef}
                src={renderedUrl || ''}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setPlaying(false)}
            />

            <button
                onClick={() => setPlaying(!playing)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 transition-all shadow text-sm"
                title={playing ? 'Pause' : 'Play'}
            >
                {playing ? '⏸' : '▶'}
            </button>

            <div className="flex-1 flex items-center gap-3">
                <span className="text-[11px] text-gray-400 font-mono w-16 text-right">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    max={duration || 1}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 accent-blue-500 h-1"
                />
                <span className="text-[11px] text-gray-500 font-mono w-16">{formatTime(duration)}</span>
            </div>

            <button
                onClick={renderChanges}
                disabled={loading}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-xs font-semibold transition-all shadow disabled:opacity-50"
            >
                {loading ? '⏳ Rendering...' : '✨ Apply & Render'}
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
                        alert('Download failed');
                    }
                }}
                className="ml-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-semibold transition-all shadow"
                title="Download audio"
            >
                ⬇️ Download
            </button>
        </div>
    );
}
import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getStreamUrl } from '../api';

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
        <div className="flex items-center gap-4 px-5 h-12 bg-[#16213e] border-b border-[#0f3460]/60 shrink-0 shadow-md z-10">
            <audio
                ref={audioRef}
                src={renderedUrl || ''}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setPlaying(false)}
            />

            {/* Play/Pause */}
            <button
                onClick={() => setPlaying(!playing)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 transition-all shadow text-sm"
                title={playing ? 'Pause' : 'Play'}
            >
                {playing ? '⏸' : '▶'}
            </button>

            {/* Timeline */}
            <div className="flex-1 flex items-center gap-3">
                <span className="text-[11px] text-gray-400 font-mono w-16 text-right">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    max={duration || 1}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 accent-blue-500 h-1"
                />
                <span className="text-[11px] text-gray-500 font-mono w-16">{formatTime(duration)}</span>
            </div>

            {/* Render button */}
            <button
                onClick={renderChanges}
                disabled={loading}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-xs font-semibold transition-all shadow disabled:opacity-50"
            >
                {loading ? '⏳ Rendering...' : '✨ Apply & Render'}
            </button>

            {/* Download button */}
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
                        alert('Download failed');
                    }
                }}
                className="ml-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-semibold transition-all shadow"
                title="Download audio"
            >
                ⬇️ Download
            </button>
        </div>
    );
}
