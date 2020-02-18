const devices = require("./modules/devices.module");

let refresh = false;

devices.monitor(function (path) {
    console.log("path", path);

    if (path === "/dev/hidraw0") {
        console.log("refresh?");

        if (!refresh) {
            console.log("yes");

            refresh = true;

            devices.refresh();

            setTimeout(function () {
                refresh = false;
            }, 5000);
        }
    }

    //console.log(devices.list[path].properties);
}, function () {
    console.log("reset controls");
});
