const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware'); // require('http-proxy-middleware');

/**
 * Configure proxy middleware
 */
const wsProxy = createProxyMiddleware('/', {
    target: 'http://localhost:6398',
    // pathRewrite: {
    //  '^/websocket' : '/socket',        // rewrite path.
    //  '^/removepath' : ''               // remove path.
    // },
    changeOrigin: true, // for vhosted sites, changes host header to match to target's host
    ws: true, // enable websocket proxy
    logLevel: 'debug',
});

const app = express();
app.use('/', express.static(__dirname)); // demo page
app.use(wsProxy); // add the proxy to express

const server = app.listen(3031);
server.on('upgrade', wsProxy.upgrade); // optional: upgrade externally

console.log('[DEMO] Server: listening on port 3000');
console.log('[DEMO] Opening: http://localhost:3000');