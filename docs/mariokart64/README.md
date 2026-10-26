# MarioKart64JS Integration in Dhaka Date RPG

This minigame replaces the previous custom rickshaw kart prototype with the full-featured **MarioKart64JS** engine, rebuilt in Three.js.

## 3D Character Generation & Modeling Specification
To create or import custom 3D driver models (such as **Satsuki** and **Totoro**), refer to the comprehensive guide:
- 📖 **[3D Character Modeling Specification](CHARACTER_MODELING_SPEC.md)**: Detailed breakdown of the Mario & Donkey Kong case studies, seated karting geometry, coordinate conventions, GenAI prompts, and automated Blender pipeline.
- **Roster:** 8 classic drivers (Mario, Luigi, Peach, Toad, Yoshi, D.K., Wario, Bowser) with authentic weight and handling classes.
- **Wii 3D Karts Mode:** Press `3` to toggle high-fidelity 3D karts with real-time dynamic shadows.
- **Authentic Synthesized Audio & SFX:** Full Web Audio sequencing and voice clips.
- **Items & Hazards:** Bananas, green/red/blue shells, mushrooms, stars, lightning bolts, Boos, fake item boxes, Thwomps, piranha plants, trains, and traffic.
- **Integration Points:**
  - In-game from Dhaka Valley via `RickshawRaceEngine.launch(this)`.
  - Standalone via `/race.html` or `npm run dev:race`.
