import { exec } from "child_process";
import { Config, PlaybackOptions } from "./defaults";
import { logger } from "./Player";

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export const getStatusUrl = (http: Config["http"]) =>
  `http://localhost:${http.port}/requests/status.xml`;

export const getParams = (
  fullPath: string,
  http: Config["http"],
  options: PlaybackOptions
): string[] => [
  "--no-osd",
  "-I http",
  "--http-password",
  http.password,
  "--http-host",
  http.host,
  "--http-port",
  http.port.toString(),
  fullPath,
  options.loop === true ? "--loop" : undefined,
];

export const getAuthCode = (username: string, password: string) =>
  Buffer.from(`${username}:${password}`).toString("base64");
