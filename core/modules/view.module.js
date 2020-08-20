const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require("fs");
const sqlite3 = require('sqlite3').verbose();

const view = {
    interval: null,
    analyzing: false,
    analyzingProgress: 0,
    file: {
        name: null,
        currentLine: 0,
        countLines: 0
    }
};

view.getInfo = function () {
    let info = {playing: view.interval !== null, analyzing: view.analyzing, analyzingProgress: view.analyzingProgress};

    if (view.file.name !== null) {
        info.file = view.file;
    } else {
        info.file = false;
    }

    info.file.analysisFile = fs.existsSync('projects/' + view.file.name + '-view.db');

    return info;
}

view.selectFile = async function (fileName) {
    if (view.interval !== null || view.analyzing) {
        throw new Error("A file is in use.");
    }

    //get count file
    const countLines = await view.getCountLines(fileName);

    if (countLines < 1) {
        throw new Error("The log file does not exists.");
    }

    view.file.name = fileName;
    view.file.currentLine = 0;
    view.file.countLines = countLines;
}

view.startAnalysis = function (callback) {
    if (view.file.name === null) {
        throw new Error("There is no file loaded.");
    }

    if (view.analyzing) {
        throw new Error("The process has already started.");
    }

    view.analyzing = true;
    view.analyzingProgress = 0;

    view.file.currentLine = 0;

    //10 second structure
    let limitDate = null;

    let userData = {};
    let userTemporaryData = {};

    let temporaryData = {
        elements: {}
    };

    async function process() {
        const db = await view.setupDB(view.file.name);

        let previousProgress = 0;

        while (view.file.currentLine < view.file.countLines) {
            if (!view.analyzing) {
                break;
            }

            view.analyzingProgress = parseInt((view.file.currentLine / view.file.countLines) * 100);

            try {
                //get data
                const line = await view.getLine(view.file.name, view.file.currentLine);
                const content = JSON.parse(line[1]);

                const currentDate = new Date(line[0]);
                let save = false;

                if (limitDate === null || currentDate > limitDate) {
                    limitDate = new Date(currentDate.getTime() + 10000);

                    save = true;

                    //console.log("refreshDate: " + limitDate);
                }

                if (content.id) {
                    //console.log("user " + content.id + " interaction");

                    if (!userData[content.id]) {
                        userData[content.id] = {
                            "viewer.countInteractions": 0,
                            "viewer.countMouseMovementsOverABlock": 0,
                            "viewer.mouseDistance": 0,
                            "viewer.mouseMovementsNotFollowedByEdition": 0,
                            "editor.blockAddition": 0,
                            "editor.blockDeletion": 0,
                            "editor.blockMovement": 0,
                            "editor.arrowAddition": 0,
                            "editor.arrowDeletion": 0,
                            "editor.firstTextEdit": 0,
                            "editor.textEdit": 0,
                            "reviewer.textUpdateOfNonCreatedBlocks": 0,
                            "reviewer.arrowNodeAddition": 0,
                            "reviewer.arrowNodeDeletion": 0,
                            "reviewer.movementOfNonCreatedBlocks": 0
                        }

                        userTemporaryData[content.id] = {
                            last: null,
                            followMovements: false,
                            countFollowMovements: 0
                        }
                    }

                    //viewer.countInteractions
                    userData[content.id]["viewer.countInteractions"]++;

                    //viewer.countMouseMovementsOverABlock
                    if (content.m && content.e) {
                        if (!content.m.click.left && !content.m.click.right && !content.m.click.wheel) {
                            userData[content.id]["viewer.countMouseMovementsOverABlock"]++;
                        }
                    }

                    //viewer.mouseDistance
                    if (content.m && userTemporaryData[content.id].last && userTemporaryData[content.id].last.m) {
                        userData[content.id]["viewer.mouseDistance"] +=
                            Math.sqrt(Math.pow(content.m.left - userTemporaryData[content.id].last.m.left, 2)
                                + Math.pow(content.m.top - userTemporaryData[content.id].last.m.top, 2));
                    }

                    //viewer.mouseMovementsNotFollowedByEdition
                    if (content.m && (userTemporaryData[content.id].last === null
                        || userTemporaryData[content.id].last.m === undefined)) {
                        userTemporaryData[content.id].followMovements = true;
                        userTemporaryData[content.id].countFollowMovements = 0;
                    }

                    if (userTemporaryData[content.id].followMovements) {
                        if (save || (content.m && content.m.click.left && content.m.click.right
                            && content.m.click.wheel)) {
                            userTemporaryData[content.id].followMovements = false;

                            if (userTemporaryData[content.id].countFollowMovements > 15) {
                                userData[content.id]["viewer.mouseMovementsNotFollowedByEdition"] +=
                                    userTemporaryData[content.id].countFollowMovements;
                            }
                        }
                        else {
                            userTemporaryData[content.id].countFollowMovements++;
                        }
                    }

                    //editor.blockAddition
                    if (content.a) {
                        if (content.a.type === "new_object") {
                            userData[content.id]["editor.blockAddition"]++;
                        }
                    }

                    //editor.arrowAddition
                    if (content.a) {
                        if (content.a.type === "new_link") {
                            userData[content.id]["editor.arrowAddition"]++;
                        }
                    }

                    //reviewer.arrowNodeAddition
                    if (content.a) {
                        if (content.a.type === "new_node_link") {
                            userData[content.id]["reviewer.arrowNodeAddition"]++;
                        }
                    }

                    //reviewer.arrowNodeDeletion
                    if (content.a) {
                        if (content.a.type === "delete_node_link") {
                            userData[content.id]["reviewer.arrowNodeDeletion"]++;
                        }
                    }

                    if (content.e) {
                        const elements = Object.keys(content.e);

                        for (const element of elements) {
                            if (!temporaryData.elements[element]) {
                                temporaryData.elements[element] = {
                                    userId: content.id,
                                    type: content.e[element].type,
                                    textEdit: false
                                };
                            }
                            else {
                                if (content.e[element].text) {
                                    //editor.firstTextEdit
                                    if (!temporaryData.elements[element].textEdit) {
                                        temporaryData.elements[element].textEdit = true;
                                        userData[content.id]["editor.firstTextEdit"]++;
                                    }

                                    //reviewer.textUpdateOfNonCreatedBlocks
                                    if (temporaryData.elements[element].userId !== content.id) {
                                        userData[content.id]["reviewer.textUpdateOfNonCreatedBlocks"]++;
                                    }

                                    //editor.textEdit
                                    userData[content.id]["editor.textEdit"]++;
                                }
                                else if (content.m) {
                                    if (content.m.click.left) {
                                        //reviewer.movementOfNonCreatedBlocks
                                        if (temporaryData.elements[element].userId !== content.id) {
                                            userData[content.id]["review.movementOfNonCreatedBlocks"]++;
                                        }

                                        //editor.blockMovement
                                        userData[content.id]["editor.blockMovement"]++;
                                    }
                                }
                                else if (content.e[element].deleted) {
                                    //editor.blockDeletion
                                    if (temporaryData[element].type === "object"
                                        || temporaryData[element].type === "process") {
                                        userData[content.id]["editor.blockDeletion"]++;
                                    }
                                    //editor.arrowDeletion
                                    else if (temporaryData[element].type.indexOf("arrow") >= 0) {
                                        userData[content.id]["editor.arrowDeletion"]++;
                                    }
                                }
                            }
                        }
                    }

                    userTemporaryData[content.id].last = content;
                }

                if (save) {
                    console.log("save", userData);

                    const users = Object.keys(userData);

                    for (let i in users) {
                        const metrics = Object.keys(userData[users[i]]);

                        for (let j in metrics) {
                            await view.insertAnalysis(db, currentDate.toISOString(), users[i],
                                metrics[j], userData[users[i]][metrics[j]]);
                        }
                    }

                    userData = {};
                    userTemporaryData = {};
                }
            } catch (e) {
                console.log("Unable to parse line " + e);
            }

            view.file.currentLine++;

            if (view.analyzingProgress !== previousProgress) {
                previousProgress = view.analyzingProgress;

                //console.log("progress: " + view.analyzingProgress);

                callback(null, view.analyzingProgress);
            }
        }

        callback(null, 100);

        view.analyzing = false;

        db.close();
    }

    process();
}

