const io = require('socket.io')();

const devices = require("./modules/devices.module");
const elements = require("./modules/elements.module");

const project = require("./modules/project.module");

devices.setWindowSize({width: 500, height: 500});

devices.monitor(function (devicePath) {
    if (project.mode === project.MODES.SETTING) {
        packet.clear();

        if (project.editionUser) {
            if (devices.list[devicePath].type === devices.type.KEYBOARD) {
                project.deleteKeyboardUser(project.editionUser);

                project.keyboardAssociations[devicePath] = project.editionUser;
            }
            else {
                project.deleteMouseUser(project.editionUser);

                project.mouseAssociations[devicePath] = project.editionUser;
            }

            project.editionUser = null;

            packet.set(packet.KEYS.GENERAL, project.getGeneral());
        }

        packet.set(packet.KEYS.DEVICE, devicePath);

        packet.send();
    }
    else {
        let mouseUserId = project.mouseAssociations[devicePath];
        let keyboardUserId = project.keyboardAssociations[devicePath];

        if (mouseUserId) {
            packet.clear(mouseUserId);
            packet.set(packet.KEYS.MOUSE, devices.list[devicePath].properties);

            executeMouseAction(devicePath, mouseUserId);

            packet.send();
        } else if (keyboardUserId) {
            packet.clear(keyboardUserId);

            executeKeyboardAction(devicePath, keyboardUserId);

            packet.send();
        }
    }
});

let packet = {
    KEYS: {
        GENERAL: "g",
        MOUSE: "m",
        ELEMENT: "e",
        ACTION: "a",
        DEVICE: "d",
        WINDOW: "w",
        TOOLBAR: "t"
    },
    clear: function (id) {
        if (id) {
            packet.data = {id: id};
        } else {
            packet.data = {};
        }
    },
    set: function (key, data, id) {
        if (id) {
            if (!packet.data[key]) {
                packet.data[key] = {};
            }

            packet.data[key][id] = data;
        } else {
            packet.data[key] = data;
        }
    },
    send: function () {
        io.emit("data", packet.data);
    },
    data: {}
};

function sendAtConnection() {
    packet.clear();

    packet.set(packet.KEYS.GENERAL, project.getGeneral());

    if (project.mode === project.MODES.EDITION) {
        packet.set(packet.KEYS.WINDOW, devices.frame);
        packet.set(packet.KEYS.TOOLBAR, project.toolbar);
        packet.set(packet.KEYS.ELEMENT, elements.list);
    }

    packet.send();
}

function sendGeneral() {
    packet.clear();

    packet.set(packet.KEYS.GENERAL, project.getGeneral());

    packet.send();
}

function sendWindow() {
    packet.clear();

    packet.set(packet.KEYS.WINDOW, devices.frame);
    packet.set(packet.KEYS.TOOLBAR, project.toolbar);

    packet.send();
}

io.on("connection", client => {
    console.log("connection");

    client.on("first.contact", data => {
        if (Number.isInteger(data.width) && Number.isInteger(data.height)) {
            devices.setWindowSize(data);
            project.setToolbar(data);

            sendAtConnection();
        }
    });

    client.on("send.general", () => {
        sendGeneral();
    });

    client.on("set.mode", (data) => {
        console.log(data);
        if (data.mode === project.MODES.SETTING) {
            project.mode = project.MODES.SETTING;
        }
        else {
            project.mode = project.MODES.EDITION;
        }

        sendGeneral();
    });

    //settings
    client.on("get.availabledevices", () => {
        devices.getAvailableDevices(io, project.mouseAssociations, project.keyboardAssociations);
    });

    client.on("add.user", data => {
        project.addUser(data.id);

        sendGeneral();
    });

    client.on("set.user", data => {
        console.log("set.user", data);

        project.setUser(data);

        sendGeneral();
    });

    client.on("set.edition.user", (data) => {
        console.log("set.edition.user", data);

        project.editionUser = data.id;
    });

    client.on("delete.user", data => {
        project.deleteUser(data.id);

        sendGeneral();
    });

    //view
    client.on("update.window", data => {
        console.log("window", data);

        if (Number.isInteger(data.width) && Number.isInteger(data.height)) {
            devices.setWindowSize(data);
            project.setToolbar(data);

            sendWindow();
        }
    });

    client.on("disconnect", () => {
        console.log("disconnect");
    });
});

io.listen(3000);

function finishSelectAction(user) {
    /*if (user.action.type === project.action.type.HOVER && user.action.elements.length > 0) {
        elements.list[user.action.elements[0]].hover = null;
    }
     */

    if (user.action.type === project.action.type.SELECT && user.action.elements.length > 0) {
        console.log("end select");

        user.action.type = project.action.type.NONE;

        const elementId = user.action.elements[0];

        elements.list[elementId].selected = null;

        user.action.elements = [];

        packet.set(packet.KEYS.ELEMENT, {selected: null}, elementId);

        //elements.output(io, elementId);
    }
}

