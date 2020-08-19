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
        sendInfoViewCommand();
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
                updateStatus(data.v);
            }

            if (data.an) {
                if (data.an.progress) {
                    updateProgress(data.an);
                }

                if (data.an.data) {
                    updateCharts(data.an);
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

function sendInfoViewCommand() {
    sendCommand("view.info");
}

function sendGetAnalysisCommand() {
    sendCommand("view.get.analysis");
}

const projectForm = document.getElementById("project-form");
const projectSelect = document.getElementById("project-select");

const analysisStartButton = document.getElementById("analysis-start-button");
const analysisRefreshButton = document.getElementById("analysis-refresh-button");

const analysisProgressBar = document.getElementById("analysis-progress-bar");
const analysisBlueProgressBar = document.getElementById("analysis-blue-progress-bar");
const analysisBlackProgressBar = document.getElementById("analysis-black-progress-bar");

const loadingContainer = document.getElementById("loading-container");
const chartsContainer = document.getElementById("charts-container");

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

        if (info.analyzing) {
            analysisStartButton.classList.remove("btn-primary");
            analysisStartButton.classList.add("btn-outline-danger");
            analysisStartButton.innerText = "Stop";

            analysisStartButton.onclick = function () {
                sendCommand("view.stop.analysis");
            };

            //analysisRefreshButton.style.display = "none";
            analysisProgressBar.style.display = "";

            chartsContainer.style.display = "none";
            loadingContainer.style.display = "";
        } else {
            analysisStartButton.classList.remove("btn-outline-danger");
            analysisStartButton.classList.add("btn-primary");
            analysisStartButton.innerText = "Start";

            analysisStartButton.onclick = function () {
                sendCommand("view.start.analysis");
            };

            //analysisRefreshButton.style.display = "";

            analysisRefreshButton.onclick = function () {
                sendGetAnalysisCommand();
            };

            analysisProgressBar.style.display = "none";

            analysisBlueProgressBar.style.width = "0";
            analysisBlackProgressBar.style.width = "0";

            chartsContainer.style.display = "";
            loadingContainer.style.display = "none";

            if (info.file.analysisFile) {
                sendGetAnalysisCommand();
            }
        }
    }
    else {
        chartsContainer.style.display = "";
        loadingContainer.style.display = "none";
    }
}

function updateProgress(progress) {
    analysisBlueProgressBar.style.width = progress.progress + "%";
    analysisBlackProgressBar.style.width = (100 - progress.progress) + "%";

    if (progress.progress === 100) {
        sendInfoViewCommand();
        sendGetAnalysisCommand();
    }
}

let tmpCharts = [];

function updateCharts(data) {
    chartsContainer.innerHTML = "";

    for (let row in tmpCharts) {
        delete tmpCharts[row];
    }

    const metrics = Object.keys(data.data);

    for (const metric of metrics) {
        console.log("metric", metric);

        const card = document.createElement("div");
        card.classList.add("card");

        const cardBody = document.createElement("div");
        cardBody.classList.add("card-body");

        const chartDiv = document.createElement("div");
        chartDiv.classList.add("col-md-8");

        const canvas = document.createElement("canvas");

        chartDiv.appendChild(canvas);
        cardBody.appendChild(chartDiv);
        card.appendChild(cardBody);

        const users = Object.keys(data.data[metric]);

        let datasets = [];

        for (const user of users) {
            const points = data.data[metric][user].data;
            const color = getColorFromId(user);

            let formattedData = [];

            for (const point of points) {
                formattedData.push({x: new Date(point.action_date), y: point.metric_value});
            }

            datasets.push({
                label: user,
                backgroundColor: color,
                borderColor: color,
                fill: false,
                data: formattedData
            });
        }

        tmpCharts.push(new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: metric
                },
                scales: {
                    xAxes: [{
                        type: 'time'
                    }]
                },
            }
        }));

        chartsContainer.appendChild(card);
    }
}