view.setupDB = function (fileName) {
    return new Promise(function (resolve, reject) {
        const db = new sqlite3.Database('projects/' + fileName + '-view.db', (err) => {
            if (err) {
                return reject(err);
            }

            console.log('Connected to the in-memory SQlite database.');

            db.run("CREATE TABLE IF NOT EXISTS view_data (" +
                "action_date DATETIME NOT NULL," +
                "user_id VARCHAR(50) NOT NULL," +
                "metric VARCHAR(50) NOT NULL," +
                "metric_value INT NOT NULL" +
                ")", [], function (err) {
                if (err) {
                    return reject(err);
                }

                db.run("DELETE FROM view_data", [], function (err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(db);
                });
            });
        });
    });
}

view.insertAnalysis = function (db, actionDate, userId, metric, metricValue) {
    console.log("insert", userId, metric, metricValue);

    return new Promise(function (resolve) {
        db.run("INSERT INTO view_data VALUES (?, ?, ?, ?)", [actionDate, userId, metric, metricValue], function () {
            resolve();
        })
    });
}

view.stopAnalysis = function () {
    view.analyzing = false;
}

view.getAnalysis = async function () {
    if (view.file.name === null) {
        throw new Error("There is no file loaded.");
    }

    if (view.analyzing) {
        throw new Error("The process has already started.");
    }

    if (!fs.existsSync('projects/' + view.file.name + '-view.db')) {
        throw new Error("The analysis does not exists.");
    }

    const db = await view.dbConnect();
    const metrics = await view.dbRequest(db, "SELECT metric FROM view_data GROUP BY metric");

    let summarize = {
        viewer: {users: {}, count: 0},
        editor: {users: {}, count: 0},
        reviewer: {users: {}, count: 0}
    };

    let data = {};

    for (const metric of metrics) {
        data[metric.metric] = {};

        const users = await view.dbRequest(db,
            "SELECT user_id, SUM(metric_value) AS sum FROM view_data WHERE metric = ? " +
            "GROUP BY user_id ORDER BY sum",
            [metric.metric]);

        let rank = 1;

        for (const user of users) {
            const metricGroup = metric.metric.split(".")[0];

            summarize[metricGroup].count++;

            if (!summarize[metricGroup].users[user.user_id]) {
                summarize[metricGroup].users[user.user_id] = 0;
            }

            summarize[metricGroup].users[user.user_id] += rank;

            data[metric.metric][user.user_id] = {
                data: await view.dbRequest(db,
                    "SELECT action_date, metric_value FROM view_data WHERE metric = ? AND user_id = ? " +
                    "ORDER BY action_date",
                    [metric.metric, user.user_id]), sum: user.sum, rank: rank
            };

            rank++;
        }
    }

    return {summarize: summarize, data: data};
}

