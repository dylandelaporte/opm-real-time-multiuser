const fs = require("fs");

const project = {
    frame: {
        width: 1500,
        height: 1500,
        scrollWidth: 0,
        scrollHeight: 0
    },
    mode: 0,
    MODES: {
        EDITION: 0,
        SETTING: 1
    },
    users: {},
    mouseAssociations: {},
    keyboardAssociations: {},
    action: {
        type: {
            NONE: "none",
            HOVER: "hover",
            MOVE: "move",
            SELECT: "select",
            NEW_OBJECT: "new_object",
            NEW_PROCESS: "new_process",
            DELETE_ELEMENT: "delete_element",
            NEW_LINK: "new_link",
            NEW_NODE_LINK: "new_node_link",
            SELECT_NODE_LINK: "select_node_link",
            MOVE_NODE_LINK: "move_node_link",
            DELETE_NODE_LINK: "delete_node_link",
            CANCEL_ACTION: "cancel_action"
        },
        status: {
            IN: "in",
            OUT: "out"
        }
    },
    editionUser: null,
    toolbar: {
        "OBJECT_BUTTON": {x: 5, y: 5, width: 100, height: 25, text: "New object"},
        "PROCESS_BUTTON": {x: 110, y: 5, width: 120, height: 25, text: "New process"},
        "LINK_BUTTON": {x: 235, y: 5, width: 80, height: 25, text: "New link"},
        "NODE_BUTTON": {x: 320, y: 5, width: 95, height: 25, text: "New node"},
        "CANCEL_BUTTON": {x: 420, y: 5, width: 70, height: 25, text: "Cancel"}
    },
    toolbarDimensions: {
        x: 5,
        y: 5,
        width: 490,
        height: 30
    },
    currentName: "",
    controls: {
        local: true,
        autoSetup: true
    },
    autosave: true,
    path: "../projects/",
    logs: [],
    logger: null
};

project.setLogger = function (logger) {
    this.logger = logger;
};

project.setToolbar = function (frame) {
    /*
    const buttons = Object.keys(project.toolbar);

    for (let i = 0; i < buttons.length; i++) {

    }
     */
};

project.isWithinToolbar = function (deviceProperties) {
    const topOffset = deviceProperties.top /*+ project.frame.scrollHeight*/;
    const leftOffset = deviceProperties.left /*+ project.frame.scrollWidth*/;

    if (topOffset >= project.toolbarDimensions.y
        && topOffset <= project.toolbarDimensions.height
        && leftOffset >= project.toolbarDimensions.x
        && leftOffset <= project.toolbarDimensions.width) {
        const buttons = Object.keys(project.toolbar);

        for (let i = 0; i < buttons.length; i++) {
            if (leftOffset >= project.toolbar[buttons[i]].x
                && leftOffset <= project.toolbar[buttons[i]].x + project.toolbar[buttons[i]].width) {
                return buttons[i];
            }
        }

        return false;
    }

    return false;
};

project.setUser = function (data) {
    if (!project.users[data.id]) {
        project.users[data.id] = {
            action: {
                type: project.action.type.HOVER,
                status: project.action.status.OUT,
                elements: [],
                hover: null
            }
        };
    } else {
        project.deleteMouseUser(data.id);
        project.deleteKeyboardUser(data.id);
    }

    project.mouseAssociations[data.mouse] = data.id;
    project.keyboardAssociations[data.keyboard] = data.id;
};

project.addUser = function (id) {
    if (!project.users[id]) {
        project.users[id] = {
            lastUpdate: new Date(),
            action: {
                type: project.action.type.HOVER,
                status: project.action.status.OUT,
                elements: [],
                hover: null
            }
        };
    }
};

project.deleteUser = function (id) {
    if (project.users[id]) {
        delete project.users[id];

        project.deleteMouseUser(id);
        project.deleteKeyboardUser(id);
    }
};

project.deleteMouseUser = function (id) {
    project.deleteKeyFromValue(project.mouseAssociations, id);
};

project.deleteKeyboardUser = function (id) {
    project.deleteKeyFromValue(project.keyboardAssociations, id);
};

project.deleteKeyFromValue = function (object, id) {
    const keys = Object.keys(object);

    let key = "";

    for (let i = 0; i < keys.length; i++) {
        if (object[keys[i]] === id) {
            key = keys[i];

            break;
        }
    }

    if (key !== "") {
        delete object[key];
    }
};

