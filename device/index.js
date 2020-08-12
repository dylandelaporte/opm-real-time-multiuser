const io = require("socket.io-client");
const os = require("os");
const uniqid = require("uniqid");

const { createLogger, format, transports } = require("winston");
const { consoleFormat } = require("winston-console-format");

const devices = require("./modules/devices.module");

const logger = createLogger({
    level: "silly",
    format: format.combine(
        format.timestamp(),
        format.ms(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: "Test" },
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                format.padLevels(),
                consoleFormat({
                    showMeta: true,
                    metaStrip: ["timestamp", "service"],
                    inspectOptions: {
                        depth: Infinity,
                        colors: true,
                        maxArrayLength: Infinity,
                        breakLength: 120,
                        compact: Infinity
                    }
                })
            )
        })
    ]
});

//remote server
let ipAddress = "localhost";
let port = 5000;

if (process.argv.length > 2) {
    ipAddress = process.argv[2];

    if (process.argv.length > 3) {
        port = process.argv[3];
    }
}

const remoteServerAddress = "http://" + ipAddress + ":" + port;
const client = io(remoteServerAddress);

logger.info("Remote server address: " + remoteServerAddress);

let connected = false;

client.on("connect", function () {
    logger.info("Connected to the remote server");

    connected = true;
});

client.on("refresh", function () {
    logger.info("Refresh command from the remote server");

    devices.refresh();
});

client.on("disconnect", function () {
    logger.info("Disconnected from the remote server");

    connected = false;
});

client.on("connect_error", function (error) {
    logger.error("Connection error with the remote server", error);
});

function getShortMacAddress() {
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

const shortMacAddress = getShortMacAddress();

logger.info("Short mac address: " + shortMacAddress);

devices.monitor(function (type, path, data) {
    path = shortMacAddress + path;

    if (connected) {
        client.emit(type === devices.type.MOUSE ? "mouse" : "keyboard", {path: path, data: data});
    }
}, function (path) {
    logger.info("Delete device command to the remote server", path);

    if (connected) {
        client.emit("delete", {path: path});
    }
}, logger);
