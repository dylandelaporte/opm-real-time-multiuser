const HID = require('node-hid');

let devices = {
    type: {
        MOUSE: 0,
        KEYBOARD: 1
    },
    list: {},
    deviceCallback: null,
    deleteDeviceCallback: null
};

devices.monitor = function (deviceCallback, deleteDeviceCallback) {
    devices.deviceCallback = deviceCallback;
    devices.deleteDeviceCallback = deleteDeviceCallback;

    devices.refresh();
};

devices.refresh = function () {
    const hidDevices = HID.devices();

    for (let i = 0; i < hidDevices.length; i++) {
        (function (i) {
            console.log(hidDevices[i]);

            const path = hidDevices[i].path;

            if (!devices.list[path]) {
                if (hidDevices[i].product
                    && (hidDevices[i].product.indexOf("Mouse") >= 0
                    || hidDevices[i].product.indexOf("Keyboard") >= 0)) {
                    console.log("connection to ", path);

                    const device = new HID.HID(path);

                    device.on("error", function (error) {
                        console.log("error on device", hidDevices[i], error);

                        device.close();

                        delete devices.list[path];

                        devices.deleteDeviceCallback(path);
                    });

                    if (hidDevices[i].product.indexOf("Mouse") >= 0) {
                        device.on("data", function (buffer) {
                            let dataArray = Uint8Array.from(buffer);

                            devices.deviceCallback(devices.type.MOUSE, path, dataArray);
                        });
                    } else {
                        device.on("data", function (buffer) {
                            let dataArray = Uint8Array.from(buffer);

                            devices.deviceCallback(devices.type.KEYBOARD, path, dataArray);
                        });
                    }
                }
            }
        })(i);
    }
};

module.exports = devices;