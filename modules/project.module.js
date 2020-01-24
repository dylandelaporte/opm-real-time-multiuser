const project = {
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
    editionUser: null
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
        keyboardAssociations: project.keyboardAssociations
    };
};

module.exports = project;