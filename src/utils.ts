import { exec } from 'child_process'
import { logger } from './Player'

export interface ExecResult {
  stdout: string
  stderr: string
}

// Since exec is not (yet) Promisified, this function makes things easier
export const execPromise = (command: string) =>
  new Promise<ExecResult>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      logger.debug("execPromise callback", { err, stdout, stderr });
      if (err) {
        reject(err)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
