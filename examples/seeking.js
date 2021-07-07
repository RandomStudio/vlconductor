const Player = require("vlconductor");

const player = new Player("media/tenseconds.mp4");

let hasJumped = false;

player.open().then(() => {
  player.on("status", (data) => {
    console.log("status", data);
    const { state, position } = data;
    if (position >= 0.3 && !hasJumped) {
      console.log("********************* SEEK!");
      // player.seek("6")
      player.pause();
      hasJumped = true;
    }
  });
  player.on("stopped", async () => {
    console.log("****************** STOPPED");
    await player.close();
  });
});
