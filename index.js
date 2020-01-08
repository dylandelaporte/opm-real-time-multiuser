const HID = require('node-hid');
const io = require('socket.io')();

var devices = HID.devices();

for (let i = 0; i < devices.length; i++) {
    if (devices[i].product.indexOf("USB") >= 0) {
        console.log(i, devices[i]);
    }
}

const project = {
    frame: {
        width: 500,
        height: 500
    },
    users: {},
    getUser: function (id) {
        if (!project.users[id]) {
            project.users[id] = {
                mouse: {
                    click: {
                        left: false,
                        right: false,
                        wheel: false
                    },
                    left: 0,
                    top: 0
                },
                keyboard: {},
                action: {
                    type: actions.type.HOVER,
                    status: actions.status.READY,
                    elements: [],
                }
            };
        }

        return project.users[id];
    }
};

const mouses = {
    list: {},
    update: function (data) {
        const mouse = project.getUser(data.id).mouse;

        //console.log(data);

        if (data.actions[2] > 100) {
            mouse.top -= 256 - data.actions[2];
        } else if (data.actions[2] > 0) {
            mouse.top += data.actions[2];
        }

        if (data.actions[1] > 100) {
            mouse.left -= 256 - data.actions[1];
        } else if (data.actions[1] > 0) {
            mouse.left += data.actions[1];
        }

        if (mouse.left < 0) {
            mouse.left = 0;
        }

        if (mouse.top < 0) {
            mouse.top = 0;
        }

        if (mouse.left > project.frame.width) {
            mouse.left = project.frame.width;
        }

        if (mouse.top > project.frame.height) {
            mouse.top = project.frame.height;
        }

        switch (data.actions[0]) {
            case 1:
                mouse.click.left = true;
                mouse.click.right = false;
                mouse.click.wheel = false;
                break;
            case 2:
                mouse.click.left = false;
                mouse.click.right = true;
                mouse.click.wheel = false;
                break;
            case 3:
                mouse.click.left = true;
                mouse.click.right = true;
                mouse.click.wheel = false;
                break;
            case 4:
                mouse.click.left = false;
                mouse.click.right = false;
                mouse.click.wheel = true;
                break;
            case 5:
                mouse.click.left = true;
                mouse.click.right = false;
                mouse.click.wheel = true;
                break;
            case 6:
                mouse.click.left = false;
                mouse.click.right = true;
                mouse.click.wheel = true;
                break;
            case 7:
                mouse.click.left = true;
                mouse.click.right = true;
                mouse.click.wheel = true;
                break;
            default:
                mouse.click.left = false;
                mouse.click.right = false;
                mouse.click.wheel = false;
        }

        actions.update(data.id);
    },
    output: function (id) {
        io.emit("mouse", {id: id, position: project.getUser(id).mouse});
    }
};

const elements = {
    list: {},
    nextId: 0,
    add: function () {
        const id = elements.nextId;

        elements.nextId++;

        elements.list[id] = {
            type: "area",
            x: 10,
            y: 10,
            width: 300,
            height: 150,
            text: "Element 0",
            hover: false
        };

        elements.output(id);
    },
    output: function (id) {
        io.emit("element", {id: id, properties: elements.list[id]});
    },
    outputAll: function () {
        const elementIds = Object.keys(elements.list);

        for (let i = 0; i < elementIds.length; i++) {
            console.log(i, elementIds[i]);
            elements.output(elementIds[i]);
        }
    },
    collisions: function (id) {
        const mouse = project.getUser(id).mouse;

        const elementIds = Object.keys(elements.list);

        for (let i = 0; i < elementIds.length; i++) {
            if (mouse.left >= elements.list[elementIds[i]].x && mouse.left <= elements.list[elementIds[i]].x + elements.list[elementIds[i]].width) {
                if (mouse.top >= elements.list[elementIds[i]].y && mouse.top <= elements.list[elementIds[i]].y + elements.list[elementIds[i]].height) {
                    return {id: elementIds[i], type: "all"};
                }
            }
        }

        return null;
    }
};

