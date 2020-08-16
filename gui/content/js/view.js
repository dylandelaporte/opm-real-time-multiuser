const server_url_cookie_name = "server_url";
const username_cookie_name = "username";

let socket = null;

window.onload = function () {
    const server_url = getCookie(server_url_cookie_name);

    if (server_url !== "") {
        const username = getCookie(username_cookie_name);

        if (username !== "") {
            connect(server_url, username);
        }
        else {
            console.log("unable to get the username");
        }
    }
    else {
        console.log("unable to connect to the server");
    }
};

function connect(server_url, username) {
    socket = new WebSocket(server_url);

    let connected = false;
    let currentMode = 0;

    socket.onopen = function () {
        console.log("connected");

        if (connected) {
            console.log("already connected reload");
            location.reload();
        }

        connected = true;
    };

    socket.onclose = function () {
        console.log("disconnected");
    };

    socket.onmessage = function (data) {
        try {
            data = JSON.parse(data.data);

            console.log("data", data);
        }
        catch (e) {
            console.log("Unable to parse data: " + data);
        }
    };
}

function sendCommand(command, fileName, speed) {
    let data = {type: command};

    if (fileName) {
        data.fileName = fileName;
    }

    if (speed) {
        data.speed = speed;
    }

    socket.send(JSON.stringify(data));
}