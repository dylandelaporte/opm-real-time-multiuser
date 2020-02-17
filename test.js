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
            } else {
                project.deleteMouseUser(project.editionUser);

                project.mouseAssociations[devicePath] = project.editionUser;
            }

            project.editionUser = null;

            packet.set(packet.KEYS.GENERAL, project.getGeneral());
        }

        packet.set(packet.KEYS.DEVICE, devicePath);

        packet.send();
    } else {
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

//autosave
function autosave() {
    project.executeAutosave(elements);

    setTimeout(autosave, 30000);
}

autosave();

//packet
let packet = {
    KEYS: {
        GENERAL: "g",
        MOUSE: "m",
        ELEMENT: "e",
        ACTION: "a",
        DEVICE: "d",
        WINDOW: "w",
        TOOLBAR: "t",
        PROJECT: "p",
        SUCCESS: "s",
        ERROR: "er"
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
        packet.set(packet.KEYS.WINDOW, project.frame);
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

io.on("connection", client => {
    console.log("connection");

    client.on("first.contact", () => {
        sendAtConnection();
    });

    client.on("send.general", () => {
        sendGeneral();
    });

    client.on("set.mode", (data) => {
        console.log(data);
        if (data.mode === project.MODES.SETTING) {
            project.mode = project.MODES.SETTING;
        } else {
            project.mode = project.MODES.EDITION;
        }

        sendGeneral();
    });

    //settings

    /*
    client.on("get.availabledevices", () => {
        devices.getAvailableDevices(io, project.mouseAssociations, project.keyboardAssociations);
    });
     */

    client.on("list.project", async () => {
        packet.clear();

        try {
            const projects = await project.listProjects();

            packet.set(packet.KEYS.PROJECT, projects);
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send();
    });

    client.on("new.project", async data => {
        packet.clear();

        try {
            await project.newProject(data.name, elements);

            packet.set(packet.KEYS.SUCCESS, "New project created!");
            packet.set(packet.KEYS.GENERAL, project.getGeneral());
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send();
    });

    client.on("load.project", async data => {
        packet.clear();

        try {
            await project.loadProject(data.name, elements);

            packet.set(packet.KEYS.SUCCESS, "Project loaded!");
            packet.set(packet.KEYS.GENERAL, project.getGeneral());
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send();
    });

    client.on("save.project", async data => {
        packet.clear();

        try {
            await project.saveProject(data.name, elements);

            packet.set(packet.KEYS.SUCCESS, "Project saved!");

            const projects = await project.listProjects();

            packet.set(packet.KEYS.PROJECT, projects);
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send();
    });

    client.on("autosave.project", data => {
        project.autosave = !!data.autosave;

        sendGeneral();
    });

    client.on("add.user", data => {
        project.addUser(data.id);

        sendGeneral();
    });

    client.on("set.user", data => {
        console.log("set.user", data);

        project.setUser(data);

        //sendGeneral();
    });

    client.on("set.edition.user", data => {
        console.log("set.edition.user", data);

        project.editionUser = data.id;
    });

    client.on("delete.user", data => {
        project.deleteUser(data.id);

        sendGeneral();
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

    //scroll
    if (device.properties.wheel > 0) {
        if (device.properties.click.wheel) {
            const endHeight = project.frame.height - 700;

            if (device.properties.wheel > 1) {
                project.frame.scrollHeight -= 25;

                if (project.frame.scrollHeight < -endHeight) {
                    project.frame.scrollHeight = -endHeight;
                }
            } else {
                project.frame.scrollHeight += 25;

                if (project.frame.scrollHeight > 0) {
                    project.frame.scrollHeight = 0;
                }
            }
        } else {
            const endWidth = project.frame.width - 700;

            if (device.properties.wheel > 1) {
                project.frame.scrollWidth -= 25;

                if (project.frame.scrollWidth < -endWidth) {
                    project.frame.scrollWidth = -endWidth;
                }
            } else {
                project.frame.scrollWidth += 25;

                if (project.frame.scrollWidth > 0) {
                    project.frame.scrollWidth = 0;
                }
            }
        }

        packet.set(packet.KEYS.WINDOW, project.frame);
    }

    //window
    let updateWindow = false;

    if (project.frame.width - device.properties.left < 20) {
        console.log("larger from right");

        project.frame.width += 100;

        updateWindow = true;
    }

    if (project.frame.height - device.properties.top < 20) {
        console.log("larger from bottom");

        project.frame.height += 100;

        updateWindow = true;
    }

    if (updateWindow) {
        devices.setWindowSize(project.frame);

        packet.set(packet.KEYS.WINDOW, project.frame);
    }

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
                } else {
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
        } else if (device.properties.click.right) {
            if (collisionElement !== null) {
                if (collisionElement.node) {
                    console.log("delete node");

                    user.action.type = project.action.type.DELETE_NODE_LINK;

                    user.action.status = project.action.status.IN;

                    elements.list[collisionElement.id].positions.splice(collisionElement.node * 2, 2);

                    const positions = elements.updateArrow(collisionElement.id);

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                    packet.set(packet.KEYS.ELEMENT, {positions: positions}, collisionElement.id);
                } else if (user.action.status === project.action.status.OUT) {
                    console.log("delete element");

                    console.log("collisionElement", collisionElement);

                    user.action.type = project.action.type.DELETE_ELEMENT;

                    const element = elements.list[collisionElement.id];

                    if (element.type.indexOf("arrow") >= 0) {
                        console.log("arrow element");

                        let arrowsBeginElement = elements.list[elements.list[collisionElement.id].beginElement].beginArrows;
                        arrowsBeginElement.splice(arrowsBeginElement.indexOf(collisionElement.id), 1);

                        let arrowsEndElement =
                            elements.list[elements.list[collisionElement.id].endElement].endArrows;
                        arrowsEndElement.splice(arrowsEndElement.indexOf(collisionElement.id), 1);
                    } else {
                        console.log("object or process element");

                        for (let i = 0; i < element.beginArrows.length; i++) {
                            const arrowId = element.beginArrows[i];

                            let oppositeArrowsElement = elements.list[elements.list[arrowId].endElement].endArrows;
                            oppositeArrowsElement.splice(oppositeArrowsElement.indexOf(arrowId), 1);

                            delete elements.list[arrowId];

                            packet.set(packet.KEYS.ELEMENT, {deleted: true}, arrowId);
                        }

                        for (let i = 0; i < element.endArrows.length; i++) {
                            const arrowId = element.endArrows[i];

                            let oppositeArrowsElement = elements.list[elements.list[arrowId].beginElement].beginArrows;
                            oppositeArrowsElement.splice(oppositeArrowsElement.indexOf(arrowId), 1);

                            delete elements.list[arrowId];

                            packet.set(packet.KEYS.ELEMENT, {deleted: true}, arrowId);
                        }
                    }

                    delete elements.list[collisionElement.id];

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                    packet.set(packet.KEYS.ELEMENT, {deleted: true}, collisionElement.id);
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

                const element = elements.list[user.action.elements[0]];

                let updateWindow = false;

                if (element.x < 20) {
                    console.log("larger from left");
                }

                if (project.frame.width - (element.x + element.width) < 20) {
                    console.log("larger from right");

                    project.frame.width += 100;

                    updateWindow = true;
                }

                if (element.y < 20) {
                    console.log("larger from top");
                }

                if (project.frame.height - (element.y + element.height) < 20) {
                    console.log("larger from bottom");

                    project.frame.height += 100;

                    updateWindow = true;
                }

                if (updateWindow) {
                    devices.setWindowSize(project.frame);

                    packet.set(packet.KEYS.WINDOW, project.frame);
                }
            }
        }

        if (collisionElement !== null) {
            if (user.action.hover === null) {
                elements.list[collisionElement.id].hover = userId;
                user.action.hover = collisionElement.id;

                packet.set(packet.KEYS.ACTION, project.users[userId].action);
                packet.set(packet.KEYS.ELEMENT, {hover: userId}, user.action.hover);
            } else if (user.action.hover !== collisionElement.id) {
                elements.list[user.action.hover].hover = null;

                packet.set(packet.KEYS.ELEMENT, {hover: null}, user.action.hover);

                elements.list[collisionElement.id].hover = userId;
                user.action.hover = collisionElement.id;

                packet.set(packet.KEYS.ELEMENT, {hover: userId}, user.action.hover);
            }
        } else {
            if (user.action.hover !== null) {
                if (elements.list[user.action.hover]) {
                    elements.list[user.action.hover].hover = null;

                    packet.set(packet.KEYS.ELEMENT, {hover: null}, user.action.hover);
                }

                user.action.hover = null;
            }
        }
    }
}

function executeKeyboardAction(devicePath, userId) {
    const device = devices.list[devicePath];
    const user = project.users[userId];

    if (user.action.type === project.action.type.SELECT) {
        let element = elements.list[user.action.elements[0]];

        if (element.type === elements.type.OBJECT || element.type === element.type.PROCESS) {
            const keyBuffer = device.properties.keyBuffer;
            const keyWidthMap = {
                q: 9,
                w: 13,
                e: 8,
                r: 6,
                t: 5,
                y: 9,
                u: 9,
                i: 5,
                o: 9,
                p: 9,
                a: 8,
                s: 7,
                d: 9,
                f: 6,
                g: 9,
                h: 9,
                j: 5,
                k: 9,
                l: 5,
                z: 8,
                x: 9,
                c: 8,
                v: 9,
                b: 9,
                n: 9,
                m: 14,
                Q: 13,
                W: 17,
                E: 11,
                R: 12,
                T: 11,
                Y: 13,
                U: 13,
                I: 6,
                O: 13,
                P: 10,
                A: 13,
                S: 10,
                D: 13,
                F: 10,
                G: 13,
                H: 13,
                J: 7,
                K: 13,
                L: 11,
                Z: 11,
                X: 13,
                C: 12,
                V: 13,
                B: 12,
                N: 13,
                M: 16,
                " ": 5
            };

            while (keyBuffer.length > 0) {
                if (keyBuffer[0] === "DELETE") {
                    if (element.text.length > 0) {
                        element.width -= keyWidthMap[element.text[element.text.length - 1]];
                        element.text = element.text.slice(0, element.text.length - 1);
                    }
                } else if (keyBuffer[0] === "TAB") {
                    element.width += 3 * keyWidthMap[" "];
                    element.text += "   ";
                } else if (keyBuffer[0] === "SPACE") {
                    element.width += keyWidthMap[" "];
                    element.text += " ";
                } else {
                    element.width += keyWidthMap[keyBuffer[0]];
                    element.text += keyBuffer[0];
                }

                keyBuffer.shift();
            }

            packet.set(packet.KEYS.ELEMENT, {text: element.text, width: element.width}, user.action.elements[0]);
        } else if (element.type.indexOf("arrow") >= 0) {
            console.log("arrow");

            if (element.beginElement.type === elements.type.OBJECT
                && element.endElement.type === elements.type.OBJECT) {
                if (element.type === elements.type.ARROW_AGGREGATION) {
                    element.type = elements.type.ARROW_EXHIBITION;
                } else {
                    element.type = elements.type.ARROW_AGGREGATION;
                }
            }

            packet.set(packet.KEYS.ELEMENT, {type: element.type}, user.action.elements[0]);
        }
    }

    device.properties.keyBuffer = [];
}