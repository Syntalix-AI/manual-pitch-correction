import React from 'react'
import AudioPlayer from './components/AudioPlayer'

export default function App(){
  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <AudioPlayer />
      <div className="p-6">Open the inspector to edit notes.</div>
    </div>
  )
}
