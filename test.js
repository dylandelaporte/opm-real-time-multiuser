const io = require('socket.io')();

const devices = require("./modules/devices.module");
const elements = require("./modules/elements.module");

const project = require("./modules/project.module");

devices.setWindowSize({width: 500, height: 500});

devices.monitor(function (devicePath) {
    //console.log("devicePath", devicePath);
    //console.log(devices.list[devicePath].properties);

    if (project.mouseAssociations[devicePath]) {
        executeMouseAction(devicePath, project.mouseAssociations[devicePath]);
    }
});

io.on("connection", client => {
    console.log("connection");

    elements.outputAll(io);

    client.on("get.availabledevices", () => {
        devices.getAvailableDevices(io, project.mouseAssociations, project.keyboardAssociations);
    });

    client.on("new.user", data => {
        project.addUser(data);
    });

    client.on("update.window", data => {
        console.log("window", data);

        devices.setWindowSize(data);

        io.emit("window", data);
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
        const elementId = user.action.elements[0];

        elements.list[elementId].selected = null;

        user.action.elements = [];

        elements.output(io, elementId);
    }
}

function executeMouseAction(devicePath, userId) {
    const device = devices.list[devicePath];
    const user = project.users[userId];

    //console.log(device.properties);
    //console.log(user);

    //tools bar
    const buttonWidth = 70;
    const lowerRange = (devices.frame.width / 2) - ((buttonWidth * 3) / 2);
    const upperRange = (devices.frame.width / 2) + ((buttonWidth * 3) / 2);

    if (device.properties.top < 20 && device.properties.left >= lowerRange && device.properties.left <= upperRange) {
        console.log("tools bar");

        if (device.properties.click.left && user.action.status === project.action.status.OUT) {
            console.log("valid to create action");

            finishSelectAction(user);

            if (device.properties.left > lowerRange + 2 * buttonWidth) {
                console.log("new link");

                user.action.type = project.action.type.NEW_LINK;

                project.userOutput(io, userId);
            }
            else if (device.properties.left > lowerRange + buttonWidth) {
                console.log("new process");

                user.action.type = project.action.type.NEW_PROCESS;

                project.userOutput(io, userId);
            }
            else {
                console.log("new objects");

                user.action.type = project.action.type.NEW_OBJECT;

                project.userOutput(io, userId);
            }

            user.action.status = project.action.status.IN;
            user.action.elements = [];
        }
    }
    else {
        const collisionElement = elements.collisions(device.properties);

        console.log("collisionElement", collisionElement, user.action.type, user.action.status);

        if (device.properties.click.left) {
            if (user.action.type === project.action.type.MOVE && user.action.status === project.action.status.IN) {
                console.log("moving");

                //elements.list[user.action.elements[0]].x = device.properties.left - user.action.gap.x;
                //elements.list[user.action.elements[0]].y = device.properties.top - user.action.gap.y;

                elements.list[user.action.elements[0]].selected = userId;

                elements.move(io, user.action.elements[0],
                    device.properties.left - user.action.gap.x,
                    device.properties.top - user.action.gap.y);

                //elements.output(io, user.action.elements[0]);
            }
            //else if (other actions by click) {}
            else {
                if (collisionElement !== null) {
                    if (user.action.type === project.action.type.NEW_LINK
                        && user.action.status === project.action.status.IN) {
                        if (user.action.elements.length > 0) {
                            if (user.action.elements[0] !== collisionElement.id) {
                                user.action.elements.push(collisionElement.id);

                                elements.add(io, elements.type.ARROW_AGGREGATION, user.action.elements);

                                user.action.status = project.action.status.OUT;
                            }
                        }
                        else {
                            user.action.elements.push(collisionElement.id);
                        }
                    }
                    else if (user.action.status === project.action.status.OUT) {
                        console.log("click");

                        finishSelectAction(user);

                        user.action.type = project.action.type.MOVE;

                        user.action.status = project.action.status.IN;
                        user.action.elements = [collisionElement.id];

                        user.action.gap = {
                            x: device.properties.left - elements.list[collisionElement.id].x,
                            y: device.properties.top - elements.list[collisionElement.id].y
                        };

                        project.userOutput(io, userId);
                    }
                }
                else {
                    if (user.action.type === project.action.type.NEW_OBJECT
                        && user.action.status === project.action.status.IN) {
                        elements.add(io, elements.type.OBJECT, device.properties.left, device.properties.top);

                        user.action.status = project.action.status.OUT;
                    }
                    else if (user.action.type === project.action.type.NEW_PROCESS
                        && user.action.status === project.action.status.IN) {
                        elements.add(io, elements.type.PROCESS, device.properties.left, device.properties.top);

                        user.action.status = project.action.status.OUT;
                    }
                    else if (user.action.type === project.action.type.SELECT) {
                        console.log("end select");

                        finishSelectAction(user);
                    }
                }
            }
        } else {
            if (user.action.type === project.action.type.MOVE && user.action.status === project.action.status.IN) {
                console.log("end move");

                finishSelectAction(user);

                user.action.type = project.action.type.SELECT;
                user.action.status = project.action.status.OUT;

                elements.list[user.action.elements[0]].selected = userId;

                project.userOutput(io, userId);
                elements.output(io, user.action.elements[0]);
            }
        }

        if (collisionElement !== null) {
            //if (user.action.status === project.action.status.OUT) {
                console.log("hover");

                //user.action.type = project.action.type.HOVER;

                if (user.action.hover === null) {
                    console.log("new hover");

                    elements.list[collisionElement.id].hover = userId;
                    user.action.hover = collisionElement.id;

                    project.userOutput(io, userId);
                    elements.output(io, user.action.hover);
                } else if (user.action.hover !== collisionElement.id) {
                    console.log("change hover");

                    elements.list[user.action.hover].hover = null;

                    elements.output(io, user.action.hover);

                    elements.list[collisionElement.id].hover = userId;
                    user.action.hover = collisionElement.id;

                    elements.output(io, user.action.hover);
                }
            //}
        } else {
            if (user.action.hover !== null) {
                console.log("stop hover");

                elements.list[user.action.hover].hover = null;

                elements.output(io, user.action.hover);

                user.action.hover = null;
            }
        }
    }

    devices.mouseOutput(io, userId, devicePath);
}