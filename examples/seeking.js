const Player = require("vlconductor");

const player = new Player("media/testsrc-longer-keyframes1.mp4");

let hasJumped = false;

player.open().then(() => {
  player.on("status", (data) => {
    console.log("status", data);
    const { state, position } = data;
    if (position >= 0.1 && !hasJumped) {
      console.log("********************* SEEK!");
      player.seek("21");
      hasJumped = true;
    }
  });
  player.on("stopped", async () => {
    console.log("****************** STOPPED");
    await player.close();
  });
});
