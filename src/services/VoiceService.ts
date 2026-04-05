/**
 * VoiceService — Whisper transcription via Groq API
 *
 * Records audio using expo-av, uploads to Groq Whisper,
 * and returns the transcribed text.
 */

import { Audio } from 'expo-av';

export class VoiceService {
    private recording: Audio.Recording | null = null;

    async startRecording(): Promise<void> {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
            throw new Error('Microphone permission denied');
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        this.recording = recording;
    }

    async stopAndTranscribe(apiKey: string, baseUrl?: string): Promise<string> {
        if (!this.recording) return '';

        await this.recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        const uri = this.recording.getURI();
        this.recording = null;

        if (!uri) return '';

        // Upload to Groq Whisper API
        const formData = new FormData();
        formData.append('file', {
            uri,
            type: 'audio/m4a',
            name: 'recording.m4a',
        } as any);
        formData.append('model', 'whisper-large-v3-turbo');
        // Don't force language — let Whisper auto-detect

        const endpoint = (baseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, '');

        try {
            const res = await fetch(`${endpoint}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const error = await res.text();
                console.error('[VoiceService] Transcription failed:', error);
                return '';
            }

            const data = await res.json();
            return data.text || '';
        } catch (e) {
            console.error('[VoiceService] Network error:', e);
            return '';
        }
    }

    async cancelRecording(): Promise<void> {
        if (this.recording) {
            try {
                await this.recording.stopAndUnloadAsync();
            } catch { }
            this.recording = null;
        }
    }

    get isRecording(): boolean {
        return this.recording !== null;
    }
}
