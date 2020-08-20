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

    function getRank(groupSummarize) {
        const users = Object.keys(groupSummarize.users);

        users.sort(function (a, b) {
            if (groupSummarize.users[a] > groupSummarize.users[b]) {
                return 1;
            }
            else if (groupSummarize.users[a] < groupSummarize.users[b]) {
                return -1;
            }
            else {
                return 0;
            }
        });

        let textUsers = [];

        for (const user of users) {
            textUsers.push(user + " (" + parseInt((groupSummarize.users[user] / groupSummarize.count) * 100) + ")");
        }

        return textUsers.join(", ");
    }

    chartsContainer.innerHTML += "<div class='card'><div class='card-body'>" +
        "<table class='table'>" +
        "<thead><tr><th>Viewer</th><th>Editor</th><th>Reviewer</th></tr></thead>" +
        "<tbody><tr><td>" + getRank(data.summarize.viewer) + "</td>" +
        "<td>" + getRank(data.summarize.editor) + "</td>" +
        "<td>" + getRank(data.summarize.reviewer) + "</td></tr></tbody>" +
        "</table></div></div>";

    const metrics = Object.keys(data.data);

    for (const metric of metrics) {
        const card = document.createElement("div");
        card.classList.add("card");

        const cardBody = document.createElement("div");
        cardBody.classList.add("card-body", "row");

        const chartDiv = document.createElement("div");
        chartDiv.classList.add("col-md-8");

        const tableDiv = document.createElement("div");
        tableDiv.classList.add("col-md-4");

        const table = document.createElement("table");
        table.classList.add("table");

        const tHead = document.createElement("thead");
        tHead.innerHTML = "<tr><th>#</th><th>User</th><th>Total</th></tr>";

        const tBody = document.createElement("tbody");

        const canvas = document.createElement("canvas");

        chartDiv.appendChild(canvas);
        cardBody.appendChild(chartDiv);

        table.appendChild(tHead);
        table.appendChild(tBody);
        tableDiv.appendChild(table);
        cardBody.appendChild(tableDiv);

        card.appendChild(cardBody);

        const users = Object.keys(data.data[metric]);

        let datasets = [];

        for (const user of users) {
            const userData = data.data[metric][user];
            const points = userData.data;
            const color = getColorFromId(user);

            tBody.innerHTML += "<tr>" +
                "<th>" + userData.rank + "</th>" +
                "<td>" + user + "</td>" +
                "<td>" + userData.sum + "</td>" +
                "</tr>";

            let formattedData = [];

            for (let i = 0; i < points.length; i++) {
                const currentDate = new Date(points[i].action_date);

                formattedData.push({x: currentDate, y: points[i].metric_value});

                if (i + 1 < points.length && new Date(points[i + 1].action_date) - currentDate > 30000) {
                    let generatedDate = new Date(currentDate.getTime() + 30000);

                    formattedData.push({x: generatedDate, y: 0});
                }
            }

            datasets.push({
                label: user,
                backgroundColor: color,
                borderColor: color,
                steppedLine: true,
                fill: true,
                pointRadius: 0,
                borderWidth: 0,
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