function executeMouseAction(devicePath, userId) {
    const device = devices.list[devicePath];
    const user = project.users[userId];

    //tools bar
    const buttonToolbar = project.isWithinToolbar(device.properties);

    if (buttonToolbar) {
        if (device.properties.click.left && user.action.status === project.action.status.OUT) {
            finishSelectAction(user);

            if (buttonToolbar === "LINK_BUTTON") {
                if (Object.keys(elements.list).length > 1) {
                    console.log("new link");

                    user.action.type = project.action.type.NEW_LINK;
                    user.action.status = project.action.status.IN;
                    user.action.elements = [];

                    //project.userOutput(io, userId);

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                }
            } else if (buttonToolbar === "PROCESS_BUTTON") {
                console.log("new process");

                user.action.type = project.action.type.NEW_PROCESS;
                user.action.status = project.action.status.IN;
                user.action.elements = [];

                //project.userOutput(io, userId);

                packet.set(packet.KEYS.ACTION, project.users[userId].action);
            } else if (buttonToolbar === "OBJECT_BUTTON") {
                console.log("new objects");

                user.action.type = project.action.type.NEW_OBJECT;
                user.action.status = project.action.status.IN;
                user.action.elements = [];

                //project.userOutput(io, userId);

                packet.set(packet.KEYS.ACTION, project.users[userId].action);
            }
        }
    } else {
        const collisionElement = elements.collisions(device.properties);

        //console.log("collisionElement", collisionElement, user.action.type, user.action.status, user.action.elements);

        if (device.properties.click.left) {
            if (user.action.type === project.action.type.MOVE && user.action.status === project.action.status.IN) {
                elements.list[user.action.elements[0]].selected = userId;

                const elementsOutput = elements.move(io, user.action.elements[0],
                    device.properties.left - user.action.gap.x,
                    device.properties.top - user.action.gap.y);

                packet.set(packet.KEYS.ELEMENT, elementsOutput);
            } else if (user.action.type === project.action.type.MOVE_NODE_LINK
                && user.action.status === project.action.status.IN) {
                const oldPositions = [...elements.list[user.action.elements[0]].positions];

                elements.list[user.action.elements[0]].positions[user.action.elements[1] * 2] =
                    device.properties.left - user.action.gap.x;
                elements.list[user.action.elements[0]].positions[user.action.elements[1] * 2 + 1] =
                    device.properties.top - user.action.gap.y;

                const positions = elements.updateArrow(user.action.elements[0]);

                const angle = elements.angleNodeArrow(user.action.elements[0], user.action.elements[1]);

                console.log("angle", angle);

                if (angle > 88 && angle < 92) {
                    console.log("perpendicular angle");

                    elements.list[user.action.elements[0]].positions = oldPositions;
                }
                else {
                    packet.set(packet.KEYS.ELEMENT, {positions: positions}, user.action.elements[0]);
                }
            }
            //else if (other actions by click) {}
            else {
                if (collisionElement !== null) {
                    if (user.action.type === project.action.type.NEW_LINK
                        && user.action.status === project.action.status.IN) {
                        if (user.action.elements.length > 0) {
                            if (user.action.elements[0] !== collisionElement.id) {
                                user.action.elements.push(collisionElement.id);

                                const elementsOutput = elements.add(io, elements.type.ARROW_AGGREGATION, user.action.elements);

                                packet.set(packet.KEYS.ELEMENT, elementsOutput);

                                user.action.status = project.action.status.OUT;
                            }
                        } else {
                            user.action.elements.push(collisionElement.id);
                        }
                    } else if (user.action.status === project.action.status.OUT) {
                        if (elements.list[collisionElement.id].type.indexOf("arrow") >= 0) {
                            if (collisionElement.node) {
                                finishSelectAction(user);

                                user.action.type = project.action.type.MOVE_NODE_LINK;

                                user.action.status = project.action.status.IN;
                                user.action.elements = [collisionElement.id, collisionElement.node];

                                user.action.gap = {
                                    x: device.properties.left
                                        - elements.list[collisionElement.id].positions[collisionElement.node * 2],
                                    y: device.properties.top
                                        - elements.list[collisionElement.id].positions[collisionElement.node * 2 + 1]
                                };

                                packet.set(packet.KEYS.ACTION, project.users[userId].action);
                            } else {
                                finishSelectAction(user);

                                user.action.type = project.action.type.NEW_NODE_LINK;

                                user.action.status = project.action.status.IN;

                                elements.list[collisionElement.id].positions.splice(collisionElement.after + 1,
                                    0, collisionElement.position.x);
                                elements.list[collisionElement.id].positions.splice(collisionElement.after + 2,
                                    0, collisionElement.position.y);

                                user.action.elements[0] = collisionElement.id;

                                packet.set(packet.KEYS.ACTION, project.users[userId].action);

                                packet.set(packet.KEYS.ELEMENT,
                                    {positions: elements.list[collisionElement.id].positions}, collisionElement.id);
                            }

                        } else {
                            finishSelectAction(user);

                            user.action.type = project.action.type.MOVE;

                            user.action.status = project.action.status.IN;
                            user.action.elements = [collisionElement.id];

                            user.action.gap = {
                                x: device.properties.left - elements.list[collisionElement.id].x,
                                y: device.properties.top - elements.list[collisionElement.id].y
                            };
                        }

                        packet.set(packet.KEYS.ACTION, project.users[userId].action);
                    }
                } else {
                    if (user.action.type === project.action.type.NEW_OBJECT
                        && user.action.status === project.action.status.IN) {
                        const elementsOutput = elements.add(io, elements.type.OBJECT, device.properties.left, device.properties.top);

                        packet.set(packet.KEYS.ELEMENT, elementsOutput);

                        user.action.status = project.action.status.OUT;
                    } else if (user.action.type === project.action.type.NEW_PROCESS
                        && user.action.status === project.action.status.IN) {
                        const elementsOutput = elements.add(io, elements.type.PROCESS, device.properties.left, device.properties.top);

                        packet.set(packet.KEYS.ELEMENT, elementsOutput);

                        user.action.status = project.action.status.OUT;
                    } else if (user.action.type === project.action.type.SELECT) {
                        console.log("end select");

                        finishSelectAction(user);
                    }
                }
            }
        } else {
            if ((user.action.type === project.action.type.MOVE
                || user.action.type === project.action.type.MOVE_NODE_LINK
                || user.action.type === project.action.type.NEW_NODE_LINK
                || user.action.type === project.action.type.DELETE_NODE_LINK)
                && user.action.status === project.action.status.IN) {
                console.log("end move / new node link");

                finishSelectAction(user);

                user.action.type = project.action.type.SELECT;
                user.action.status = project.action.status.OUT;

                elements.list[user.action.elements[0]].selected = userId;

                packet.set(packet.KEYS.ACTION, project.users[userId].action);
                packet.set(packet.KEYS.ELEMENT, {selected: userId}, user.action.elements[0]);
            }
        }

        if (device.properties.click.right) {
            if (collisionElement !== null) {
                if (collisionElement.node) {
                    console.log("delete node");

                    user.action.type = project.action.type.DELETE_NODE_LINK;

                    user.action.status = project.action.status.IN;

                    elements.list[collisionElement.id].positions.splice(collisionElement.node * 2, 2);

                    const positions = elements.updateArrow(collisionElement.id);

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                    packet.set(packet.KEYS.ELEMENT, {positions: positions}, collisionElement.id);
                }
            }
        }

        if (collisionElement !== null) {
            console.log(collisionElement);

            //if (user.action.status === project.action.status.OUT) {
            //console.log("hover");

            //user.action.type = project.action.type.HOVER;

            if (user.action.hover === null) {
                //console.log("new hover");

                elements.list[collisionElement.id].hover = userId;
                user.action.hover = collisionElement.id;

                //project.userOutput(io, userId);

                packet.set(packet.KEYS.ACTION, project.users[userId].action);

                //elements.output(io, user.action.hover);

                packet.set(packet.KEYS.ELEMENT, {hover: userId}, user.action.hover);
            } else if (user.action.hover !== collisionElement.id) {
                //console.log("change hover");

                elements.list[user.action.hover].hover = null;

                //elements.output(io, user.action.hover);

                packet.set(packet.KEYS.ELEMENT, {hover: null}, user.action.hover);

                elements.list[collisionElement.id].hover = userId;
                user.action.hover = collisionElement.id;

                //elements.output(io, user.action.hover);

                packet.set(packet.KEYS.ELEMENT, {hover: userId}, user.action.hover);
            }
            //}
        } else {
            if (user.action.hover !== null) {
                //console.log("stop hover");

                elements.list[user.action.hover].hover = null;

                //elements.output(io, user.action.hover);

                packet.set(packet.KEYS.ELEMENT, {hover: null}, user.action.hover);

                user.action.hover = null;
            }
        }
    }

    //devices.mouseOutput(io, userId, devicePath);
}

function executeKeyboardAction(devicePath, userId) {
    const device = devices.list[devicePath];
    const user = project.users[userId];

    if (user.action.type === project.action.type.SELECT) {
        let element = elements.list[user.action.elements[0]];

        if (element.type === elements.type.OBJECT || element.type === element.type.PROCESS) {
            const keyBuffer = device.properties.keyBuffer;

            while (keyBuffer.length > 0) {
                if (keyBuffer[0] === "DELETE") {
                    element.text = element.text.slice(0, element.text.length - 1);
                } else if (keyBuffer[0] === "TAB") {
                    element.text += "   ";
                } else if (keyBuffer[0] === "SPACE") {
                    element.text += " ";
                } else {
                    element.text += keyBuffer[0];
                }

                keyBuffer.shift();
            }

            element.width = element.text.length * 17 + 10;

            //elements.output(io, user.action.elements[0]);

            packet.set(packet.KEYS.ELEMENT, {text: element.text, width: element.width}, user.action.elements[0]);
        }
    } else {
        device.properties.keyBuffer = [];
    }
}