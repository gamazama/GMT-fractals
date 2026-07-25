
import { HelpSection } from '../../../types/help';

export const AUDIO_TOPICS: Record<string, HelpSection> = {
    'panel.audio': {
        id: 'panel.audio',
        category: 'Audio',
        title: 'Audio Engine',
        content: `
The Audio Engine analyzes sound frequencies in real-time to drive fractal parameters, allowing the visual to react to music or voice.

## How it works
1. **Source**: Select an audio input (Microphone, System Audio, or load a file).
2. **Spectrum**: The engine breaks the sound into frequencies (Bass on left, Treble on right).
3. **Links**: You create "Links" that map a specific frequency range (e.g., the kick drum) to a specific parameter (e.g., Scale).

## Volume and FFT Controls
- **FFT Smooth** (0–0.99): Smooths the frequency analysis over time. Higher values give a more stable, averaged reading.
- **Volume** (0–2): Monitoring level for loaded audio files. Does not affect a live input.
- **Input Trim** (0–8): Boost or cut a *live* input before it reaches the analyser. This is the one to reach for when a mic or line feed is too quiet to trigger anything — it changes what the visuals hear without changing what the room hears.
- **Auto Gain**: Tracks the input level and normalises it, so your thresholds keep working when the music gets quieter or louder. Worth leaving on for a live set, where you don't control the level — without it, a quieter track can stop triggering anything and a louder one pins everything at maximum.
  - It boosts up to ×8 and holds steady through silence, so a gap between tracks doesn't wind the gain up and detonate on the next downbeat.
  - Set the **Input Trim** first so the meter reads healthy, then switch Auto Gain on to ride out the rest.

## Reading the level meter
While a live input is running, a small meter sits beside the Input Trim slider.
- **Green**: healthy — peaks are using most of the range.
- **Amber**: too quiet. Thresholds will barely trigger; raise the trim.
- **Red**: clipping. The analysis is 8-bit, so a pinned signal loses the transient shape that Attack keys off — lower the trim (or the desk send).

## Performance
Audio analysis uses the WebAudio API which processes audio efficiently, but the visualization and modulation application run in the main rendering loop. Modulating complex geometry parameters (like Loop Iterations) every frame can impact GPU performance.
`
    },
    'audio.sources': {
        id: 'audio.sources',
        category: 'Audio',
        title: 'Input Sources',
        parentId: 'panel.audio',
        content: `
Select where the audio data comes from.

- **Mic / Line In**: Captures a hardware input. Use the dropdown underneath to pick *which* one — at a gig that means your audio interface's line input rather than the laptop's built-in mic. The list refreshes automatically when you plug something in.
  - Device names only appear after you have granted microphone permission once; before that they read "Input 1", "Input 2", and so on.
  - Echo cancellation, noise suppression and auto-gain are all requested **off**. Browsers turn these on by default, and on a music feed they duck the signal and flatten the spectrum — which looks exactly like broken modulation.
  - A live input is never routed to your speakers, so a room mic cannot feed back.
- **System Audio**: Captures audio from other tabs or applications, and *is* routed to your speakers so you can hear it.
  - *Note*: When the browser dialog appears, you must check the **"Share System Audio"** box, otherwise only video is shared and nothing will react.
- **Stop**: Releases the input device and clears the browser's recording indicator.
- **Load File**: Loads a local audio file (MP3/WAV) and creates a playback deck with play/pause and seek controls.

## Live rig persistence
While the audio engine is switched on, loading a scene or changing the fractal leaves your input, links and settings exactly as they are — the rig is treated as performance equipment rather than part of the artwork. Scenes saved with an audio setup still restore it normally when you open them with the engine idle.

## Dual Deck / Crossfade
You can load two audio files into **Track A** and **Track B**. Each deck has its own play/pause and seek controls. Use the **Crossfade** slider to blend smoothly between the two tracks — fully left plays only Track A, fully right plays only Track B, and the middle mixes both.
`
    },
    'audio.links': {
        id: 'audio.links',
        category: 'Audio',
        title: 'Modulation Links',
        parentId: 'panel.audio',
        content: `
A **Link** connects a slice of the audio spectrum to a fractal parameter.

## Creating Links
- **Double-click** on the spectrum to create a new modulation box.
- Use the **"+ Add New Link"** button below the spectrum.

## Frequency Selection
The box on the spectrum defines which frequencies drive the parameter.
- **Drag** the box to move it across the frequency range.
- **Drag individual edges** (left, right, top, bottom) to resize the box. The top and bottom edges also control the threshold — signals below the bottom are ignored (noise gate) and signals above the top are clamped (ceiling).
- **Ctrl+Drag** on a box to adjust its gain visually.
- **Right-click** on the spectrum to toggle between **Logarithmic** and **Linear** frequency scale. Logarithmic is the useful one — it spreads out the bass, where nearly all rhythmic energy lives. The 100 / 1k / 10k markers along the bottom show where you are.
- **Quick band buttons** set the box to a real frequency range:
  - **Kick** (40–120 Hz): just the kick fundamental. The tightest band for locking onto four-to-the-floor without the bassline bleeding in.
  - **Bass** (30–250 Hz): kick and bassline together.
  - **Mids** (250 Hz – 2 kHz): vocals, synths, guitar body.
  - **Highs** (4–16 kHz): hi-hats, cymbals, air.
  - **Full**: the whole spectrum — overall loudness.

Bands are shown and edited in **Hz**. A kick occupies well under 1% of the raw analysis range, so a percentage readout could not tell a kick band apart from a whole-bass band.

## Source Selector
Each link has a **Source** dropdown to choose what drives the modulation:
- **Audio Spectrum** (default): Uses the selected frequency range from the live audio.
- **LFO 1 / LFO 2 / LFO 3**: Low-frequency oscillators that provide rhythmic modulation without any audio input — useful for automated, repeating animation.

## Target Parameter
Each link has a dropdown to choose which fractal parameter to modulate (e.g., Scale, Rotation, Fold Amount).

## Response: Level vs Transient
Each audio link chooses how the band becomes a signal.

- **Level** (default): follows the band's loudness. The parameter rises with the sound and stays high for as long as it lasts. Good for pads, swells and overall energy.
- **Transient**: fires on the *attack* only — how fast the band is getting louder. The parameter punches on each hit and falls back between them. This is what you want for kicks and snares: level-following always lags the attack and then holds through the sustain, which reads as mushy on a beat.

Tips for Transient:
- Pair it with the **Kick** quick band and a low **Attack**; use **Decay** to set how long the punch trails.
- If hits feel soft, lower **FFT Smooth**. Heavy smoothing averages away the very transients this mode reads.

## Dynamics (Knobs)
Five knobs shape how the signal behaves before it reaches the parameter:
- **Attack** (Rise): How fast the value rises when a sound hits. Low = snappy, high = smooth.
- **Decay** (Fall): How fast the value falls after the sound stops. High decay creates a "trailing" effect.
- **Smooth** (Lerp): Blends between the previous value and the new value each frame, softening rapid changes.
- **Gain** (Mult): Multiplies the output signal. Increase this if the reaction is too subtle.
- **Offset** (Add): Adds a base value to the parameter, so it doesn't drop to zero when silent.

## Active Links
Below the spectrum, a collapsible list shows all your modulation rules. Each entry displays a color indicator, the frequency range, and a delete button for quick management.
`
    }
};
