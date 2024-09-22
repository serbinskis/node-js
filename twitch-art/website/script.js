var socket = io.connect();

socket.on("canvas", function(data) {
    LoadImage("canvas", data);
});


socket.on("pixel", function(data) {
    DrawPixel("canvas", data.x, data.y, data.color);
});

function DrawPixel(id, x, y, color) {
    var canvas = document.getElementById(id);
    var context = canvas.getContext('2d');

    var roundedX = Math.round(x);
    var roundedY = Math.round(y);

    context.beginPath();
    context.fillStyle = color || '#000';
    context.fillRect(roundedX, roundedY, 1, 1);
    context.fill();
}

async function LoadImage(id, src) {
    return new Promise(resolve => {
        var canvas = document.getElementById(id);
        var context = canvas.getContext('2d');

        img = new Image();

        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            document.getElementById("label").innerHTML = `${img.width} x ${img.height}`
            context.drawImage(img, 0, 0);
            resolve(true);
        }

        img.onerror = function () {
            resolve(false);
        }

        img.src = src;
    });
}