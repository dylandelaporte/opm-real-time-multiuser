const HID = require('node-hid');

let devices = {
    type: {
        MOUSE: 0,
        KEYBOARD: 1
    },
    list: {},
    deviceCallback: null,
    deleteDeviceCallback: null,
    logger: null
};

devices.monitor = function (deviceCallback, deleteDeviceCallback, logger) {
    devices.deviceCallback = deviceCallback;
    devices.deleteDeviceCallback = deleteDeviceCallback;

    devices.logger = logger;

    devices.refresh();
};

devices.refresh = function () {
    const hidDevices = HID.devices();

    for (let i = 0; i < hidDevices.length; i++) {
        (function (i) {
            const path = hidDevices[i].path;

            if (!devices.list[path]) {
                if (hidDevices[i].product
                    && (hidDevices[i].product.indexOf("Mouse") >= 0
                    || hidDevices[i].product.indexOf("Keyboard") >= 0)) {
                    devices.logger.info("connection to: " + path);

                    const device = new HID.HID(path);

                    device.on("error", function (error) {
                        devices.logger.error("error on device: " + hidDevices[i], error);

                        device.close();

                        delete devices.list[path];

                        devices.deleteDeviceCallback(path);
                    });

                    if (hidDevices[i].product.indexOf("Mouse") >= 0) {
                        device.on("data", function (buffer) {
                            let dataArray = Array.from(buffer);

                            devices.deviceCallback(devices.type.MOUSE, path, dataArray);
                        });
                    } else {
                        device.on("data", function (buffer) {
                            let dataArray = Array.from(buffer);

                            devices.deviceCallback(devices.type.KEYBOARD, path, dataArray);
                        });
                    }
                }
            }
        })(i);
    }
};

module.exports = devices;