const HID = require('node-hid');
const usbDetect = require('usb-detection');

let devices = {type: {MOUSE: 0, KEYBOARD: 1}, frame: {width: 0, height: 0}, list: {}, callback: null};

devices.setWindowSize = function (frame) {
    devices.frame = frame;
};

devices.monitor = function (callback) {
    devices.callback = callback;

    usbDetect.startMonitoring();

    usbDetect.on('change', function() {
        devices.refresh();
    });

    devices.refresh();
};

devices.refresh = function () {
    const hidDevices = HID.devices();

    const listKeys = Object.keys(devices.list);

    for (let i = 0; i < listKeys.length; i++) {
        devices.list[listKeys[i]].object.close();
    }

    devices.list = {};

    for (let i = 0; i < hidDevices.length; i++) {
        if (hidDevices[i].product.indexOf("USB") >= 0) {
            (function (i) {
                const path = hidDevices[i].path;

                if (hidDevices[i].product.indexOf("Mouse") >= 0) {
                    console.log("mouse", hidDevices[i]);

                    const mouse = {
                        object: new HID.HID(path),
                        type: devices.type.MOUSE,
                        properties: {
                            click: {
                                left: false,
                                right: false,
                                wheel: false
                            },
                            left: 0,
                            top: 0
                        }
                    };

                    mouse.object.on("data", function (buffer) {
                        let dataArray = Uint8Array.from(buffer);

                        devices.mouseUpdate(path, dataArray);
                        devices.callback(path);
                    });

                    devices.list[path] = mouse;
                }
            })(i);
        }
    }
};

devices.mouseUpdate = function (path, data) {
    let properties = devices.list[path].properties;

    if (data[2] > 100) {
        properties.top -= 256 - data[2];
    } else if (data[2] > 0) {
        properties.top += data[2];
    }

    if (data[1] > 100) {
        properties.left -= 256 - data[1];
    } else if (data[1] > 0) {
        properties.left += data[1];
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
};

devices.getAvailableDevices = function (io, mouseAssociations, keyboardAssociations) {
    let availableDevices = {};

    const listKeys = Object.keys(devices.list);

    for (let i = 0; i < listKeys.length; i++) {
        if (!(mouseAssociations[listKeys[i]] && keyboardAssociations[listKeys[i]])) {
            availableDevices[listKeys[i]] = devices.list[listKeys[i]].type;
        }
    }

    io.emit("devices", availableDevices);
};

devices.mouseOutput = function (io, userId, devicePath) {
    io.emit("mouse", {id: userId, properties: devices.list[devicePath].properties});
};

module.exports = devices;