const io = require("socket.io-client");
const os = require("os");
const uniqid = require("uniqid");

const devices = require("./modules/devices.module");

const ipAddress = "localhost";
const client = io("http://" + ipAddress + ":5000");

let connected = false;

client.on("connect", function () {
    console.log("connect");

    connected = true;
});

client.on("refresh", function () {
    devices.refresh();
});

client.on("disconnect", function () {
    console.log("disconnect");

    connected = false;
});

client.on("connect_error", function (error) {
    console.log("connect_error", error);
});

function getMacAddress() {
    const interfaces = os.networkInterfaces();
    const interfaceNames = Object.keys(interfaces);

    if (interfaceNames.length > 0) {
        while ((interfaceNames[0] === "lo"
            || interfaceNames[0].length < 1)
        && interfaceNames.length > 0) {
            interfaceNames.shift();
        }

        if (interfaceNames.length > 0) {
            if (interfaces[interfaceNames[0]][0].mac.length > 2) {
                return interfaces[interfaceNames[0]][0].mac.substr(-2);
            }
        }
    }

    return uniqid();
}

let macAddress = getMacAddress();

devices.monitor(function (type, path, data) {
    path = macAddress + path;

    console.log("device action", path);

    if (connected) {
        client.emit(type === devices.type.MOUSE ? "mouse" : "keyboard", {path: path, data: data});
    }
}, function (path) {
    console.log("reset controls", path);

    if (connected) {
        client.emit("delete", {path: path});
    }
});
