function connected (server_url, callback, keepConnection, connectedCallback, disconnectedCallback) {
    const socket = new WebSocket(server_url);

    socket.opened = false;

    socket._connectTimer = setTimeout(function() {
        console.log("timeout");

        socket.close();

        callback(false);
    }, 2000);

    socket.onopen = function() {
        console.log("connected");

        socket.opened = true;

        clearTimeout(socket._connectTimer);

        //if (keepConnection) {
            callback(true, socket);

            if (connectedCallback) {
                connectedCallback();
            }
        /*}
        else {
            setTimeout(function () {
                socket.close();
            }, 1000);
        }*/
    };

    socket.onclose = function (reason) {
        console.log("disconnect", reason);

        if (socket.opened) {
            socket.opened = false;

            callback(false);

            if (disconnectedCallback) {
                disconnectedCallback();
            }
        }
    };

    socket.onerror = function() {
        console.log("connection_error");

        clearTimeout(socket._connectTimer);

        socket.opened = false;
        socket.close();

        callback(false);
    };
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

//from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() {
    return 'xxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getColorFromId(id) {
    return intToHexadecimalColor(hashCode(id));
}

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToHexadecimalColor(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "#" + "00000".substring(0, 6 - c.length) + c;
}