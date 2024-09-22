const config = require("./config");
const path = require('path');
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const { Storage } = require('megajs')

//Launch website
const app = express();
app.use(express.static("website", {index: "index.html"}));
const server = http.createServer(app);
const io = socketio(server, {maxHttpBufferSize: config.MAX_IMAGE_SIZE});
console.log('FILE TYPES -> ', config.FILE_TYPES);

var file_info = {};
var storage;

(async function () {
    storage = await new Storage({email: config.EMAIL, password: config.PASSWORD}).ready;
    console.log('mega.nz account logged.');
}());

//When someone visit webpage
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/website/index.html");
});

function findNode(root, parent, name, fDir) {
    for (const [id, file] of Object.entries(root.storage.files)) {
        isType = fDir ? file.directory : !file.directory;
        if ((file.name == name) && (file.parent.nodeId == parent) && isType) { return file; }
    }

    return null;
}

function findFolder(root, fid) {
    return root.storage.files[fid];
}

async function megaCreateDir(root, parent, name) {
    return new Promise(function(resolve) {
        var node = findNode(root, parent, name, true);

        if (node != null) {
            resolve(node.nodeId);
        } else {
            var folder = findFolder(root, parent);
            folder.mkdir(name, (error, folder) => {
                if (error) { console.log(error); }
                if (folder) { resolve(folder.nodeId); }
            });
        }
    });
}

async function megaDeleteDir(root, fid) {
    return new Promise(function(resolve) {
        var folder = findFolder(root, fid);
        if (!folder) { return resolve(); }

        folder.delete(true, (error, data) => {
            if (error) console.log(error);
            resolve();
        });
    });
}

async function megaUploadFile(root, fid, name, buffer) {
    return new Promise(function(resolve) {
        var folder = findFolder(root, fid);
        var node = findNode(root, fid, name, false);

        if ((folder != null) && (node == null)) {
            folder.upload(name, buffer, (error, file) => {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

//When someone connects
io.sockets.on("connection", socket => {
    //send settings
    socket.emit("config", {FILE_TYPES: config.FILE_TYPES});

    //When sending file info
    socket.on("file", async data => {
        file_info = data;
        var isAllowed = ((data.size > 0) && (data.size <= config.MAX_SIZE));
        var isAllowed = isAllowed && config.FILE_TYPES.includes(path.extname(data.name).substring(1).toLocaleLowerCase());
        console.log(data, isAllowed);
        socket.emit("uploading_file", {done: true, allow: isAllowed});
    });

    //Upload file data
    socket.on("file_data", async data => {
        while (!storage?.root) { await Wait(1); }
        console.log("Uploading data.");

        if (file_info.fid == '') {
            if (socket.handshake.headers["x-forwarded-for"]) {
                var address = socket.handshake.headers["x-forwarded-for"];
            } else {
                var address = socket.handshake.address.split(":").pop();
            }
            
            file_info.fid = await megaCreateDir(storage.root, config.BASE_DIR_ID, address);
        }

        while (1) {
            try {
                await megaUploadFile(storage.root, file_info.fid, file_info.name, data);
                break;
            } catch(e) {
                await Wait(100);
                continue;
            }
        }

        console.log("Uploading done.");
        socket.emit("uploading_file", {done: true});
    });

    //Create directory
    socket.on("folder_create", async data => {
        while (!storage?.root) { await Wait(1); }
        if (data.fid == '') {
            if (socket.handshake.headers["x-forwarded-for"]) {
                var address = socket.handshake.headers["x-forwarded-for"];
            } else {
                var address = socket.handshake.address.split(":").pop();
            }

            data.fid = await megaCreateDir(storage.root, config.BASE_DIR_ID, address);
        }

        console.log(`[*] Dir create -> ${data.name}; parent: [${data.fid}]`);

        while (1) {
            try {
                data.fid = await megaCreateDir(storage.root, data.fid, data.name);
                break;
            } catch(e) {
                await Wait(100);
                continue;
            }
        }

        console.log(`[+] Dir create -> ${data.name}; id: [${data.fid}]`);
        socket.emit("uploading_dir", {done: true, fid: data.fid});
    });

    //Delete directory
    socket.on("folder_delete", async data => {
        while (!storage?.root) { await Wait(1); }
        console.log(`[*] Dir delete -> [${data.fid}]`);

        while (1) {
            try {
                await megaDeleteDir(storage.root, data.fid);
                break;
            } catch(e) {
                await Wait(100);
                continue;
            }
        }

        console.log(`[-] Dir delete -> [${data.fid}]`);
        socket.emit("removing_dir", {done: true});
    });
});


//Start server
server.listen(process.env.PORT || config.PORT, function() {
    console.log(`Listening on port: ${process.env.PORT || config.PORT}`);
});


//============================================================================================================================================================
//Bunch of different functions================================================================================================================================
//============================================================================================================================================================


//Set title
process.title = "File Yoinker";


//Wait function
async function Wait(milleseconds) {
	return new Promise(resolve => setTimeout(resolve, milleseconds))
}
