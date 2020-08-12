var httpProxy = require('http-proxy'),
    express = require('express');

// create a server
var app = express();


const server = app.listen(9000);
server.on('upgrade', function (req, socket, head) {
    console.log("proxying upgrade request", req.url);

    var proxy = httpProxy.createProxyServer({target: 'ws://localhost:3032', ws: true})
        .on('error', function (e) {
            console.log(JSON.stringify(e, null, ' '))
        });

    proxy.ws(req, socket, head);
});

// serve static content
app.use('/', express.static(__dirname + "/public"));