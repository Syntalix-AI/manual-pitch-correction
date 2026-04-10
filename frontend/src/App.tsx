import React from 'react'
import AudioPlayer from './components/AudioPlayer'
import { Music2, Layers, Cpu, Waves } from 'lucide-react'

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-[#0b1020] text-gray-200 overflow-hidden font-sans">
      {/* Premium Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0b1020]/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center justify-center w-10 h-10 bg-[#16213e] rounded-lg border border-white/10 shadow-xl">
              <Waves className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter kord-gradient-text uppercase">Kord</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 -mt-1">Manual Pitch Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span>Processing Active</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>v0.1.0-alpha</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 text-xs font-semibold backdrop-blur-md">
            <Music2 className="w-4 h-4" />
            Project Settings
          </button>
        </div>
      </header>

      {/* Control Bar (AudioPlayer) */}
      <AudioPlayer />

      {/* Main Workspace */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-8">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px]"></div>
        </div>

        <div className="z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">
            Editor Ready
          </div>
          <h2 className="text-4xl font-light text-white leading-tight">
            Precision <span className="font-bold">Pitch Control</span><br/>at your fingertips.
          </h2>
          <p className="max-w-md mx-auto text-gray-400 text-sm leading-relaxed">
            Open the inspector to start editing pitch notes. Use the timeline to navigate through your track.
          </p>
        </div>

        {/* Placeholder for Timeline/Visualizer if any */}
        <div className="w-full max-w-5xl h-48 mt-12 glass-panel rounded-2xl flex items-center justify-center border border-white/5">
            <div className="flex flex-col items-center gap-2 opacity-30">
                <Music2 className="w-8 h-8" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Waveform Inspector Active</span>
            </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="px-5 py-2 bg-panel/30 border-t border-white/5 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
        <div className="flex gap-4">
            <span>Ready</span>
            <span className="text-blue-500">Latency: 12ms</span>
        </div>
        <div>
            © 2026 Kord Audio Technology
        </div>
      </footer>
    </div>
  )
}