view.dbConnect = async function () {
    return new Promise(function (resolve, reject) {
        const db = new sqlite3.Database('projects/' + view.file.name + '-view.db', (err) => {
            if (err) {
                return reject(err);
            }

            console.log('Connected to the in-memory SQlite database.');

            resolve(db);
        });
    });
}

view.dbRequest = async function (db, request, parameters = []) {
    return new Promise(function (resolve, reject) {
        db.all(request, parameters, function (err, rows) {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

view.start = function (speed, callback) {
    if (view.file.name === null) {
        throw new Error("There is no file loaded.");
    }

    if (!view.interval) {
        view.file.currentLine = 0;

        view.interval = setInterval(async function () {
            //+1 line
            view.file.currentLine++;

            if (view.file.currentLine < view.file.countLines) {
                try {
                    //get data
                    const line = await view.getLine(view.file.name, view.file.currentLine);
                    const content = JSON.parse(line[1]);

                    //send data
                    callback(null, {date: line[0], content: content});
                } catch (e) {
                    console.log("Unable to parse line " + e);
                }
            } else {
                view.stop();
            }
        }, (speed < 1000 && speed > 0) ? speed : 900);
    }
}

view.stop = function () {
    if (view.interval) {
        clearInterval(view.interval);
    }
}

view.getCountLines = async function (fileName) {
    const {stdout, stderr} = await exec('./scripts/countLines.sh projects/' + fileName + '-log.json');
    //console.log("test", stdout, stderr);

    if (stderr !== "") {
        throw new Error(stderr);
    }

    return JSON.parse(stdout);
}

view.getLine = async function (fileName, line) {
    const {stdout, stderr} = await exec('./scripts/getLine.sh projects/' + fileName + '-log.json ' + line);
    //console.log("test", stdout, stderr);

    if (stderr !== "") {
        throw new Error(stderr);
    }

    return JSON.parse(stdout);
}

module.exports = view;