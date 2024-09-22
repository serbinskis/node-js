var socket = io.connect();
var uploading_dir = {};
var removing_dir = {};
var uploading_file = {};
var config = {};

socket.on("config", function(data) {
    config = data;
});

socket.on("uploading_dir", function(data) {
    uploading_dir = data;
});

socket.on("removing_dir", function(data) {
    removing_dir = data;
});

socket.on("uploading_file", function(data) {
    uploading_file = data;
});


async function getFile(item) {
    return new Promise(function(resolve) {
        item.file(function(file) {
            resolve(file);
        });
    });
}


function BytesToSize(bytes) {
    var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes == 0) return "0 Byte";
    var i = parseInt(Math.floor(Math.log(bytes)/Math.log(1024)));
    return Math.round(bytes/Math.pow(1024, i), 2) + ' ' + sizes[i];
}


async function readFile(file) {
    return new Promise(function(resolve) {
        var reader = new FileReader();

        reader.onload = function(event) {
            resolve(event.target.result);
        }

        reader.readAsArrayBuffer(file);
    });
}


async function readDirectory(directory, isReader) {
    var dirReader = isReader ? directory : directory.createReader();

    return new Promise(function(resolve) {
        dirReader.readEntries(async function(results) {
            if (results.length) {
                resolve(Array.from(results).concat(await readDirectory(dirReader, true)));
            } else {
                resolve([]);
            }
        });
    });
}


async function traverseFileTree(item, fid) {
    if (item.isFile) {
        var file = await getFile(item);

        uploading_file.done = false;
        socket.emit("file", {name: file.name, size: file.size, fid: fid});
        while (!uploading_file.done) { await Wait(1); }
        var count = uploading_file.allow ? 1 : 0;

        if (uploading_file.allow) {
            console.log(`fid [${fid}] -> ${file.name} | Size: ${BytesToSize(file.size)}`);
            uploading_file.done = false;
            socket.emit("file_data", await readFile(file));
            while (!uploading_file.done) { await Wait(1); }
        }

        return count;
    } else if (item.isDirectory) {
        //Read directory, files and folders
        var entries = await readDirectory(item);

        //Remove not whitlisted files
        entries = entries.filter(e => {
            var ext = e.name.slice((e.name.lastIndexOf(".") - 1 >>> 0) + 2);
            return !e.isFile || config.FILE_TYPES.includes(ext);
        });

        //If nothing left there is no point uploading it
        if (entries.length == 0) { return 0; }

        //Create base dir
        uploading_dir.done = false;
        socket.emit("folder_create", {name: item.name, fid: fid});
        while (!uploading_dir.done) { await Wait(1); }
        var fid1 = uploading_dir.fid;
        var count = 0;

        //Upload files and folders to base dir
        for (var i = 0; i < entries.length; i++) {
            num = await traverseFileTree(entries[i], fid1);
            if (!isNaN(num)) { count += num; }
        }

        //If uploaded count is 0 then delete directory
        if (count == 0) {
            removing_dir.done = false;
            socket.emit("folder_delete", {fid: fid1});
            while (!removing_dir.done) { await Wait(1); }
        }

        return count;
    }
}


async function dropHandler(e) {
    e.preventDefault();
    console.log('Started upload.');
    $("#drop_zone")[0].style = "display: none;"
    var items = [];

    for (var i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind == 'file') {
            items.push(e.dataTransfer.items[i].webkitGetAsEntry());
        }
    }

    for (var i = 0; i < items.length; i++) {
        await traverseFileTree(items[i], '');
    }

    $("#drop_zone")[0].style = "";
    console.log('Upload finished.');
}


function dragOverHandler(e) {
    e.preventDefault();
}


async function Wait(milleseconds) {
	return new Promise(resolve => setTimeout(resolve, milleseconds))
}
