export interface PlaybackOptions {
  loop: boolean;
  killOnEnd: boolean;
  immediatePause: boolean;
}

export interface Config {
  loglevel: string;
  checkInterval: number;
  options: PlaybackOptions;
  http: {
    host: string;
    port: number;
    password: string;
  };
}

const defaults: Config = {
  loglevel: "info",
  checkInterval: 16,
  options: {
    loop: false,
    killOnEnd: false,
    immediatePause: false,
  },
  http: {
    host: "0.0.0.0",
    port: 8088,
    password: "vlconductor",
  },
};

export default defaults;
