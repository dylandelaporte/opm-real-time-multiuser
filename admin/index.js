const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const proxy = require("express-http-proxy");
const uniqid = require("uniqid");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const httpProxy = require('http-proxy');

const app = express();
const port = 3030;

let proxies = {};

const db = new sqlite3.Database('data/database/file.db', (err) => {
    if (err) {
        return console.error(err.message);
    }

    console.log('Connected to the in-memory SQlite database.');

    db.run("CREATE TABLE IF NOT EXISTS instances (" +
        "id VARCHAR(18) NOT NULL," +
        "title VARCHAR(50) NOT NULL," +
        "core_port INT NOT NULL," +
        "gui_port INT NOT NULL," +
        "created_date DATETIME NOT NULL DEFAULT(CURRENT_TIMESTAMP)" +
        ")");
});

app.use(bodyParser.urlencoded({extended: false}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static("public"));

async function renderRoot(req, res) {
    try {
        const instances = await getInstances();

        for (let i in instances) {
            instances[i].state = await getStatus(instances[i].id);
        }

        res.render("pages/root", {success: req.query.success, error: req.query.error, instances: instances});
    } catch (e) {
        renderError(res, 500, err.message, true);
    }
}

function renderAdd(req, res) {
    res.render("pages/add", {success: req.query.success, error: req.query.error});
}

async function renderManage(req, res) {
    try {
        const instance = await existsInstance(req.params.id);
        const status = await getStatus(req.params.id);
        const logs = await getLogs(req.params.id);

        res.render("pages/manage", {
            success: req.query.success,
            error: req.query.error,
            instance: instance,
            status: status,
            logs: logs
        });
    } catch (e) {
        renderError(res, 404, "The instance does not exists.", true);
    }
}

async function renderProxy(req, res) {
    try {
        const instance = await existsInstance(req.params.id);

        console.log("render", req.url);

        proxy("http://localhost:" + instance.gui_port + "/", {
            proxyReqPathResolver: function (req) {
                var parts = req.url.split('?');
                var queryString = parts[1] || "";
                var updatedPath = parts[0].replace(/\/view\/[a-z0-9]+/, '');

                //console.log(updatedPath + (queryString !== "" ? "?" : "") + queryString);

                return updatedPath + (queryString !== "" ? "?" : "") + queryString;
            }
        })(req, res);
    } catch (e) {
        renderError(res);
    }
}

function renderError(res, code = 404, message = "Unable to find the page", callback = false) {
    res.render("pages/error", {code: code, message: message, callback: callback});
}

app.get("/", async function (req, res) {
    await renderRoot(req, res);
});

app.post("/", async function (req, res) {
    try {
        await add(req.body.title);

        res.redirect("/?success=" + encodeURIComponent("The instance has been added to the list."));
    } catch (e) {
        res.redirect("/add?error=" + encodeURIComponent("Unable to add the instance."));
    }
})

app.get("/add", function (req, res) {
    renderAdd(req, res);
});

app.get("/manage/:id", function (req, res) {
    renderManage(req, res);
});

app.get("/manage/:id/:action", async function (req, res) {
    if (req.params.action === "start") {
        try {
            await start(req.params.id);

            res.redirect("/manage/" + req.params.id + "?success=" + encodeURIComponent("The instance is starting, please wait few minutes..."));
        } catch (e) {
            res.redirect("/manage/" + req.params.id + "?error=" + encodeURIComponent("Unable to start the instance."));
        }
    } else if (req.params.action === "stop") {
        try {
            const instance = await existsInstance(req.params.id);
            await stop(instance.id);

            res.redirect("/manage/" + req.params.id + "?success=" + encodeURIComponent("The instance is stopping, please wait few minutes..."));
        } catch (e) {
            res.redirect("/manage/" + req.params.id + "?error=" + encodeURIComponent("Unable to stop the instance."));
        }
    } else if (req.params.action === "clear") {
        try {
            const instance = await existsInstance(req.params.id);
            await clear(instance.id);

            res.redirect("/manage/" + req.params.id + "?success=" + encodeURIComponent("The instance being cleared, please wait few minutes..."));
        } catch (e) {
            res.redirect("/manage/" + req.params.id + "?error=" + encodeURIComponent("Unable to clear the instance."));
        }
    } else if (req.params.action === "delete") {
        try {
            const instance = await existsInstance(req.params.id);
            await deleteInstance(instance.id);

            res.redirect("/?success=" + encodeURIComponent("The instance is being delete, please wait few minutes..."));
        } catch (e) {
            res.redirect("/manage/" + req.params.id + "?error=" + encodeURIComponent("Unable to delete the instance."));
        }
    } else {
        res.redirect("/manage/" + req.params.id + "?error=" + encodeURIComponent("Invalid action."));
    }
});

app.get("/view/:id", function (req, res) {
    renderProxy(req, res);
});

app.get("/view/:id/*", function (req, res) {
    renderProxy(req, res);
});

const server = app.listen(port);

server.on('upgrade', async function (req, socket, head) {
    try {
        console.log("proxying upgrade request", req.url);

        const instanceId = req.url.replace("/", "");

        console.log(instanceId);

        const instance = await existsInstance(instanceId);

        if (!proxies[instanceId]) {
            proxies[instanceId] = httpProxy.createProxyServer({
                target: 'ws://localhost:' + instance.core_port,
                ws: true
            });

            proxies[instanceId].on('error', function (e) {
                console.log(JSON.stringify(e, null, ' '))
            });
        }

        proxies[instanceId].ws(req, socket, head);
    } catch (e) {
        console.log("Unable to connect to the web socket server: " + e);
    }
});

//API
async function getInstances() {
    return new Promise(function (resolve, reject) {
        db.all("SELECT * FROM instances", [], function (err, rows) {
            if (err) {
                reject();
            } else {
                resolve(rows);
            }
        });
    });
}

async function existsInstance(instanceId) {
    return new Promise(function (resolve, reject) {
        db.all("SELECT * FROM instances WHERE id = ?", [instanceId], function (err, rows) {
            if (err || rows.length < 1) {
                reject("This instance does not exists.");
            } else {
                resolve(rows[0]);
            }
        });
    });
}

async function getStatus(instanceId) {
    const {stdout, stderr} = await exec('scripts/status.sh ' + instanceId);

    if (stderr !== "") {
        throw new Error(stderr);
    }

    return JSON.parse(stdout);
}

async function getLogs(instanceId) {
    const {stdout, stderr} = await exec('scripts/logs.sh ' + instanceId);

    if (stderr !== "") {
        throw new Error(stderr);
    }

    return JSON.parse(stdout);
}

async function add(title) {
    const instances = await getInstances();

    let found;

    let instancePort;

    do {
        instancePort = Math.floor(Math.random() * 5001) + 5000; //port number between 5000 and 10000

        found = false;

        for (let i in instances) {
            if (instancePort === instances[i].port
                || instancePort === (instances[i].port + 1)) {
                found = true;
                break;
            }
        }
    } while (found)

    db.run("INSERT INTO instances (id, title, core_port, gui_port) VALUES (?, ?, ?, ?)",
        [uniqid(), title, instancePort, instancePort + 1]);
}

async function start(instanceId) {
    const instance = await existsInstance(instanceId);
    const {stdout, stderr} = await exec('scripts/start.sh ' + instanceId + ' ' + instance.core_port + ' ' + instance.gui_port);
    console.log("test", stdout, stderr);

    if (stderr !== "") {
        throw new Error(stderr);
    }
}

async function stop(instanceId) {
    const {stdout, stderr} = await exec('scripts/stop.sh ' + instanceId);
    console.log("test", stdout, stderr);

    if (stderr !== "") {
        throw new Error(stderr);
    }
}

async function clear(instanceId) {
    const {stdout, stderr} = await exec('scripts/clear.sh ' + instanceId);
    //console.log("test", stdout, stderr);

    if (stderr !== "") {
        throw new Error(stderr);
    }
}

async function deleteInstance(instanceId) {
    return new Promise(function (resolve, reject) {
        db.run("DELETE FROM instances WHERE id = ?", [instanceId]);
        clear(instanceId);

        resolve();
    });
}