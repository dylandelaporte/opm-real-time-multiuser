const server_url_cookie = "server_url";

const settings = document.getElementById("settings");
const error = document.getElementById("error");

window.onload = function () {
    const server_url_cookie_value = getCookie(server_url_cookie);

    if (server_url_cookie_value !== "") {
        connected(server_url_cookie_value, function (connected, socket) {
            if (connected) {
                loadSettings(socket);
            }
            else {
                error.style.display = "";
            }
        }, true);
    }
    else {
        error.style.display = "";
    }
};

function loadSettings(socket) {
    settings.style.display = "";
}