const ws = require('ws');

const { createLogger, format, transports } = require("winston");
const { consoleFormat } = require("winston-console-format");

const devices = require("./modules/devices.module");
const elements = require("./modules/elements.module");

const project = require("./modules/project.module");
const view = require("./modules/view.module");

const logger = createLogger({
    level: "silly",
    format: format.combine(
        format.timestamp(),
        format.ms(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: "Test" },
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                format.padLevels(),
                consoleFormat({
                    showMeta: true,
                    metaStrip: ["timestamp", "service"],
                    inspectOptions: {
                        depth: Infinity,
                        colors: true,
                        maxArrayLength: Infinity,
                        breakLength: 120,
                        compact: Infinity
                    }
                })
            )
        })
    ]
});

devices.setWindowSize({width: 1500, height: 1500});
project.setLogger(logger);
view.setLogger(logger);

const coreSocketServer = new ws.Server({port: 3000}/*, {pingInterval: 15000, pingTimeout: 10000}*/);
const devicesSocketServer = new ws.Server({port: 5000});

devicesSocketServer.on("connection", client => {
    logger.info("Device connection");

    client.onmessage = data => {
        try {
            if (data.type === "mouse") {
                devices.mouseUpdate(data.path, data.data);
            }
            else if (data.type === "keyboard") {
                devices.keyboardUpdate(data.path, data.data);
            }
            else if (data.type === "delete") {
                devices.deleteDevice(data.path);
            }
        } catch (e) {
            logger.error(e);
        }
    };
});

devices.monitor(function (devicePath) {
    //logger.debug("device data: " + devicePath);

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
            project.users[mouseUserId].lastUpdate = new Date();

            packet.clear(mouseUserId);
            packet.set(packet.KEYS.MOUSE, devices.list[devicePath].properties);

            executeMouseAction(devicePath, mouseUserId);

            packet.send();
        } else if (keyboardUserId) {
            project.users[keyboardUserId].lastUpdate = new Date();

            packet.clear(keyboardUserId);

            executeKeyboardAction(devicePath, keyboardUserId);

            packet.send();
        }
    }
}, function (path) {
    delete project.mouseAssociations[path];
    delete project.keyboardAssociations[path];

    sendGeneral();
}, logger);

//autosave
function autosave() {
    project.executeAutosave(elements);

    const currentDate = new Date(new Date().getTime() - 300000);

    for (let user in project.users) {
        if (project.users[user].lastUpdate < currentDate) {
            project.users[user].lastUpdate = new Date();

            logger.info("User " + user + " was not active in the last 5 minutes, sending disconnect event.");

            packet.clear();
            packet.set(packet.KEYS.DISCONNECT, {userId: user});
            packet.send();
        }
    }

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
        DISCONNECT: "di",
        ANALYSIS: "an",
        VIEW: "v",
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
    send: function (client) {
        project.logs.push([new Date(), JSON.stringify(packet.data)]);

        if (client) {
            client.send(JSON.stringify(packet.data));
        }
        else {
            coreSocketServer.clients.forEach(client => client.send(JSON.stringify(packet.data)));
        }

    },
    data: {}
};

function sendAtConnection(client) {
    packet.clear();

    packet.set(packet.KEYS.GENERAL, project.getGeneral());

    packet.send(client);

    if (project.mode === project.MODES.EDITION) {
        packet.clear();

        packet.set(packet.KEYS.WINDOW, project.frame);
        packet.set(packet.KEYS.TOOLBAR, project.toolbar);
    }

    packet.send(client);

    const elementKeys = Object.keys(elements.list);

    if (elementKeys.length > 0) {
        for (let i = 0; i < elementKeys.length; i++) {
            (function (i) {
                setTimeout(function () {
                    packet.clear();

                    packet.set(packet.KEYS.ELEMENT, elements.list[elementKeys[i]], elementKeys[i]);

                    packet.send(client);
                }, 35 * i);
            })(i);
        }
    }
}

function sendGeneral(client) {
    packet.clear();

    packet.set(packet.KEYS.GENERAL, project.getGeneral());

    packet.send(client);
}

