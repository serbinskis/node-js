const config = require("./config");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Canvas = require("canvas")
const fs = require("fs");
const tmi = require('tmi.js');

const client = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: config.USERNAME,
        password: config.OAUTH,
    },
    channels: [config.CHANNEL],
  });

//Variable to store all rooms
var canvas = Canvas.createCanvas(config.SIZE, config.SIZE);
var context = canvas.getContext('2d')

if (fs.existsSync("./image.png")) {
    Canvas.loadImage('./image.png').then(image => {
        context.drawImage(image, 0, 0, config.SIZE, config.SIZE)
        console.log("Loaded image.")
    });
} else {
    console.log("Created new image.")
    context.fillStyle = "white";
    context.fillRect(0, 0, config.SIZE, config.SIZE);
}

//Launch website
const app = express();
app.use(express.static("website", {index: "index.html"}));
const server = http.createServer(app);
const io = socketio(server);


//When someone visit webpage
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/website/index.html");
});


//When someone connects
io.sockets.on("connection", socket => {
    socket.emit("canvas", canvas.toDataURL("image/png"));
});


//Connect to bot
client.connect();


//Recive message
client.on("message", (channel, tags, message, self) => {
    const args = message.split(/\s+/);
    if (args.length < 4) { return; }

    if (!args[0].includes("!p")) { return; }
    if (!(/^\d+$/.test(args[1])) || !(/^\d+$/.test(args[2]))) { return; }
    if (!(/^#[0-9A-F]{6}$/i.test(args[3]))) { return; }

    console.log(message);
    DrawPixel(parseInt(args[1]), parseInt(args[2]), args[3]);
});


//============================================================================================================================================================
//Bunch of different functions================================================================================================================================
//============================================================================================================================================================


//Set title
process.title = "Twitch Art";


//On exit close website
process.on('SIGINT', function() {
    console.log("Exit");
    fs.writeFileSync("./image.png", canvas.toBuffer('image/png'));
    process.exit();
});


//Draw pixel on canvas
function DrawPixel(x, y, color) {
    if ((x < 0) || (y < 0) || (x > config.SIZE-1) || (y > config.SIZE-1)) { return; }

    var roundedX = Math.round(x);
    var roundedY = Math.round(y);

    context.beginPath();
    context.fillStyle = color || '#000';
    context.fillRect(roundedX, roundedY, 1, 1);
    context.fill();

    io.sockets.emit("pixel", {x: x, y: y, color: color});
}


//Start server
server.listen(config.PORT, "127.0.0.1", function() {
    console.log(`Listening on 127.0.0.1:${config.PORT}`);
});