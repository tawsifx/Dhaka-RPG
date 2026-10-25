// src/config/tracks.db.ts - Registry of available race tracks & metadata
export interface TrackMeta {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  laps: number;
  lengthMeters: number;
  targetLapTimeSec: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  assets: {
    json: string;
    visualGlb: string;
    collisionGlb: string;
    previewImg?: string;
  };
}

export const TRACK_REGISTRY: Record<string, TrackMeta> = {
  fuller_road_sprint: {
    id: 'fuller_road_sprint',
    name: 'Fuller Road Sprint',
    subtitle: 'Curzon Hall to TSC Rotunda',
    description: 'Iconic Dhaka University circuit featuring the terracotta Curzon Hall straight, S-chicane, TSC rotunda hairpin, flyover elevation, and courtyard grass shortcut.',
    laps: 3,
    lengthMeters: 1316,
    targetLapTimeSec: 57,
    difficulty: 'Medium',
    assets: {
      json: '/assets/race/tracks/fuller_road_sprint/track.json',
      visualGlb: '/assets/race/tracks/fuller_road_sprint/visual.glb',
      collisionGlb: '/assets/race/tracks/fuller_road_sprint/collision.glb'
    }
  },
  arena: {
    id: 'arena',
    name: 'Analytic Proving Ground',
    subtitle: 'Flat Test Arena',
    description: 'The M2 flat proving ground with slalom cones, boost pads, mud/puddle chicanes, and boundary walls.',
    laps: 3,
    lengthMeters: 800,
    targetLapTimeSec: 40,
    difficulty: 'Easy',
    assets: {
      json: '',
      visualGlb: '',
      collisionGlb: ''
    }
  }
};
