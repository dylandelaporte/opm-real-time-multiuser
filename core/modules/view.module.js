const util = require('util');
const exec = util.promisify(require('child_process').exec);
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

    return info;
}

view.selectFile = async function (fileName) {
    if (view.interval !== null || view.analyzing) {
        throw new Error("A file is in use.");
    }

    //get count file
    const countLines = await view.getCountLines(fileName);

    if (countLines < 1) {
        throw new Error("This file does not exists.");
    }

    view.file.name = fileName;
    view.file.currentLine = 0;
    view.file.countLines = countLines;
}

view.startAnalysis = function () {
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

    let userData = {
        "user": {
            viewer: {
                countInteractions: 0,
                countMouseMovementsOverABlock: 0,
                mouseDistance: 0,
                mouseMovementsNotFollowedByEdition: 0
            },
            editor: {
                blockAddition: 0,
                blockDeletion: 0,
                arrowAddition: 0,
                arrowDeletion: 0,
                firstTextEdit: 0,
                ratioMouseMovementsOverABlockOnMouseMovement: 0
            },
            reviewer: {
                textUpdateOfNonCreateBlocks: 0,
                arrowNodeAddition: 0,
                arrowNodeDeletion: 0,
                movementOfNonCreatedBlocks: 0
            }
        }
    };

    async function process() {
        const db = await view.setupDB(view.file.name);

        while (view.file.currentLine < view.file.countLines) {
            if (!view.analyzing) {
                break;
            }

            view.analyzingProgress = (view.file.currentLine / view.file.countLines) * 100;

            console.log("progress: " + view.analyzingProgress);

            try {
                //get data
                const line = await view.getLine(view.file.name, view.file.currentLine);
                const content = JSON.parse(line[1]);

                const currentDate = new Date(line[0]);
                let save = false;

                if (limitDate === null || currentDate > limitDate) {
                    limitDate = new Date(currentDate.getTime() + 10000);
                    userData = {};
                    save = true;

                    console.log("refreshDate: " + limitDate);
                }

                if (content.id) {
                    if (!userData[content.id]) {
                        userData[content.id] = {
                            last: null,
                            "viewer.countInteractions": 0,
                            "viewer.countMouseMovementsOverABlock": 0,
                            "viewer.mouseDistance": 0,
                            "viewer.mouseMovementsNotFollowedByEdition": 0
                        }
                    }

                    //analyze data
                    userData[content.id]["viewer.countInteractions"]++;
                    //"viewer.countMouseMovementsOverABlock"

                    if (content.m && userData[content.id].last && userData[content.id].last.m) {
                        userData[content.id]["viewer.mouseDistance"] +=
                            Math.sqrt(Math.pow(content.m.left - userData[content.id].last.m.left, 2)
                                + Math.pow(content.m.top - userData[content.id].last.m.top, 2));
                    }

                    //"viewer.mouseMovementsNotFollowedByEdition"

                    userData[content.id].last = content;
                }

                if (save) {
                    console.log("save", userData);

                    const users = Object.keys(userData);

                    for (let i in users) {
                        const metrics = Object.keys(userData[users[i]]);

                        for (let j in metrics) {
                            await view.insertAnalysis(db, currentDate.toISOString(), users[i],
                                metrics[j], userData[users[i]][metrics[j]])
                        }
                    }
                }
            } catch (e) {
                console.log("Unable to parse line " + e);
            }

            view.file.currentLine++;
        }

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
    return new Promise(function (resolve) {
        db.run("INSERT INTO view_data VALUES (?, ?, ?, ?)", [actionDate, userId, metric, metricValue], function () {
            resolve();
        })
    });
}

view.stopAnalysis = function () {
    view.analyzing = false;
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