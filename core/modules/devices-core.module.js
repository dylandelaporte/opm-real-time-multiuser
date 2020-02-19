let devices = {
    type: {
        MOUSE: 0,
        KEYBOARD: 1
    },
    frame: {
        width: 0,
        height: 0
    },
    keyMap: {
        30: ["1", "!"],
        31: ["2", "@"],
        32: ["3", "#"],
        33: ["4", "$"],
        34: ["5", "%"],
        35: ["6", "^"],
        36: ["7", "&"],
        37: ["8", "*"],
        38: ["9", "("],
        39: ["0", ")"],
        45: ["-", "="],
        46: ["^", "~"],
        42: ["DELETE", "DELETE"],
        43: ["TAB", "TAB"],
        20: ["q", "Q"],
        26: ["w", "W"],
        8: ["e", "E"],
        21: ["r", "R"],
        23: ["t", "T"],
        28: ["y", "Y"],
        24: ["u", "U"],
        12: ["i", "I"],
        18: ["o", "O"],
        19: ["p", "P"],
        47: ["[", "{"],
        48: ["]", "}"],
        49: ["¥", "|"],
        40: ["ENTER", "ENTER"],
        57: ["LOCK", "LOCK"],
        4: ["a", "A"],
        22: ["s", "S"],
        7: ["d", "D"],
        9: ["f", "F"],
        10: ["g", "G"],
        11: ["h", "H"],
        13: ["j", "J"],
        14: ["k", "K"],
        15: ["l", "L"],
        51: [";", "+"],
        52: [":", "*"],
        50: ["]", "}"],
        29: ["z", "Z"],
        27: ["x", "X"],
        6: ["c", "C"],
        25: ["v", "V"],
        5: ["b", "B"],
        17: ["n", "N"],
        16: ["m", "M"],
        54: [",", "<"],
        55: [".", ">"],
        56: ["/", "?"],
        135: ["_", "\""],
        44: ["SPACE", "SPACE"]
    },
    list: {},
    deviceCallback: null,
    deleteDeviceCallback: null
};

devices.setWindowSize = function (frame) {
    devices.frame = frame;
};

devices.monitor = function (deviceCallback, deleteDeviceCallback) {
    devices.deviceCallback = deviceCallback;
    devices.deleteDeviceCallback = deleteDeviceCallback;
};

devices.reset = function () {
    const devicePaths = Object.keys(devices.list);

    for (let i = 0; i < devicePaths.length; i++) {
        if (devices.list[devicePaths[i]].type === devices.type.MOUSE) {
            devices.list[devicePaths[i]].properties.top = 0;
            devices.list[devicePaths[i]].properties.left = 0;
        }
        else if (devices.list[devicePaths[i]].type === devices.type.KEYBOARD) {
            devices.list[devicePaths[i]].properties.keyBuffer = [];
        }
    }
};

devices.deleteDevice = function (path) {
    delete devices.list[path];

    devices.deleteDeviceCallback(path);
};

devices.mouseUpdate = function (path, data) {
    if (!devices.list[path]) {
        devices.list[path] = {
            type: devices.type.MOUSE,
            properties: {
                click: {
                    left: false,
                    right: false,
                    wheel: false
                },
                left: 0,
                top: 0,
                wheel: 0
            }
        };
    }

    let properties = devices.list[path].properties;

    if (data[1] > 100) {
        properties.left -= 256 - data[1];
    } else if (data[1] > 0) {
        properties.left += data[1];
    }

    if (data[2] > 100) {
        properties.top -= 256 - data[2];
    } else if (data[2] > 0) {
        properties.top += data[2];
    }

    if (data[3] > 100) {
        properties.wheel = 2;
    } else if (data[3] > 0) {
        properties.wheel = 1;
    } else {
        properties.wheel = 0;
    }

    if (properties.left < 0) {
        properties.left = 0;
    }

    if (properties.top < 0) {
        properties.top = 0;
    }

    if (properties.left > devices.frame.width) {
        properties.left = devices.frame.width;
    }

    if (properties.top > devices.frame.height) {
        properties.top = devices.frame.height;
    }

    switch (data[0]) {
        case 1:
            properties.click.left = true;
            properties.click.right = false;
            properties.click.wheel = false;
            break;
        case 2:
            properties.click.left = false;
            properties.click.right = true;
            properties.click.wheel = false;
            break;
        case 3:
            properties.click.left = true;
            properties.click.right = true;
            properties.click.wheel = false;
            break;
        case 4:
            properties.click.left = false;
            properties.click.right = false;
            properties.click.wheel = true;
            break;
        case 5:
            properties.click.left = true;
            properties.click.right = false;
            properties.click.wheel = true;
            break;
        case 6:
            properties.click.left = false;
            properties.click.right = true;
            properties.click.wheel = true;
            break;
        case 7:
            properties.click.left = true;
            properties.click.right = true;
            properties.click.wheel = true;
            break;
        default:
            properties.click.left = false;
            properties.click.right = false;
            properties.click.wheel = false;
    }

    devices.deviceCallback(path);
};

devices.keyboardUpdate = function (path, data) {
    if (!devices.list[path]) {
        devices.list[path] = {
            type: devices.type.KEYBOARD,
            properties: {
                shift: false,
                shiftLock: false,
                keyBuffer: []
            }
        };
    }

    let properties = devices.list[path].properties;

    properties.shift = data[0] === 2 || data[0] === 32;

    for (let i = 2; i < data.length; i++) {
        let key = devices.keyMap[data[i]];

        if (key) {
            if (key[0] === "LOCK") {
                properties.shiftLock = !properties.shiftLock;
            } else {
                properties.keyBuffer.push(key[properties.shift || properties.shiftLock ? 1 : 0]);
            }
        }
    }

    devices.deviceCallback(path);
};

module.exports = devices;