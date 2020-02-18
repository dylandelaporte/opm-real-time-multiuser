function connected (server_url, callback, keepConnection, connectedCallback, disconnectedCallback) {
    const socket = io.connect(server_url);

    socket._connectTimer = setTimeout(function() {
        console.log("timeout");

        socket.disconnect();

        callback(false);
    }, 2000);

    socket.on('connect', function() {
        console.log("connect");

        clearTimeout(socket._connectTimer);

        if (keepConnection) {
            callback(true, socket);

            if (connectedCallback) {
                connectedCallback();
            }
        }
        else {
            setTimeout(function () {
                socket.disconnect();
            }, 1000);
        }
    });

    socket.on("disconnect", function (reason) {
        console.log("disconnect", reason);

        callback(true);

        if (disconnectedCallback) {
            disconnectedCallback();
        }
    });

    socket.on("connect_error", function() {
        console.log("connection_error");

        clearTimeout(socket._connectTimer);

        socket.close();

        callback(false);
    });
}

//from https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie() {
    var user = getCookie("username");
    if (user != "") {
        alert("Welcome again " + user);
    } else {
        user = prompt("Please enter your name:", "");
        if (user != "" && user != null) {
            setCookie("username", user, 365);
        }
    }
}