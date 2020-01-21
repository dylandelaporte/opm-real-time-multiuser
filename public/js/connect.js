const server_url_cookie = "server_url";

const connectionContent = document.getElementById("connection");
const menuContent = document.getElementById("menu");

window.onload = function () {
    const server_url_cookie_value = getCookie(server_url_cookie);

    if (server_url_cookie_value !== "") {
        loadMenu(server_url_cookie_value);
    }
    else {
        connectionContent.style.display = "";

        activateConnectionForm();
    }
};

function activateConnectionForm() {
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
    const regex = new RegExp(expression);

    document.getElementById("connection-form").onsubmit = function () {
        const that = this;

        if (this["server-url"].value.match(regex)) {
            this["server-url"].disabled = true;
            this.connect_button.disabled = true;

            $.notify("Connecting...", "info");

            connected(this["server-url"].value, function (connected) {
                if (connected) {
                    console.log("success");

                    console.log(server_url_cookie, that["server-url"].value);

                    setCookie(server_url_cookie, that["server-url"].value, 10);

                    location.reload();
                }
                else {
                    that["server-url"].disabled = false;
                    that.connect_button.disabled = false;

                    $.notify("Unable to connect to the server", "error");
                }
            });
        }
        else {
            $.notify("Wrong address, it must include protocol", "error");
        }

        return false;
    }
}

function loadMenu(server_url) {
    const connectionAlert = document.getElementById("connection-alert");
    const connectedToServerActionsDiv = document.getElementById("connected-to-server-actions-div");

    document.getElementById("server-url-text").innerText = server_url;

    document.getElementById("disconnect-button").onclick = function () {
        setCookie(server_url_cookie, "");

        location.reload();
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