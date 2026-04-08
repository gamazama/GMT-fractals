
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
- **Volume** (0–2): Master gain slider controlling the overall audio level.

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

- **Microphone**: Uses your default recording device. Great for voice reactivity or ambient room noise.
- **System Audio**: Captures audio from other tabs or applications.
  - *Note*: When the browser dialog appears, you must check the **"Share System Audio"** box, otherwise only video is shared.
- **Load File**: Loads a local audio file (MP3/WAV) and creates a playback deck with play/pause and seek controls.

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
- **Right-click** on the spectrum to toggle between **Logarithmic** and **Linear** frequency scale.
- **Quick band buttons**: Bass, Mids, Treble, Full — instantly position the box over common frequency ranges.

Frequency guide:
- **Left (Bass)**: Kick drums, basslines.
- **Middle (Mids)**: Vocals, synths, guitars.
- **Right (Treble)**: Hi-hats, cymbals, air.

## Source Selector
Each link has a **Source** dropdown to choose what drives the modulation:
- **Audio Spectrum** (default): Uses the selected frequency range from the live audio.
- **LFO 1 / LFO 2 / LFO 3**: Low-frequency oscillators that provide rhythmic modulation without any audio input — useful for automated, repeating animation.

## Target Parameter
Each link has a dropdown to choose which fractal parameter to modulate (e.g., Scale, Rotation, Fold Amount).

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
