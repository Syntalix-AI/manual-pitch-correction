import axios from 'axios';
import { AnalysisResult, NoteBlob } from '../types';

const API_BASE = 'http://localhost:8000';

export const uploadAudio = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/upload`, formData);
    return res.data.file_id;
};

export const analyzeAudio = async (fileId: string): Promise<AnalysisResult> => {
    const res = await axios.post(`${API_BASE}/analyze/${fileId}`);
    return res.data;
};

export const renderPitch = async (fileId: string, notes: NoteBlob[]): Promise<void> => {
    await axios.post(`${API_BASE}/render_pitch`, {
        file_id: fileId,
        notes
    });
};

export const getStreamUrl = (fileId: string, rendered: boolean = false): string => {
    return `${API_BASE}/stream/${fileId}?rendered=${rendered ? 'true' : 'false'}&t=${Date.now()}`;
};
