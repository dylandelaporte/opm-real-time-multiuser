const controls = {
    cookie_id: "controls_id",
    cookie_status: "controls_status",
    id: null,
    enabled: false,
    socket: null,
    mouse: {x: 0, y: 0, click: 0},
    first: false,
    second: false
};

controls.setup = function (socket, userId, enabled, autoSetup) {
    console.log("controls.setup", userId, enabled, autoSetup);

    controls.setId();

    /*
    if (getCookie(controls.cookie_status) === "true") {
        controls.id = getCookie(controls.cookie_id);
        controls.enabled = true;
        controls.socket = socket;
    }*/

    if (enabled) {
        controls.id = getCookie(controls.cookie_id);
        controls.enabled = true;
        controls.socket = socket;
    }

    if (autoSetup) {
        socket.send(JSON.stringify({
            type: "set.user",
            id: userId,
            mouse: controls.getMouseId(),
            keyboard: controls.getKeyboardId()
        }));
    }
};

controls.getMouseId = function () {
    return controls.id + "/mouse";
};

controls.getKeyboardId = function () {
    return controls.id + "/keyboard";
};


controls.isEnabled = function (saved) {
    return /*saved ? (getCookie(controls.cookie_status) === "true") :*/ controls.enabled;
};

controls.enable = function (save) {
    controls.enabled = true;

    /*
    if (save) {
        setCookie(controls.cookie_status, "true", 10);
    }*/
};

controls.disable = function (save) {
    controls.enabled = false;

    /*
    if (save) {
        setCookie(controls.cookie_status, "false", 10);
    }*/
};

controls.isFirst = function () {
    return controls.first;
};

controls.setFirst = function (x, y) {
    controls.mouse.x = x;
    controls.mouse.y = y;

    controls.first = true;
};

controls.setId = function () {
    if (getCookie(controls.cookie_id) === "") {
        setCookie(controls.cookie_id, uuidv4(), 100);
    }
};

window.onmousedown = function (e) {
    if (controls.enabled) {
        console.log("mousedown", e.button);

        if (e.button === 0) {
            controls.mouse.click = 1;
        }

        controls.socket.send(JSON.stringify({
            type: "mouse",
            path: controls.getMouseId(),
            data: [e.buttons, 0, 0, 0]
        }));
    }
};

window.onmouseup = function (e) {
    if (controls.enabled) {
        console.log("mouseup", e.button);

        if (e.button === 0) {
            controls.mouse.click = 0;
        }

        controls.socket.send(JSON.stringify({
            type: "mouse",
            path: controls.getMouseId(),
            data: [controls.mouse.click, 0, 0, 0]
        }));
    }
};

window.onmousewheel = function (e) {
    if (controls.enabled) {
        let deltaX = e.deltaX;
        let deltaY = e.deltaY;

        if (deltaX < 0) {
            deltaX = 256 - deltaX;
        }

        if (deltaY < 0) {
            deltaY = 256 - deltaY;
        }

        console.log("mouse wheel", [0, 0, 0, deltaX], [4, 0, 0, deltaY]);
    }
};

document.getElementById("container").onmousemove = function (e) {
    if (controls.enabled) {
        if (!controls.isFirst()) {
            controls.setFirst(e.clientX, e.clientY);

            controls.socket.send(JSON.stringify({
                type: "mouse",
                path: controls.getMouseId(),
                data: [controls.mouse.click, e.clientX, e.clientY, 0, 0]
            }));
        } else {
            let gapX = e.clientX - controls.mouse.x;
            let gapY = e.clientY - controls.mouse.y;

            if (gapX < 0) {
                gapX = 256 + gapX;
            }

            if (gapY < 0) {
                gapY = 256 + gapY;
            }

            //console.log("mouse move", [0, gapX, gapY, 0]);

            controls.socket.send(JSON.stringify({
                type: "mouse",
                path: controls.getMouseId(),
                data: [controls.mouse.click, e.clientX, e.clientY, 0, 0/*gapX, gapY, 0*/]
            }));

            controls.mouse.x = e.clientX;
            controls.mouse.y = e.clientY;
        }
    }
};

document.getElementById("container").addEventListener("mouseenter", function (e) {
    if (controls.enabled) {
        console.log("onmouseenter", e);

        controls.setFirst(e.clientX, e.clientY);

        controls.socket.send(JSON.stringify({
            type: "mouse",
            path: controls.getMouseId(),
            data: [controls.mouse.click, e.clientX, e.clientY, 0, 0]
        }));

        controls.second = true;
    }
});

window.onkeydown = function (e) {
    if (controls.enabled) {
        let key = null;

        if (e.key.length < 2 && e.key !== " ") {
            key = e.key;
        } else {
            switch (e.key) {
                case " ":
                    key = "SPACE";
                    break;
                case "Tab":
                    key = "TAB";
                    break;
                case "Control":
                    key = "CONTROL";
                    break;
                case "Enter":
                    key = "ENTER";
                    break;
                case "Backspace":
                    key = "DELETE";
                    break;
                /*case "CapsLock":
                    key = "LOCK";
                    break;*/
                case "ArrowLeft":
                    key = "LEFT";
                    break;
                case "ArrowRight":
                    key = "RIGHT";
                    break;
                case "ArrowUp":
                    key = "UP";
                    break;
                case "ArrowDown":
                    key = "DOWN";
                    break;
            }
        }

        console.log("keyboard keydown", e.shiftKey, key);

        controls.socket.send(JSON.stringify({
            type: "keyboard",
            path: controls.getKeyboardId(),
            data: [e.shiftKey, key]
        }));
    }
};