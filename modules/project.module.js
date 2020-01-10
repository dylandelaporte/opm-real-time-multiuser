const project = {
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
            NEW_LINK: "new_link"
        },
        status: {
            IN: "in",
            OUT: "out"
        }
    }
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

project.userOutput = function (io, id) {
    io.emit("user", {id: id, action: project.users[id]});
};

module.exports = project;