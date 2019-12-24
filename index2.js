const HID = require('node-hid');
const io = require('socket.io')();

var devices = HID.devices();

for (let i = 0; i < devices.length; i++) {
    if (devices[i].product.indexOf("USB") >= 0) {
        console.log(i, devices[i]);
    }
}

/*var deviceInfo = devices.find( function(d) {
    return d.usagePage === 1 && d.usage === 1;
});
*/

const deviceInfo1 = devices[0];

if(deviceInfo1) {
    console.log("deviceInfo", deviceInfo1);

    var device1 = new HID.HID( deviceInfo1.path );

    device1.on("data", function (data) {
        //console.log("data", data, data.toString('hex'));

        let arrByte = Uint8Array.from(data);

        //console.log(arrByte, arrByte.length);

        io.emit("mouse", {id: 0, actions: arrByte});
    });
}

const deviceInfo2 = devices[2];

if(deviceInfo2) {
    console.log("deviceInfo", deviceInfo2);

    var device2 = new HID.HID( deviceInfo2.path );

    device2.on("data", function (data) {
        //console.log("data", data, data.toString('hex'));

        let arrByte = Uint8Array.from(data);

        //console.log(arrByte, arrByte.length);

        io.emit("mouse", {id: 1, actions: arrByte});
    })
}

io.on('connection', client => {
    console.log("connection");

    io.emit("element", {id: 0, x: 10, y: 10, width: 300, text: "Element 0"});

    client.on('event', data => {
        console.log("event", data)
    });

    client.on('disconnect', () => {
        console.log("disconnect");
    });
});

io.listen(3000);