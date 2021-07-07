# VLConductor

Allowing programmatic NodeJS control of VLC Player for Raspberry Pi, without a GUI or windowing system.

The name: "VideoLAN Conductor" or just "VLC Conductor".

Based on my other library [omxconductor](https://github.com/RandomStudio/omxconductor) which offered similar functionality, but using the somewhat-deprecated `omxplayer`. (VLC Player supports hardware-accelerated 4K HEVC playback, for example.)

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
