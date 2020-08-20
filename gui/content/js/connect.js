const server_url_cookie_name = "server_url";
const username_cookie_name = "username";
const managed_instance_cookie_name = "managed_instance";

const connectionContent = document.getElementById("connection");
const usernameContent = document.getElementById("username");
const menuContent = document.getElementById("menu");

window.onload = function () {
    if (findGetParameter("force_disconnect")) {
        setCookie(server_url_cookie_name, "");
    }

    setCookie(managed_instance_cookie_name,
        findGetParameter("managed_instance") !== null, 100);

    const server_url_cookie_value = getCookie(server_url_cookie_name);
    const username_cookie_value = getCookie(username_cookie_name);

    const server_url = findGetParameter("server_url");

    if (server_url_cookie_value !== "" && server_url === null) {
        if (username_cookie_value !== "") {
            const redirect = findGetParameter("redirect");

            if (redirect !== null) {
                if (redirect === "edition") {
                    location.href = "edition.html";
                }
            }

            loadMenu(server_url_cookie_value, username_cookie_value);
        } else {
            usernameContent.style.display = "";

            activateUsernameForm(server_url_cookie_value);
        }
    } else {
        connectionContent.style.display = "";

        activateConnectionForm();

        if (server_url !== null) {
            const serverUrlInput = document.getElementById("server-url");
            const connectButton = document.getElementById("connect_button");

            serverUrlInput.value = server_url;
            serverUrlInput.disabled = true;

            connectButton.disabled = true;

            connectToServer(server_url, function () {
                serverUrlInput.disabled = false;
                connectButton.disabled = false;
            });
        }
    }
};

function activateConnectionForm() {
    document.getElementById("connection-form").onsubmit = function () {
        const that = this;

        this["server-url"].disabled = true;
        this.connect_button.disabled = true;

        connectToServer(this["server-url"].value, function () {
            that["server-url"].disabled = false;
            that.connect_button.disabled = false;
        });

        return false;
    }
}

function connectToServer(serverUrl, errorCallback) {
    if (serverUrl.indexOf("ws") < 0) {
        serverUrl = "ws://" + serverUrl;
    }

    if (!serverUrl.match(new RegExp(/:[0-9]{4}/gi))) {
        serverUrl += ":3000";
    }

    if (serverUrl.match(new RegExp(/ws:\/\/([0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{4}/gi))
        || serverUrl.match(new RegExp(/ws:\/\/localhost:[0-9]{4}/gi))) {
        $.notify("Connecting...", "info");

        setCookie(server_url_cookie_name, "");

        connected(serverUrl, function (connected) {
            if (connected) {
                console.log("success");

                console.log(server_url_cookie_name, serverUrl);

                setCookie(server_url_cookie_name, serverUrl, 100);

                location.href = "index.html";
            } else {
                $.notify("Unable to connect to the server", "error");

                if (errorCallback) {
                    errorCallback();
                }
            }
        });
    } else {
        $.notify("Wrong address, it must include protocol", "error");

        if (errorCallback) {
            errorCallback();
        }
    }
}

function activateUsernameForm(server_url) {
    const usernameExpression = /[a-zA-Z0-9]{2,10}/gi;
    const usernameRegex = new RegExp(usernameExpression);

    const usernameNetworkError = document.getElementById("username-network-error");
    const usernameContent = document.getElementById("username-content");

    const usernameList = document.getElementById("username-list");

    connected(server_url, function (connected, socket) {
        console.log("connected", connected);

        if (connected) {
            socket.onmessage = function (data) {
                console.log("data", data);

                try {
                    data = JSON.parse(data.data);

                    if (data.g) {
                        const users = Object.keys(data.g.users);

                        if (users.length > 0) {
                            users.forEach(function (user) {
                                (function (user) {
                                    const li = document.createElement("li");
                                    li.classList.add("list-group-item");

                                    const a = document.createElement("a");
                                    a.href = "#";
                                    a.innerText = user;

                                    a.onclick = function () {
                                        setCookie(username_cookie_name, user);

                                        location.href = "index.html";

                                        return false;
                                    };

                                    li.appendChild(a);

                                    usernameList.appendChild(li);
                                })(user);
                            });
                        } else {
                            usernameList.innerHTML = "<p>There are no created users yet in the session.</p>";
                        }
                    }
                }
                catch (e) {
                    console.log("Unable to parse data: " + data);
                }
            };

            socket.send(JSON.stringify({type: "send.general"}));

            usernameContent.style.display = "";
            usernameNetworkError.style.display = "none";
        }
        else {
            usernameContent.style.display = "none";
            usernameNetworkError.style.display = "";
        }
    }, true);

    document.getElementById("username-form").onsubmit = function () {
        if (this["username"].value.match(usernameRegex)) {
            setCookie(username_cookie_name, this["username"].value, 100);

            location.href = "index.html";
        } else {
            $.notify("The username must be written with only alphanumeric characters and numbers with " +
                "a maximum length of 10 characters.")
        }

        return false;
    };
}

function loadMenu(server_url, username) {
    const connectionAlert = document.getElementById("connection-alert");
    const connectedToServerActionsDiv = document.getElementById("connected-to-server-actions-div");

    document.getElementById("server-url-text").innerText = server_url;
    document.getElementById("username-text").innerText = username;

    document.getElementById("change-username-button").onclick = function () {
        setCookie(username_cookie_name, "");

        window.location = window.location.href.split("?")[0];
    };

    const disconnectButton = document.getElementById("disconnect-button");
    disconnectButton.style.display = getCookie(managed_instance_cookie_name) === "false" ? "none" : "";

    disconnectButton.onclick = function () {
        setCookie(server_url_cookie_name, "");
        setCookie(username_cookie_name, "");

        window.location = window.location.href.split("?")[0];
    };

    menuContent.style.display = "";

    connected(server_url, function (connected) {
        console.log("connected", connected);
    }, true, function () {
        connectionAlert.style.display = "none";
        connectedToServerActionsDiv.style.display = "";
    }, function () {
        connectionAlert.style.display = "";
        connectedToServerActionsDiv.style.display = "none";
    });
}

function findGetParameter(parameterName) {
    let result = null,
        tmp = [];

    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");

            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });

    return result;
}