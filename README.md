# VLConductor

"VideoLAN Conductor" or just "VLC Conductor".

## API

- `new Player((file: string, options: Partial<PlaybackOptions>)`
- `open()`: start playback
- `stop()`:
- `pause()`: pause if playing, ignored otherwise
- `resume()`: play if paused, ignored otherwise
- `seek(value: string)`: use VLC's peculair seek syntax
- `close()`: stop playback, kill subprocess
- `addPositionEvent(position: number, handler: (position?: number) => void)`: add a trigger (call the event handler) when a position is hit/passed

## TODO:

- Multiple layers, multiple players?
- Different functions for various seek value types
- Setup VSCode debugging
- Some unit tests
