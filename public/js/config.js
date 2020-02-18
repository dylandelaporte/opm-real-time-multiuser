const server_url_cookie = "server_url";

const settings = document.getElementById("settings");
const error = document.getElementById("error");

window.onload = function () {
    const server_url_cookie_value = getCookie(server_url_cookie);

    if (server_url_cookie_value !== "") {
        let clientSocket;

        connected(server_url_cookie_value, function (connected, socket) {
            clientSocket = socket;

            //TMP
            window.socket = socket;
        }, true, function () {
            loadSettings(clientSocket);
        }, function () {
            console.log("disconnected");

            settings.style.display = "none";
            error.style.display = "";
        });
    } else {
        error.style.display = "";
    }
};

function loadSettings(socket) {
    const settingModeButton = document.getElementById("setting-mode-button");
    const settingsContent = document.getElementById("settings-content");

    const projectName = document.getElementById("project-name");

    const saveProjectButton = document.getElementById("save-project-button");
    const newProjectButton = document.getElementById("new-project-button");
    const autosaveButton = document.getElementById("autosave-button");

    let currentMode;
    let currentAutosave;

    socket.on("data", function (data) {
        console.log("data", data);

        if (data.g) {
            currentMode = data.g.mode;

            settingModeButton.innerText = currentMode === 0 ? "Enable setting mode" : "Disable setting mode";
            settingsContent.style.display = currentMode === 0 ? "none" : "";

            loadUserList(data.g, function (id) {
                socket.emit("set.edition.user", {id: id});
            }, function (id) {
                socket.emit("delete.user", {id: id});
            });

            projectName.value = data.g.currentName;

            currentAutosave = data.g.autosave;

            autosaveButton.innerText = currentAutosave ? "Disable autosave" : "Enable autosave";
        }

        if (data.d) {
            //animate input
            const splitDeviceAddress = data.d.split("/");

            animateCSS("." + splitDeviceAddress[splitDeviceAddress.length - 1], "bounce");
        }

        if (data.p) {
            console.log("p", data.p);

            loadProjectList(data.p, function (projectName) {
                socket.emit("load.project", {name: projectName});
            });
        }

        if (data.s) {
            $.notify(data.s, "success");
        }

        if (data.er) {
            console.log("e", data.er);

            $.notify(data.er, "error");
        }
    });

    socket.emit("send.general");
    socket.emit("list.project");

    settingModeButton.onclick = function () {
        console.log("set.mode", currentMode === 0 ? 1 : 0);

        socket.emit("set.mode", {mode: currentMode === 0 ? 1 : 0});
    };

    document.getElementById("add-user-form").onsubmit = function () {
        console.log("add.user");

        const userId = this["user-id"].value;

        if (userId !== "") {
            socket.emit("add.user", {id: userId});
        }

        this["user-id"].value = "";

        return false;
    };

    document.getElementById("refresh-device-button").onclick = function () {
        console.log("refresh.device");

        socket.emit("refresh.device");
    };

    saveProjectButton.onclick = function () {
        console.log("save.project");

        socket.emit("save.project", {name: projectName.value});
    };

    newProjectButton.onclick = function () {
        console.log("save.project");

        socket.emit("new.project", {name: projectName.value});
    };

    autosaveButton.onclick = function () {
        console.log("autosave.project", !currentAutosave);

        socket.emit("autosave.project", {autosave: !currentAutosave});
    };

    settings.style.display = "";
}

function loadUserList(general, callbackEdit, callbackDelete) {
    const usersList = document.getElementById("user-list");
    usersList.innerHTML = "";

    const userIds = Object.keys(general.users);

    for (let i = 0; i < userIds.length; i++) {
        (function (i) {
            const userElement = document.createElement("li");
            userElement.classList.add("list-group-item");

            const splitMouseAddress = general.users[userIds[i]].mouse.split("/");
            const splitKeyboardAddress = general.users[userIds[i]].keyboard.split("/");

            userElement.innerHTML = "<form><div class='form-row'>" +
                "<div class='col'>" + userIds[i] + "</div>" +
                "<div class='col'><input type='text'" +
                " class='form-control " + splitMouseAddress[splitMouseAddress.length - 1] + "'" +
                " placeholder='Mouse'" +
                " value='" + general.users[userIds[i]].mouse + "'></div>" +
                "<div class='col'><input type='text'" +
                " class='form-control " + splitKeyboardAddress[splitKeyboardAddress.length - 1] + "'" +
                " placeholder='Keyboard'" +
                " value='" + general.users[userIds[i]].keyboard + "'></div>" +
                "<div class='col'><button type='button' id='edit-user-" + userIds[i] + "-button'" +
                " class='btn btn-outline-primary'>Edit</button></div>" +
                "<div class='col'><button type='button' id='delete-user-" + userIds[i] + "-button'" +
                " class='btn btn-outline-dark'>Delete</button></div>" +
                "</div></form>";

            usersList.appendChild(userElement);

            document.getElementById("edit-user-" + userIds[i] + "-button").onclick = function () {
                console.log("edit.user", userIds[i]);

                callbackEdit(userIds[i]);
            };

            document.getElementById("delete-user-" + userIds[i] + "-button").onclick = function () {
                console.log("delete.user", userIds[i]);

                callbackDelete(userIds[i]);
            };
        })(i);
    }
}

function animateCSS(element, animationName, callback) {
    const node = document.querySelector(element);

    if (node === null)
        return;

    if (!node.classList.contains("animated")) {
        node.classList.add('animated', animationName);

        function handleAnimationEnd() {
            node.classList.remove('animated', animationName);
            node.removeEventListener('animationend', handleAnimationEnd);

            if (typeof callback === 'function') callback()
        }

        node.addEventListener('animationend', handleAnimationEnd);
    }
}

function loadProjectList(list, callbackOpen) {
    const projectList = document.getElementById("project-list");
    projectList.innerHTML = "";

    for (let i = 0; i < list.length; i++) {
        (function (i) {
            const projectElement = document.createElement("li");
            projectElement.classList.add("list-group-item");

            projectElement.innerHTML = "<button type='button' id='open-project-" + list[i] + "-button'" +
                " class='btn btn-link'>" + list[i] + "</button></form>";

            projectList.appendChild(projectElement);

            document.getElementById("open-project-" + list[i] + "-button").onclick = function () {
                callbackOpen(list[i]);
            };
        })(i);
    }
}