coreSocketServer.on("connection", client => {
    logger.info("Client connection");

    client.onmessage = data => {
        try {
            data = JSON.parse(data.data);

            console.log("data", data);

            switch (data.type) {
                case "first.contact":
                    logger.info("Client first.contact");

                    sendAtConnection(client);
                    break;
                case "send.general":
                    sendGeneral(client);
                    break;
                case "set.mode":
                    setMode(data);
                    break;
                case "mouse":
                    mouse(data);
                    break;
                case "keyboard":
                    keyboard(data);
                    break;
                case "list.project":
                    listProject();
                    break;
                case "new.project":
                    newProject(data);
                    break;
                case "load.project":
                    loadProject(data);
                    break;
                case "save.project":
                    saveProject(data);
                    break;
                case "autosave.project":
                    autosaveProject(data);
                    break;
                case "delete.project":
                    deleteProject(data);
                    break;
                case "controls.local":
                    controlsLocal(data);
                    break;
                case "controls.autoSetup":
                    controlsAutoSetup(data);
                    break;
                case "add.user":
                    addUser(data);
                    break;
                case "set.user":
                    setUser(data);
                    break;
                case "set.edition.user":
                    setEditionUser(data);
                    break;
                case "delete.user":
                    deleteUser(data);
                    break;
                case "refresh.device":
                    refreshDevice();
                    break;
                case "disconnect":
                    disconnect(data);
                    break;
                case "view.info":
                    viewInfo();
                    break;
                case "view.select.file":
                    viewSelectFile(data);
                    break;
                case "view.start.analysis":
                    viewStartAnalysis();
                    break;
                case "view.stop.analysis":
                    viewStopAnalysis();
                    break;
                case "view.get.analysis":
                    viewGetAnalysis();
                    break;
                case "view.start":
                    viewStart(data);
                    break;
                case "view.stop":
                    viewStop();
                    break;
                case "view.reset":
                    viewReset();
                    break;
            }
        }
        catch (e) {
            logger.error("Unable to parse data: " + data);
        }
    };

    const setMode = (data) => {
        logger.info("Client set.mode: ", data);

        if (data.mode === project.MODES.SETTING) {
            project.mode = project.MODES.SETTING;
        } else {
            project.mode = project.MODES.EDITION;

            devices.reset();
        }

        sendGeneral();
    };

    //controls
    const mouse = device => {
        //logger.debug("mouse", device);

        try {
            devices.mouseUpdate(device.path, device.data);
        } catch (e) {
            logger.error(e);
        }
    };

    const keyboard = device => {
        //logger.debug("keyboard", device);

        try {
            devices.keyboardUpdate(device.path, device.data);
        } catch (e) {
            logger.error(e);
        }
    };

    //settings
    const listProject = async () => {
        logger.info("Client list.project");

        packet.clear();

        try {
            const projects = await project.listProjects();

            packet.set(packet.KEYS.PROJECT, projects);
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send(client);
    };

    const newProject = async data => {
        logger.info("Client new.project: ", data);

        packet.clear();

        try {
            await project.newProject(data.name, elements);

            devices.setWindowSize({width: 1500, height: 1500});

            packet.set(packet.KEYS.SUCCESS, "New project created!");
            packet.set(packet.KEYS.GENERAL, project.getGeneral());
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send(client);
    };

    const loadProject = async data => {
        logger.info("Client load.project: " + data);

        packet.clear();

        try {
            await project.loadProject(data.name, elements);

            devices.setWindowSize(project.frame);

            packet.set(packet.KEYS.SUCCESS, "Project loaded!");
            packet.set(packet.KEYS.GENERAL, project.getGeneral());
        } catch (e) {
            console.error(e);

            packet.set(packet.KEYS.ERROR, e);
        }

        packet.send(client);
    };

    const saveProject = async data => {
        logger.info("Client save.project: ", data);

        packet.clear();

        try {
            await project.saveProject(data.name, elements);

            packet.set(packet.KEYS.SUCCESS, "Project saved!");

            const projects = await project.listProjects();

            packet.set(packet.KEYS.PROJECT, projects);
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const autosaveProject = data => {
        logger.info("Client autosave.project: ", data);

        project.autosave = !!data.autosave;

        sendGeneral();
    };

    const deleteProject = async data => {
        logger.info("Client delete.project: ", data);

        packet.clear();

        try {
            await project.deleteProject(data.name);

            packet.set(packet.KEYS.SUCCESS, "Project deleted!");

            const projects = await project.listProjects();

            packet.set(packet.KEYS.PROJECT, projects);
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const controlsLocal = data => {
        logger.info("Client controls.local: ", data);

        project.controls.local = !!data["controls.local"];

        sendGeneral();
    };

    const controlsAutoSetup = data => {
        logger.info("Client controls.autoSetup: ", data);

        project.controls.autoSetup = !!data["controls.autoSetup"];

        sendGeneral();
    };

    const addUser = data => {
        logger.info("Client add.user: ", data);

        project.addUser(data.id);

        sendGeneral();
    };

    const setUser = data => {
        logger.info("Client set.user: ", data);

        project.setUser(data);

        //sendGeneral();
    };

    const setEditionUser = data => {
        logger.info("Client set.edition.user: ", data);

        project.editionUser = data.id;
    };

    const deleteUser = data => {
        logger.info("Client delete.user: ", data);

        project.deleteUser(data.id);

        sendGeneral();
    };

    const refreshDevice = () => {
        logger.info("Client refresh.device");

        devicesSocketServer.clients.forEach(client => client.send("refresh"));
    };

    const disconnect = data => {
        packet.clear();
        packet.set(packet.KEYS.DISCONNECT, {userId: data.userId});
    }

    const viewInfo = () => {
        packet.clear();
        packet.set(packet.KEYS.VIEW, view.getInfo());
        packet.send(client);
    };

    const viewSelectFile = async data => {
        packet.clear();

        try {
            await view.selectFile(data.fileName);

            packet.set(packet.KEYS.SUCCESS, "Project selected!");
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    }

    const viewStartAnalysis = () => {
        packet.clear();

        try {
            view.startAnalysis(function (error, progress) {
                packet.clear();

                if (error) {
                    packet.set(packet.KEYS.ERROR, error);
                }
                else {
                    packet.set(packet.KEYS.ANALYSIS, {progress: progress});
                }

                packet.send();
            });

            packet.set(packet.KEYS.SUCCESS, "Analysis started!");
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const viewStopAnalysis = () => {
        packet.clear();

        try {
            view.stopAnalysis();

            packet.set(packet.KEYS.SUCCESS, "Analysis stopped!");
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const viewGetAnalysis = async () => {
        packet.clear();

        try {
            packet.set(packet.KEYS.ANALYSIS, await view.getAnalysis());
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const viewStart = data => {
        packet.clear();

        try {
            view.start(data.goToLine, data.speed, function (error, data) {
                packet.clear();

                if (error) {
                    packet.set(packet.KEYS.ERROR, error);
                }
                else {
                    packet.set(packet.KEYS.VIEW, data);
                }

                packet.send(client);
            });

            packet.set(packet.KEYS.SUCCESS, "View started!");
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const viewStop = () => {
        packet.clear();

        try {
            view.stop();

            packet.set(packet.KEYS.SUCCESS, "View stopped!");
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    const viewReset = () => {
        packet.clear();

        try {
            view.reset();

            packet.set(packet.KEYS.SUCCESS, "View reset!");
        } catch (e) {
            logger.error(e);

            packet.set(packet.KEYS.ERROR, e.message);
        }

        packet.send(client);
    };

    client.onclose = () => {
        logger.info("Client disconnection");
    };
});

function removeSelectActionOnUser(userId) {
    if (project.users[userId]
        && project.users[userId].action.type === project.action.type.SELECT
        && project.users[userId].action.elements.length > 0) {
        const elementId = project.users[userId].action.elements[0];

        project.users[userId].action.type = project.action.type.NONE;

        project.users[userId].action.elements = [];

        return elementId;
    }

    return null;
}

function finishSelectAction(userId, elementId) {
    if (elementId) {
        removeSelectActionOnUser(elements.list[elementId].selected);
    }

    const userElementId = removeSelectActionOnUser(userId);

    if (userElementId) {
        elementId = userElementId;
    }

    if (elementId !== undefined && elements.list[elementId]) {
        elements.list[elementId].selected = null;

        packet.set(packet.KEYS.ELEMENT, {selected: null}, elementId);
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
        logger.verbose("larger from right");

        project.frame.width += 100;

        updateWindow = true;
    }

    if (project.frame.height - device.properties.top < 20) {
        logger.verbose("larger from bottom");

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
        if (device.properties.click.left) {
            finishSelectAction(userId);

            if (user.action.status === project.action.status.OUT) {
                if (buttonToolbar === "LINK_BUTTON") {
                    if (Object.keys(elements.list).length > 1) {
                        logger.verbose("new link");

                        user.action.type = project.action.type.NEW_LINK;
                        user.action.status = project.action.status.IN;
                        user.action.elements = [];

                        packet.set(packet.KEYS.ACTION, project.users[userId].action);
                    }
                } else if (buttonToolbar === "PROCESS_BUTTON") {
                    logger.verbose("new process");

                    user.action.type = project.action.type.NEW_PROCESS;
                    user.action.status = project.action.status.IN;
                    user.action.elements = [];

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                } else if (buttonToolbar === "OBJECT_BUTTON") {
                    logger.verbose("new objects");

                    user.action.type = project.action.type.NEW_OBJECT;
                    user.action.status = project.action.status.IN;
                    user.action.elements = [];

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                } else if (buttonToolbar === "NODE_BUTTON") {
                    logger.verbose("new node");

                    user.action.type = project.action.type.NEW_NODE_LINK;
                    user.action.status = project.action.status.IN;

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                }
            }
            else {
                if (buttonToolbar === "CANCEL_BUTTON") {
                    logger.verbose("cancel");

                    user.action.type = project.action.type.NONE;
                    user.action.status = project.action.status.OUT;

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                }
            }
        }
    } else {
        const collisionElement = elements.collisions(device.properties);

        if (device.properties.click.left) {
            if (user.action.type === project.action.type.MOVE && user.action.status === project.action.status.IN) {
                elements.list[user.action.elements[0]].selected = userId;

                const elementsOutput = elements.move(user.action.elements[0],
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

                //logger.debug("angle", angle);

                if (angle > 88 && angle < 92) {
                    //logger.debug("perpendicular angle");

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

                                const elementsOutput = elements.add(elements.type.ARROW_AGGREGATION, user.action.elements);

                                packet.set(packet.KEYS.ELEMENT, elementsOutput);

                                user.action.status = project.action.status.OUT;
                            }
                        } else {
                            user.action.elements.push(collisionElement.id);
                        }
                    } else if (user.action.type === project.action.type.NEW_NODE_LINK
                        && user.action.status === project.action.status.IN) {
                        logger.verbose("new node event");

                        if (elements.list[collisionElement.id].type.indexOf("arrow") >= 0) {
                            if (!collisionElement.node) {
                                logger.verbose("new node application");

                                finishSelectAction(userId, collisionElement.id);

                                elements.list[collisionElement.id].positions.splice(collisionElement.after + 1,
                                    0, collisionElement.position.x);
                                elements.list[collisionElement.id].positions.splice(collisionElement.after + 2,
                                    0, collisionElement.position.y);

                                user.action.type = project.action.type.SELECT_NODE_LINK;
                                user.action.status = project.action.status.IN;

                                user.action.elements[0] = collisionElement.id;

                                packet.set(packet.KEYS.ACTION, project.users[userId].action);

                                packet.set(packet.KEYS.ELEMENT,
                                    {positions: elements.list[collisionElement.id].positions}, collisionElement.id);
                            }
                        }
                    } else if (user.action.status === project.action.status.OUT) {
                        if (elements.list[collisionElement.id].type.indexOf("arrow") >= 0) {
                            if (collisionElement.node) {
                                finishSelectAction(userId, collisionElement.id);

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
                                finishSelectAction(userId, collisionElement.id);

                                user.action.type = project.action.type.SELECT_NODE_LINK;
                                user.action.status = project.action.status.IN;

                                user.action.elements[0] = collisionElement.id;

                                packet.set(packet.KEYS.ACTION, project.users[userId].action);
                            }
                        } else {
                            finishSelectAction(userId, collisionElement.id);

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
                        const elementsOutput = elements.add(elements.type.OBJECT, device.properties.left, device.properties.top);

                        packet.set(packet.KEYS.ELEMENT, elementsOutput);

                        user.action.status = project.action.status.OUT;
                    } else if (user.action.type === project.action.type.NEW_PROCESS
                        && user.action.status === project.action.status.IN) {
                        const elementsOutput = elements.add(elements.type.PROCESS, device.properties.left, device.properties.top);

                        packet.set(packet.KEYS.ELEMENT, elementsOutput);

                        user.action.status = project.action.status.OUT;
                    } else if (user.action.type === project.action.type.SELECT) {
                        logger.verbose("end select");

                        finishSelectAction(userId);
                    }
                }
            }
        } else if (device.properties.click.right) {
            if (collisionElement !== null) {
                if (collisionElement.node) {
                    logger.verbose("delete node");

                    user.action.type = project.action.type.DELETE_NODE_LINK;
                    user.action.status = project.action.status.IN;

                    user.action.elements[0] = collisionElement.id;

                    elements.list[collisionElement.id].positions.splice(collisionElement.node * 2, 2);

                    const positions = elements.updateArrow(collisionElement.id);

                    packet.set(packet.KEYS.ACTION, project.users[userId].action);
                    packet.set(packet.KEYS.ELEMENT, {positions: positions}, collisionElement.id);
                } else if (user.action.status === project.action.status.OUT) {
                    user.action.type = project.action.type.DELETE_ELEMENT;

                    const element = elements.list[collisionElement.id];

                    if (element.type.indexOf("arrow") >= 0) {
                        logger.verbose("arrow element");

                        let arrowsBeginElement = elements.list[elements.list[collisionElement.id].beginElement].beginArrows;
                        arrowsBeginElement.splice(arrowsBeginElement.indexOf(collisionElement.id), 1);

                        let arrowsEndElement =
                            elements.list[elements.list[collisionElement.id].endElement].endArrows;
                        arrowsEndElement.splice(arrowsEndElement.indexOf(collisionElement.id), 1);
                    } else {
                        logger.verbose("object or process element");

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
                || user.action.type === project.action.type.SELECT_NODE_LINK
                || user.action.type === project.action.type.MOVE_NODE_LINK
                || user.action.type === project.action.type.DELETE_NODE_LINK)
                && user.action.status === project.action.status.IN) {
                logger.verbose("end move / new node link");

                user.action.type = project.action.type.SELECT;
                user.action.status = project.action.status.OUT;

                elements.list[user.action.elements[0]].selected = userId;

                packet.set(packet.KEYS.ACTION, project.users[userId].action);
                packet.set(packet.KEYS.ELEMENT, {selected: userId}, user.action.elements[0]);

                const element = elements.list[user.action.elements[0]];

                let updateWindow = false;

                if (element.x < 20) {
                    logger.verbose("larger from left");
                }

                if (project.frame.width - (element.x + element.width) < 20) {
                    logger.verbose("larger from right");

                    project.frame.width += 100;

                    updateWindow = true;
                }

                if (element.y < 20) {
                    logger.verbose("larger from top");
                }

                if (project.frame.height - (element.y + element.height) < 20) {
                    logger.verbose("larger from bottom");

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

        if (element.type === elements.type.OBJECT || element.type === elements.type.PROCESS) {
            const keyBuffer = device.properties.keyBuffer;

            while (keyBuffer.length > 0) {
                if (keyBuffer[0] === "DELETE") {
                    if (element.text.length > 0) {
                        const lastElement = element.text[element.text.length - 1];

                        if (lastElement === "\n") {
                            element.height -= elements.lineHeight;
                        }

                        element.text = element.text.slice(0, element.text.length - 1);
                    }
                } else if (keyBuffer[0] === "ENTER") {
                    element.height += elements.lineHeight;
                    element.text += "\n";
                } else if (keyBuffer[0] === "TAB") {
                    element.text += "   ";
                } else if (keyBuffer[0] === "SPACE") {
                    element.text += " ";
                } else {
                    element.text += keyBuffer[0];
                }

                keyBuffer.shift();
            }

            let width = 0;
            let tmpWidth = 0;

            if (element.text) {
                const textEnterSplit = element.text.split("\n");

                for (let i = 0; i < textEnterSplit.length; i++) {
                    tmpWidth = 0;

                    for (let j = 0; j < textEnterSplit[i].length; j++) {
                        tmpWidth += elements.keyWidthMap[textEnterSplit[i][j]];
                    }

                    if (tmpWidth > width) {
                        width = tmpWidth;
                    }
                }

                element.width = width + elements.elementPadding;
            }
            else {
                element.width = elements.elementPadding;
            }

            const elementsToUpdate = elements.attachedArrows(user.action.elements[0]);

            elementsToUpdate[user.action.elements[0]] = {
                text: element.text,
                width: element.width,
                height: element.height
            };

            packet.set(packet.KEYS.ELEMENT, elementsToUpdate);
        } else if (element.type.indexOf("arrow") >= 0) {
            if (device.properties.keyBuffer.indexOf("LEFT") >= 0
                || device.properties.keyBuffer.indexOf("RIGHT") >= 0) {
                logger.debug("it's an arrow!");

                //if (elements.list[element.beginElement].type === elements.type.OBJECT
                    //&& elements.list[element.endElement].type === elements.type.OBJECT) {
                    if (element.type === elements.type.ARROW_CHARACTERIZATION) {
                        element.type = elements.type.ARROW_CHARACTERIZATION_INVERT;
                    }
                    else if (element.type === elements.type.ARROW_CHARACTERIZATION_INVERT) {
                        element.type = elements.type.ARROW_GENERALIZATION;
                    }
                    else if (element.type === elements.type.ARROW_GENERALIZATION) {
                        element.type = elements.type.ARROW_GENERALIZATION_INVERT;
                    }
                    else if (element.type === elements.type.ARROW_GENERALIZATION_INVERT) {
                        element.type = elements.type.ARROW_AGGREGATION;
                    }
                    else if (element.type === elements.type.ARROW_AGGREGATION) {
                        element.type = elements.type.ARROW_AGGREGATION_INVERT;
                    }
                    else if (element.type === elements.type.ARROW_AGGREGATION_INVERT) {
                        element.type = elements.type.ARROW_RELATIONSHIP;
                    }
                    else if (element.type === elements.type.ARROW_RELATIONSHIP) {
                        element.type = elements.type.ARROW_INSTRUMENT;
                    }
                    else if (element.type === elements.type.ARROW_INSTRUMENT) {
                        element.type = elements.type.ARROW_INSTRUMENT_INVERT;
                    }
                    else if (element.type === elements.type.ARROW_INSTRUMENT_INVERT) {
                        element.type = elements.type.ARROW_EFFECT;
                    }
                    else if (element.type === elements.type.ARROW_EFFECT) {
                        element.type = elements.type.ARROW_EFFECT_INVERT;
                    }
                    else if (element.type === elements.type.ARROW_EFFECT_INVERT) {
                        element.type = elements.type.ARROW_CONSUMPTION;
                    }
                    else if (element.type === elements.type.ARROW_CONSUMPTION) {
                        element.type = elements.type.ARROW_AGENT;
                    }
                    else if (element.type === elements.type.ARROW_AGENT) {
                        element.type = elements.type.ARROW_AGENT_INVERT;
                    }
                    else {
                        element.type = elements.type.ARROW_CHARACTERIZATION;
                    }

                    logger.debug("element type:" + element.type);
                //}

                packet.set(packet.KEYS.ELEMENT, {type: element.type}, user.action.elements[0]);
            }
        }
    }

    device.properties.keyBuffer = [];
}