project.getGeneral = function () {
    let users = {};

    const userIds = Object.keys(project.users);

    for (let i = 0; i < userIds.length; i++) {
        users[userIds[i]] = {mouse: "", keyboard: ""};
    }

    const mouses = Object.keys(project.mouseAssociations);

    for (let i = 0; i < mouses.length; i++) {
        users[project.mouseAssociations[mouses[i]]].mouse = mouses[i];
    }

    const keyboards = Object.keys(project.keyboardAssociations);

    for (let i = 0; i < keyboards.length; i++) {
        users[project.keyboardAssociations[keyboards[i]]].keyboard = keyboards[i];
    }

    return {
        mode: project.mode,
        users: users,
        mouseAssociations: project.mouseAssociations,
        keyboardAssociations: project.keyboardAssociations,
        currentName: project.currentName,
        autosave: project.autosave,
        controls: {
            local: project.controls.local,
            autoSetup: project.controls.autoSetup
        }
    };
};

project.listProjects = async function () {
    try {
        const files = fs.readdirSync(__dirname + "/" + project.path);

        let projects = [];

        files.forEach(function (file) {
            const fileSplit = file.split(".");

            if (file.indexOf("log") < 0
                && fileSplit.length > 1
                && fileSplit[fileSplit.length - 1] === "json") {
                projects.push(fileSplit[0]);
            }
        });

        return projects;
    } catch (e) {
        throw "Unable to list projects: " + e;
    }
};

project.validName = function (name) {
    const regex = new RegExp(/^[a-zA-Z0-9]+$/g);

    return name !== undefined && regex.test(name);
};

project.newProject = async function (name, elements) {
    if (!project.validName(name)) {
        throw new Error("The project name is not valid, please update it.");
    }

    project.frame.width = 1500;
    project.frame.height = 1500;
    project.frame.scrollWidth = 0;
    project.frame.scrollHeight = 0;

    project.users = {};
    project.mouseAssociations = {};
    project.keyboardAssociations = {};

    project.currentName = name;
    project.autosave = true;

    elements.list = {};
    elements.nextId = 0;
};

project.loadProject = async function (name, elements) {
    project.logger.verbose("LoadProject");

    if (!project.validName(name)) {
        throw "The project name is not valid, please update it.";
    }

    const projectFilePath = __dirname + "/" + project.path + name + ".json";

    try {
        if (fs.existsSync(projectFilePath)) {
            const data = fs.readFileSync(projectFilePath, "utf8");
            const content = JSON.parse(data);

            project.logger.verbose("LoadProject", content);

            if (content.frame
                && content.users
                && content.currentName
                && content.elements) {
                project.frame = content.frame;
                project.users = content.users;

                project.mouseAssociations = {};
                project.keyboardAssociations = {};

                project.currentName = content.currentName;

                project.autosave = !!content.autosave;

                elements.list = content.elements;

                const elementKeys = Object.keys(elements.list);

                let nextId = 0;

                for (let i = 0; i < elementKeys.length; i++) {
                    const elementId = parseInt(elementKeys[i]);

                    if (elementId > nextId) {
                        nextId = elementId;
                    }
                }

                elements.nextId = nextId + 1;

                project.logger.verbose("LoadProject", "nextId: " + elements.nextId);
            }
            else {
                throw "Missing elements in the project.";
            }
        }
        else {
            throw "The project file does not exists in the directory."
        }
    } catch (e) {
        throw "Unable to load the project: " + e;
    }
};

project.saveProject = async function (name, elements) {
    if (!project.validName(name)) {
        throw "The project name is not valid, please update it.";
    }

    project.currentName = name;

    const content = {
        frame: project.frame,
        users: project.users,
        currentName: project.currentName,
        autosave: project.autosave,
        elements: elements.list
    };

    const stringContent = JSON.stringify(content);

    try {
        fs.writeFileSync(__dirname + "/" + project.path + name + ".json", stringContent, "utf8");
    } catch (e) {
        throw "Unable to write file: " + e;
    }
};

project.executeAutosave = async function (elements) {
    project.logger.verbose("Autosave" + ", enabled: " + project.autosave + ", project name: " + project.currentName);

    if (project.autosave && project.validName(project.currentName)) {
        try {
            await project.saveProject(project.currentName, elements);
            await project.saveLog(project.currentName, project.logs);

            project.logger.info("Autosave", "done!");
        } catch (e) {
            project.logger.error("Autosave", e);
        }
    }
};

project.deleteProject = async function (name) {
    if (name === project.currentName) {
        throw new Error("This project is current opened in the editor.");
    }

    const projectFilePath = __dirname + "/" + project.path + name + ".json";
    const logFilePath = __dirname + "/" + project.path + name + "-log.json";

    if (fs.existsSync(projectFilePath)) {
        fs.unlinkSync(projectFilePath);
    }

    if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
    }
};

project.saveLog = async function (name, logs) {
    return new Promise(function (resolve, reject) {
        if (!project.validName(name)) {
            return reject("The project name is not valid, please update it.");
        }

        try {
            while (logs.length > 0) {
                fs.appendFileSync(__dirname + "/" + project.path + name + "-log.json",
                    JSON.stringify(logs[0]) + "\n", "utf8");

                logs.shift();
            }
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = project;