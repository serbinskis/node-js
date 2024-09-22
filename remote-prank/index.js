const http = require("http");
const express = require("express");
const socketio = require("socket.io");

const app = express();
app.use(express.static("website", {index: "index.html"}));
const server = http.createServer(app);

const io = socketio(server, {
    maxHttpBufferSize: 1024*1024*10
});


app.get("/", function(req, res) {
    res.sendFile(__dirname + "/website/index.html");
});


io.sockets.on("connection", socket => {
    socket.on("join_room", async data => {
        if (!data || !data.room_code || !data.room_code.match(/^.[0-9a-z]{7,7}$/)) { return; }
        socket.join(data.room_code);
        socket.emit("join_room", {code: 200});
    });

    socket.on("stop_audio", async data => {
        if (!data || !data.room_code || !data.room_code.match(/^.[0-9a-z]{7,7}$/)) { return; }
        io.sockets.to(data.room_code).emit("stop_audio");
    });

    socket.on("play_audio", async data => {
        console.log(data.buffer.byteLength);
        if (!data || !data.room_code || !data.room_code.match(/^.[0-9a-z]{7,7}$/)) { return; }
        io.sockets.to(data.room_code).emit("play_audio", data);
    });
});


server.listen(process.env.PORT || 3000, function() {
    console.log(`Listening on port: ${process.env.PORT || 3000}`);
});