const Player = require("vlconductor");

const player = new Player("media/tenseconds.mp4");

let hasPaused = false;

player.open().then(() => {
  player.on("status", (data) => {
    console.log("status", data);
    const { state, position } = data;
    if (position >= 0.3 && !hasPaused) {
      console.log("********************* PAUSE!");
      // player.seek("6")
      player.pause();
      setTimeout(() => {
        console.log("********************* RESUME!");
        player.resume();
      }, 4000);
      hasPaused = true;
    }
  });
  player.on("stopped", async () => {
    console.log("****************** STOPPED");
    await player.close();
  });
});