elements.add();

const actions = {
    type: {HOVER: 0, MOVE: 1, SELECT: 2},
    status: {READY: 0, EXECUTED: 1},
    update: function (id) {
        const user = project.getUser(id);
        const collisionElement = elements.collisions(id);

        //console.log("collisionElement", collisionElement);

        if (user.mouse.click.left) {
            if (user.action.type === actions.type.MOVE && user.action.status === actions.status.EXECUTED) {
                console.log("update", elements.list[user.action.elements[0]]);

                elements.list[user.action.elements[0]].x = user.mouse.left - user.action.gap.x;
                elements.list[user.action.elements[0]].y = user.mouse.top - user.action.gap.y;

                elements.list[user.action.elements[0]].selected = id;

                elements.output(user.action.elements[0]);
            }
            //other actions by click
        } else {
            if (user.action.type === actions.type.MOVE) {
                console.log("end move");

                user.action.type = actions.type.SELECT;
                user.action.status = actions.status.READY;

                elements.list[user.action.elements[0]].selected = id;

                elements.output(user.action.elements[0]);

                //user.action.status = actions.status.READY;
            }
        }

        if (collisionElement !== null) {
            //if action is free
            if (user.action.status === actions.status.READY) {
                console.log("hover");

                user.action.type = actions.type.HOVER;

                if (user.action.elements.length < 1) {
                    console.log("new hover");

                    elements.list[collisionElement.id].hover = id;
                    user.action.elements = [collisionElement.id];

                    elements.output(user.action.elements[0]);
                } else if (user.action.elements[0] !== collisionElement.id) {
                    console.log("change hover");

                    elements.list[user.action.elements[0]].hover = -1;

                    elements.output(user.action.elements[0]);

                    elements.list[collisionElement.id].hover = id;
                    user.action.elements = [collisionElement.id];

                    elements.output(user.action.elements[0]);
                }
            }

            if (user.mouse.click.left && user.action.status !== actions.status.EXECUTED) {
                console.log("click");

                user.action.type = actions.type.MOVE;

                user.action.status = actions.status.EXECUTED;
                user.action.elements = [collisionElement.id];

                user.action.gap = {
                    x: user.mouse.left - elements.list[collisionElement.id].x,
                    y: user.mouse.top - elements.list[collisionElement.id].y
                };
            }
        } else {
            if (user.action.type === actions.type.HOVER && user.action.elements.length > 0) {
                console.log("stop hover");

                elements.list[user.action.elements[0]].hover = -1;

                elements.output(user.action.elements[0]);

                user.action.elements = [];
            }
        }
    }
};

const deviceInfo1 = devices[0];

if (deviceInfo1) {
    console.log("deviceInfo", deviceInfo1);

    var device1 = new HID.HID(deviceInfo1.path);

    device1.on("data", function (buffer) {
        //console.log("data", data, data.toString('hex'));

        let arrByte = Uint8Array.from(buffer);

        console.log(arrByte, arrByte.length);

        const data = {id: 0, actions: arrByte};

        mouses.update(data);

        mouses.output(data.id);
    });
}

const deviceInfo2 = devices[2];

if (deviceInfo2) {
    console.log("deviceInfo", deviceInfo2);

    var device2 = new HID.HID(deviceInfo2.path);

    device2.on("data", function (buffer) {
        //console.log("data", data, data.toString('hex'));

        let arrByte = Uint8Array.from(buffer);

        console.log(arrByte, arrByte.length);

        const data = {id: 1, actions: arrByte};

        mouses.update(data);

        mouses.output(data.id);
    });
}

io.on('connection', client => {
    console.log("connection");

    elements.outputAll();

    client.on('window', data => {
        console.log("window", data);

        project.frame.width = data.width;
        project.frame.height = data.height;

        io.emit("window", project.frame);
    });

    client.on('disconnect', () => {
        console.log("disconnect");
    });
});

io.listen(3000);