import axios from 'axios';
import { AnalysisResult, NoteBlob } from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000';

export async function uploadAudio(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/upload`, formData);
    return res.data.file_id;
}

export async function analyzeAudio(fileId: string): Promise<AnalysisResult> {
    const res = await axios.get(`${API_BASE}/analyze/${fileId}`);
    return res.data;
}

export async function renderPitch(fileId: string, notes: NoteBlob[]): Promise<any> {
    const res = await axios.post(`${API_BASE}/render_pitch`, {
        file_id: fileId,
        notes: notes
    });
    return res.data;
}

export function getStreamUrl(fileId: string, rendered: boolean = false): string {
    return `${API_BASE}/stream/${fileId}?rendered=${rendered}`;
}
