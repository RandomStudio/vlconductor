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

## TODO:

- Should be able to add event emitters for time-based trigger(s)
- Throw error if file not found
- Multiple layers, multiple players?
