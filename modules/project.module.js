const fs = require("fs");

const project = {
    frame: {
        width: 500,
        height: 500,
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
            MOVE_NODE_LINK: "move_node_link",
            DELETE_NODE_LINK: "delete_node_link"
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
        "LINK_BUTTON": {x: 235, y: 5, width: 80, height: 25, text: "New link"}
    },
    toolbarDimensions: {
        x: 5,
        y: 5,
        width: 315,
        height: 30
    },
    currentName: "",
    autosave: true,
    path: "../projects/"
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
    }
    else {
        project.deleteMouseUser(data.id);
        project.deleteKeyboardUser(data.id);
    }

    project.mouseAssociations[data.mouse] = data.id;
    project.keyboardAssociations[data.keyboard] = data.id;
};

project.addUser = function (id) {
    if (!project.users[id]) {
        project.users[id] = {
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

    console.log(project.users, project.mouseAssociations, project.keyboardAssociations);
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
        autosave: project.autosave
    };
};

project.listProjects = async function () {
    return new Promise(function (resolve, reject) {
        fs.readdir(__dirname + "/" + project.path, function (err, files) {
            if (err) {
                return reject("Unable to scan directory: " + err);
            }

            let projects = [];

            files.forEach(function (file) {
                const fileSplit = file.split(".");

                if (fileSplit.length > 1 && fileSplit[fileSplit.length - 1] === "json") {
                    projects.push(fileSplit[0]);
                }
            });

            resolve(projects);
        });
    });
};

project.validName = function (name) {
    const regex = new RegExp(/^[a-zA-Z0-9]+$/g);

    return name !== undefined && regex.test(name);
};

project.newProject = async function (name, elements) {
    if (!project.validName(name)) {
        return Promise.reject("The project name is not valid, please update it.");
    }

    project.frame.width = 500;
    project.frame.height = 500;
    project.frame.scrollWidth = 0;
    project.frame.scrollHeight = 0;

    project.users = {};
    project.mouseAssociations = {};
    project.keyboardAssociations = {};

    project.currentName = name;
    project.autosave = true;

    elements.list = {};
};

project.loadProject = async function (name, elements) {
    return new Promise(function (resolve, reject) {
        if (!project.validName(name)) {
            return reject("The project name is not valid, please update it.");
        }

        const projectFilePath = __dirname + "/" + project.path + name + ".json";

        if (fs.existsSync(projectFilePath)) {
            fs.readFile(projectFilePath, "utf8", function (err, data) {
                if (err) {
                    return reject(err);
                }

                try {
                    const content = JSON.parse(data);

                    console.log("content", content);

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

                        resolve();
                    }
                    else {
                        throw new Error();
                    }
                } catch (e) {
                    reject("Unable to read the project file");
                }
            });
        }
        else {
            reject("The project does not exists.");
        }
    });
};

project.saveProject = async function (name, elements) {
    return new Promise(function (resolve, reject) {
        if (!project.validName(name)) {
            return reject("The project name is not valid, please update it.");
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

        fs.writeFile(__dirname + "/" + project.path + name + ".json", stringContent, "utf8", function (err) {
            if (err) {
                return reject("Unable to write file: " + err);
            }

            resolve();
        })
    });
};

project.executeAutosave = async function (elements) {
    console.log("autosave", project.autosave);

    if (project.autosave && project.validName(project.currentName)) {
        try {
            await project.saveProject(project.currentName, elements);
        } catch (e) {
            console.error(e);
        }
    }
};

module.exports = project;