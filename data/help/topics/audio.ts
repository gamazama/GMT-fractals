
import { HelpSection } from '../../../types/help';

export const AUDIO_TOPICS: Record<string, HelpSection> = {
    'panel.audio': {
        id: 'panel.audio',
        category: 'Audio',
        title: 'Audio Engine',
        content: `
The Audio Engine analyzes sound frequencies in real-time to drive fractal parameters, allowing the visual to react to music or voice.

## How it works
1. **Source**: Select an audio input (Microphone, System Audio, or File).
2. **Spectrum**: The engine breaks the sound into frequencies (Bass on left, Treble on right).
3. **Links**: You create "Links" that map a specific frequency range (e.g., the kick drum) to a specific parameter (e.g., Scale).

## Performance
The audio analysis runs on a separate thread context (WebAudio API) and is very lightweight. However, modulating complex geometry parameters (like Loop Iterations) every frame can impact GPU performance.
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
- **Desktop (System Audio)**: Captures audio from other tabs or applications. 
  - *Note*: When the browser dialog appears, you must check the **"Share System Audio"** box, otherwise only video is shared.
- **Load File**: Plays a local audio file (MP3/WAV) in a loop.
`
    },
    'audio.links': {
        id: 'audio.links',
        category: 'Audio',
        title: 'Modulation Links',
        parentId: 'panel.audio',
        content: `
A **Link** connects a slice of the audio spectrum to a fractal parameter.

## Frequency Selection
Drag the **box** on the spectrum view to define the frequency range.
- **Left (Bass)**: Kick drums, basslines.
- **Middle (Mids)**: Vocals, synths, guitars.
- **Right (Treble)**: Hi-hats, cymbals, air.

## Dynamics (Knobs)
- **Threshold (Gate)**: Drag the top/bottom edges of the box. Signals below the bottom edge are ignored (noise gate). Signals above the top edge are clamped (ceiling).
- **Gain**: Multiplies the output signal. Use this if the reaction is too subtle.
- **Attack**: How fast the value rises when a sound hits. Low = Snappy, High = Smooth.
- **Decay**: How fast the value falls after the sound stops. High decay creates a "trailing" effect.
- **Offset**: Adds a base value to the parameter, so it doesn't drop to zero when silent.
`
    }
};
