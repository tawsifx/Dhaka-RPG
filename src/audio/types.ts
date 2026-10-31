// src/audio/types.ts - Type Definitions for Modern Audio Engine Subsystems

export type AudioBusName = 'Master' | 'Music' | 'SFX' | 'Voice' | 'Ambient';

export type MusicState = 'EXPLORATION' | 'TENSION' | 'COMBAT' | 'BOSS';

export interface BGMTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  badge: string;
}

export interface BGMDeck {
  id: 'A' | 'B';
  audio: HTMLAudioElement | null;
  sourceNode: MediaElementAudioSourceNode | null;
  gainNode: GainNode | null;
  trackSrc: string;
}

export interface AudioVoice {
  id: number;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  busName: AudioBusName;
  priority: number;
  isPlaying: boolean;
  startTime: number;
}

export interface RandomizedAudioConfig {
  pitchRange?: [number, number]; // e.g. [0.9, 1.1]
  volumeRangeDb?: [number, number]; // e.g. [-3.0, 0.0]
  bus?: AudioBusName;
}

export interface BusVolumeConfig {
  master: number;
  music: number;
  sfx: number;
  voice: number;
  ambient: number;
}
