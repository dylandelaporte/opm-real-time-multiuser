const server_url_cookie_name = "server_url";
const username_cookie_name = "username";

let socket = null;

window.onload = function () {
    const server_url = getCookie(server_url_cookie_name);

    if (server_url !== "") {
        const username = getCookie(username_cookie_name);

        if (username !== "") {
            connect(server_url, username);
        } else {
            console.log("unable to get the username");
        }
    } else {
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

        sendCommand("list.project");
        sendCommand("view.reset");
    };

    socket.onclose = function () {
        console.log("disconnected");
    };

    socket.onmessage = function (data) {
        try {
            data = JSON.parse(data.data);

            console.log("data", data);

            if (data.p) {
                updateProjects(data.p);
            }

            if (data.v) {
                if (data.v.line) {
                    updateView(data.v);
                }
                else {
                    updateStatus(data.v);
                }
            }

            if (data.s) {
                $.notify(data.s, "success");

                sendInfoViewCommand();
            }

            if (data.er) {
                sendInfoViewCommand();

                $.notify(data.er, "error");
            }
        } catch (e) {
            console.log(e);
            console.log("Unable to parse data: " + data);
        }
    };
}

function sendCommand(command, fileName, goToLine, speed) {
    let data = {type: command};

    if (fileName) {
        data.fileName = fileName;
    }

    if (goToLine) {
        console.log("goToLine", goToLine);
        data.goToLine = goToLine;
    }

    if (speed) {
        data.speed = speed;
    }

    socket.send(JSON.stringify(data));
}

function sendInfoViewCommand() {
    sendCommand("view.info");
}

const projectForm = document.getElementById("project-form");
const projectSelect = document.getElementById("project-select");

const playButton = document.getElementById("play-button");

const lineRangeInput = document.getElementById("line-range-input");
const currentLineText = document.getElementById("current-line-text");
const countLinesText = document.getElementById("count-lines-text");

const viewContainer = document.getElementById("view-container");

let countLines = 0;

function updateProjects (projects) {
    projectSelect.innerHTML = "";

    for (const project of projects) {
        projectSelect.innerHTML += "<option>" + project + "</option>";
    }

    projectForm.onsubmit = function () {
        console.log("selected project", projectSelect.value);

        sendCommand("view.select.file", projectSelect.value);

        return false;
    }
}

function updateStatus(info) {
    if (info.file) {
        for (let i = 0; i < projectSelect.options.length; i++) {
            if (info.file.name === projectSelect.options[i].text) {
                projectSelect.value = projectSelect.options[i].text;
            }
        }

        if (info.playing) {
            playButton.classList.remove("btn-primary");
            playButton.classList.add("btn-outline-danger");
            playButton.innerText = "Stop";

            playButton.onclick = function () {
                sendCommand("view.stop");
            };

            lineRangeInput.disabled = true;
        } else {
            playButton.classList.remove("btn-outline-danger");
            playButton.classList.add("btn-primary");
            playButton.innerText = "Play";

            playButton.onclick = function () {
                sendCommand("view.start", null, countLines, 100);
            };

            lineRangeInput.disabled = false;
        }

        lineRangeInput.onchange = function () {
            sendCommand("view.start",
                null,
                parseInt((lineRangeInput.value / 100) * countLines),
                5);
        };

        lineRangeInput.value = (info.file.currentLine / info.file.countLines) * 100;

        currentLineText.innerText = info.file.currentLine;
        countLinesText.innerText = info.file.countLines;

        countLines = info.file.countLines;
    }
    else {
        lineRangeInput.value = 0;

        currentLineText.innerText = "0";
        countLinesText.innerText = "--";

        playButton.onclick = null;
        lineRangeInput.onchange = null;
    }
}

function updateView(data) {
    console.log("data", data);

    currentLineText.innerText = data.line;
    lineRangeInput.value = (data.line / countLines) * 100;

    parseEditorData(data.content);
}