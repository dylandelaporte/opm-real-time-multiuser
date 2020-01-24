const server_url_cookie = "server_url";

const settings = document.getElementById("settings");
const error = document.getElementById("error");

window.onload = function () {
    const server_url_cookie_value = getCookie(server_url_cookie);

    if (server_url_cookie_value !== "") {
        let clientSocket;

        connected(server_url_cookie_value, function (connected, socket) {
            clientSocket = socket;
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

    let currentMode;

    socket.on("data", function (data) {
        console.log("data", data);

        if (data.g) {
            currentMode = data.g.mode;

            settingModeButton.innerText = currentMode === 0 ? "Enable setting mode" : "Disable setting mode";
            settingsContent.style.display = currentMode === 0 ? "none" : "";

            loadUsersList(data.g, function (id) {
                socket.emit("set.edition.user", {id: id});
            }, function (id) {
                socket.emit("delete.user", {id: id});
            });
        }

        if (data.d) {
            //animate input
            const splitDeviceAddress = data.d.split("/");

            animateCSS("." + splitDeviceAddress[splitDeviceAddress.length - 1], "bounce");
        }
    });

    socket.emit("send.general", {});

    settingModeButton.onclick = function () {
        socket.emit("set.mode", {mode: currentMode === 0 ? 1 : 0});
    };

    document.getElementById("add-user-form").onsubmit = function () {
        const userId = this["user-id"].value;

        if (userId !== "") {
            socket.emit("add.user", {id: userId});
        }

        return false;
    };

    settings.style.display = "";
}

function loadUsersList(general, callbackEdit, callbackDelete) {
    const usersList = document.getElementById("users-list");
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
                "class='form-control " + splitMouseAddress[splitMouseAddress.length - 1] + "'" +
                "placeholder='Mouse'" +
                "value='" + general.users[userIds[i]].mouse + "'></div>" +
                "<div class='col'><input type='text'" +
                "class='form-control " + splitKeyboardAddress[splitKeyboardAddress.length - 1] + "'" +
                "placeholder='Keyboard'" +
                "value='" + general.users[userIds[i]].keyboard + "'></div>" +
                "<div class='col'><button type='button' id='edit-user-" + userIds[i] + "-button'" +
                "class='btn btn-outline-primary'>Edit</button></div>" +
                "<div class='col'><button type='button' id='delete-user-" + userIds[i] + "-button'" +
                "class='btn btn-outline-dark'>Delete</button></div>" +
                "</div></form>";

            usersList.appendChild(userElement);

            document.getElementById("edit-user-" + userIds[i] + "-button").onclick = function () {
                callbackEdit(userIds[i]);
            };

            document.getElementById("delete-user-" + userIds[i] + "-button").onclick = function () {
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