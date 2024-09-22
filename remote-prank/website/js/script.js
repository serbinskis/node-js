var socket = io.connect();
var audio = new Audio();

function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);

    for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
}

$("#join").click(function(e) {
    if (!$('#code')[0].value || !$('#code')[0].value.match(/^.[0-9a-z]{7,7}$/)) { return; }

    socket.emit("join_room", {
        room_code: $('#code')[0].value,
    });
});

$("#stop").click(function(e) {
    if (!$('#code')[0].value || !$('#code')[0].value.match(/^.[0-9a-z]{7,7}$/)) { return; }

    socket.emit("stop_audio", {
        room_code: $('#code')[0].value,
    });
});

$("#send").click(function(e) {
    if (!$('#code')[0].value || !$('#code')[0].value.match(/^.[0-9a-z]{7,7}$/)) { return; }

    var input = document.createElement("input");
    var reader = new FileReader();
    var filename = '';

    input.setAttribute("type", "file");
    input.setAttribute("accept", ".mp3,.wav,.ogg,.m4a");

    input.onchange = function(event) {
        filename = event.target.files[0].name;
        reader.readAsArrayBuffer(event.target.files[0]);
    }

    reader.onload = function(event) {
        socket.emit("play_audio", {
            room_code: $('#code')[0].value,
            ext: filename.split('.').pop(),
            buffer: event.target.result,
        });
        input.remove();
    }

    input.click();
});

socket.on("join_room", function(data) {
    if (!data || data.code != 200) { return; }
    window.document.title = "Google"
    document.querySelector("link[rel~='icon']").href = "https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png";
    $('#login-container')[0].style = "display:none";
    $('#google')[0].style = null;
    alert("Just click OK to bypass some browser security of autoplay.")

    audio.src = "trigger.mp3";
    audio.pause();
    audio.currentTime = 0;
    audio.play();
});


socket.on("stop_audio", function(data) {
    audio.pause();
});


socket.on("play_audio", function(data) {
    audio.src = `data:audio/${data.ext};base64,${arrayBufferToBase64(data.buffer)}`;
    audio.pause();
    audio.currentTime = 0;
    audio.play();
});

