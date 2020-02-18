const server_url_cookie = "server_url";

let socket = null;

const container = {
    element: document.getElementById("container"),
    gap: {
        x: 0,
        y: 0
    },
    setXGap: function (x) {
        container.gap.x = x;
        container.element.style.marginLeft = x + "px";
    },
    setYGap: function (y) {
        container.gap.y = y;
        container.element.style.marginTop = y + "px";
    }
};

const mouses = {
    list: {},
    get: function (id) {
        if (!mouses.list[id]) {
            mouses.add(id);
        }

        return mouses.list[id];
    },
    add: function (id) {
        const mouseDiv = document.createElement("div");

        mouseDiv.classList.add("mouse-pointer", "fas", "fa-dot-circle");
        mouseDiv.style.color = intToHexadecimalColor(hashCode(id));

        mouseDiv.id = "pointer-" + id;

        document.body.appendChild(mouseDiv);

        mouses.list[id] = mouseDiv;
    },
    update: function (id, data) {
        const mouse = mouses.list[id];

        var regx = new RegExp('\\b' + "fa-" + '(.*)?\\b', 'g');
        mouse.className = mouse.className.replace(regx, '');

        if (data.click.left) {
            mouse.classList.add("fa-arrows-alt");
        }
        else if (data.click.right) {
            mouse.classList.add("fa-trash");
        }
        else {
            mouse.classList.add("fa-dot-circle");
        }

        /*
        mouse.x = data.left;
        mouse.y = data.top;

        const stageWidth = elements.stage.width();
        const stageWidthGap = parseInt(container.style.marginLeft);
        const windowWidth = window.innerWidth;

        //console.log(stageWidth, stageWidthGap, windowWidth);

        const gap = stageWidth - windowWidth + stageWidthGap;

        console.log(stageWidthGap);

        //it depends on the screen size
        if (window.innerWidth - mouses.gap.x - data.left < 50 && gap > 0) {
            console.log("right enter");

            let margin = gap < 10  ? gap : 10;

            container.style.marginLeft = (stageWidthGap - margin) + "px";

            mouses.gap.x -= margin;
        }
        else if (data.left - mouses.gap.x < 50 && stageWidthGap < 0) {
            console.log("left enter");

            const absStageWidthGap = Math.abs(stageWidthGap);

            let margin = absStageWidthGap < 10 ? absStageWidthGap : 10;

            container.style.marginLeft = (stageWidthGap + margin) + "px";

            mouses.gap.x -= margin;
        }
         */

        mouse.style.left = container.gap.x + data.left + "px";
        mouse.style.top = container.gap.y + data.top + "px";
    }
};

const elements = {
    list: {},
    layer: null,
    toolbarLayer: null,
    toolbar: {},
    stage: null,
    backgroundRect: null,
    setup: function (data) {
        if (elements.stage !== null) {
            if (elements.stage.width() !== data.width || elements.stage.height() !== data.height) {
                elements.stage.width(data.width);
                elements.stage.height(data.height);

                elements.backgroundRect.width(data.width);
                elements.backgroundRect.height(data.height);

                elements.layer.draw();
            }
        } else {
            elements.stage = new Konva.Stage({
                container: 'container',
                width: data.width,
                height: data.height
            });

            elements.layer = new Konva.Layer();

            elements.backgroundRect = new Konva.Rect({
                x: 0,
                y: 0,
                width: data.width,
                height: data.height,
                fill: "#FFFFFF"
            });

            elements.layer.add(elements.backgroundRect);

            elements.stage.add(elements.layer);

            container.element.style.marginLeft =  "0px";
        }

        //pixel gap
        console.log("gap", data.scrollWidth, data.scrollHeight);

        let xGap = data.scrollWidth;

        //console.log("xGap", xGap);

        const zoneToDisplay = data.width + xGap;

        //console.log("zoneToDisplay", zoneToDisplay);

        if (zoneToDisplay < window.innerWidth) {
            //console.log("yes");

            const freeWindowGap = window.innerWidth - zoneToDisplay;
            const freeZoneGap = data.width - zoneToDisplay;

            //console.log("freeWindowGap", freeWindowGap);
            //console.log("freeZoneGap", freeZoneGap);

            const temporaryXGap = xGap + (freeWindowGap > freeZoneGap ? freeZoneGap : freeWindowGap);

            //console.log("temporaryXGap", temporaryXGap);

            if (temporaryXGap <= 0) {
                xGap = temporaryXGap;
            }
        }

        container.setXGap(xGap);

        let yGap = data.scrollHeight;

        //console.log("yGap", yGap);

        const heightToDisplay = data.height + yGap;

        //console.log("heightToDisplay", heightToDisplay);

        if (heightToDisplay < window.innerHeight) {
            //console.log("yes height");

            const freeWindowGap = window.innerHeight - heightToDisplay;
            const freeZoneGap = data.height - heightToDisplay;

            //console.log("freeWindowGap", freeWindowGap);
            //console.log("freeZoneGap", freeZoneGap);

            const temporaryYGap = yGap + (freeWindowGap > freeZoneGap ? freeZoneGap : freeWindowGap);

            //console.log("temporaryXGap", temporaryYGap);

            if (temporaryYGap <= 0) {
                yGap = temporaryYGap;
            }
        }

        container.setYGap(yGap);

        console.log("final gap", xGap, yGap);

        //elements.updateToolbarOffset();
    },
    updateToolbar: function (data) {
        const buttons = Object.keys(data);

        if (!elements.toolbarLayer) {
            elements.toolbarLayer = new Konva.Layer();
            elements.stage.add(elements.toolbarLayer);
        }

        for (let i = 0; i < buttons.length; i++) {
            if (elements.toolbar[buttons[i]]) {

            }
            else {
                console.log(data[buttons[i]]);

                const button = new Konva.Label({
                    x: data[buttons[i]].x,
                    y: data[buttons[i]].y,
                    opacity: 0.75
                });

                button.add(new Konva.Tag({
                    fill: 'black',
                    lineJoin: 'round',
                    shadowColor: 'black',
                    shadowBlur: 10,
                    shadowOffset: 10,
                    shadowOpacity: 0.5
                }));

                button.add(new Konva.Text({
                    width: data[buttons[i]].width,
                    height: data[buttons[i]].height,
                    text: data[buttons[i]].text,
                    fontFamily: 'Arial',
                    fontSize: 18,
                    padding: 5,
                    fill: 'white'
                }));

                elements.toolbar[buttons[i]] = button;

                elements.toolbarLayer.add(button);
            }
        }

        elements.toolbarLayer.draw();

        //elements.updateToolbarOffset();
    },
    updateToolbarOffset: function () {
        if (elements.toolbarLayer) {
            elements.toolbarLayer.offsetX(container.gap.x);
            elements.toolbarLayer.offsetY(container.gap.y);

            elements.toolbarLayer.draw();
        }
    },
    add: function (id, data) {
        //const layer = new Konva.Layer();

        if (data.type.indexOf("arrow") >= 0) {
            const positions = data.positions;

            const lineElement = new Konva.Line({
                points: positions,
                stroke: 'black',
                strokeWidth: 3,
                lineCap: 'round',
                lineJoin: 'round'
            });

            elements.layer.add(lineElement);

            elements.list[id] = {
                mainElement: lineElement,
                nodeElements: [],
                type: data.type,
                selected: data.selected,
                hover: data.hover
            };

            elements.updateNodes(id, data);
        } else {
            const textElement = new Konva.Text({
                x: data.x,
                y: data.y + 22,
                text: data.text,
                fontSize: 18,
                fontFamily: 'Calibri',
                fill: '#555',
                width: data.width,
                align: 'center'
            });

            let areaElement;

            if (data.type === "object") {
                areaElement = new Konva.Rect({
                    x: data.x,
                    y: data.y,
                    fill: '#ffffff',
                    width: data.width,
                    height: data.height,
                    shadowColor: 'black',
                    shadowBlur: 5,
                    shadowOffsetX: 5,
                    shadowOffsetY: 5,
                    shadowOpacity: 0.1,
                    cornerRadius: 2
                });
            } else {
                areaElement = new Konva.Ellipse({
                    x: data.x + data.width / 2,
                    y: data.y + data.height / 2,
                    width: data.width,
                    height: data.height,
                    fill: '#ffffff'
                });
            }

            elements.layer.add(areaElement);
            elements.layer.add(textElement);

            elements.list[id] = {
                mainElement: areaElement,
                textElement: textElement,
                type: data.type,
                x: data.x,
                y: data.y,
                selected: data.selected,
                hover: data.hover
            };

            elements.selection(id);
        }

        elements.layer.draw();
    },
    update: function (id, data) {
        if (elements.list[id]) {
            if (data.deleted) {
                elements.list[id].mainElement.destroy();

                if (elements.list[id].type.indexOf("arrow") >= 0) {
                    for (let i = 0; i < elements.list[id].nodeElements.length; i++) {
                        elements.list[id].nodeElements[i].destroy();
                    }
                }
                else {
                    elements.list[id].textElement.destroy();
                }

                delete elements.list[id];
            } else {
                if (elements.list[id].type.indexOf("arrow") >= 0) {
                    if (data.positions) {
                        elements.list[id].mainElement.points(data.positions);

                        elements.updateNodes(id, data);
                    }
                } else {
                    if (data.text !== undefined) {
                        elements.list[id].textElement.text(data.text);
                    }

                    if (data.width !== undefined) {
                        elements.list[id].textElement.width(data.width);

                        elements.list[id].mainElement.width(data.width);

                        data.x = elements.list[id].x;
                        data.y = elements.list[id].y;
                    }

                    if (data.height !== undefined) {
                        elements.list[id].mainElement.height(data.height);

                        data.x = elements.list[id].x;
                        data.y = elements.list[id].y;
                    }

                    if (data.x !== undefined  && data.y !== undefined) {
                        elements.list[id].x = data.x;
                        elements.list[id].y = data.y;

                        elements.list[id].textElement.x(data.x);
                        elements.list[id].textElement.y(data.y + 22);

                        if (elements.list[id].type === "object") {
                            elements.list[id].mainElement.x(data.x);
                            elements.list[id].mainElement.y(data.y);
                        } else {
                            elements.list[id].mainElement.x(data.x + elements.list[id].mainElement.width() / 2);
                            elements.list[id].mainElement.y(data.y + elements.list[id].mainElement.height() / 2);
                        }
                    }
                }

                if (data.selected !== undefined) {
                    elements.list[id].selected = data.selected;

                    elements.selection(id);
                }

                if (data.hover !== undefined) {
                    elements.list[id].hover = data.hover;

                    elements.selection(id);
                }
            }

            elements.layer.draw();
        } else {
            elements.add(id, data);
        }
    },
    selection: function (id) {
        if (elements.list[id].selected !== null) {
            elements.list[id].mainElement.strokeWidth(5);
            elements.list[id].mainElement.stroke(mouses.get(elements.list[id].selected).style.color);
        } else {
            elements.list[id].mainElement.strokeWidth(3);

            if (elements.list[id].hover !== null) {
                elements.list[id].mainElement.stroke(mouses.get(elements.list[id].hover).style.color);
            } else {
                switch (elements.list[id].type) {
                    case "object":
                        elements.list[id].mainElement.stroke("#2e923b");
                        break;
                    case "process":
                        elements.list[id].mainElement.stroke("#1b2399");
                        break;
                    default:
                        elements.list[id].mainElement.stroke("#000000");
                }
            }
        }
    },
    updateNodes: function (id, data) {
        console.log("updateNodes", data.positions);

        let nodeElements = elements.list[id].nodeElements;

        console.log(nodeElements);

        const difference = (data.positions.length / 2) - (nodeElements.length + 2);

        console.log(difference);

        if (difference > 0) {
            for (let i = 0; i < difference; i++) {
                const nodeElement = new Konva.Circle({
                    x: 0,
                    y: 0,
                    radius: 5,
                    fill: "black"
                });

                nodeElements.push(nodeElement);

                elements.layer.add(nodeElement);
            }
        } else if (difference < 0) {
            for (let i = 0; i < Math.abs(difference); i++) {
                nodeElements[0].destroy();
                nodeElements.shift();
            }
        }

        console.log(nodeElements);

        for (let i = 0; i < nodeElements.length; i++) {
            nodeElements[i].x(data.positions[i * 2 + 2]);
            nodeElements[i].y(data.positions[i * 2 + 3]);
        }
    }
};

function connect(server_url) {
    socket = io.connect(server_url);

    let connected = false;
    let currentMode = 0;

    socket.on("connect", function () {
        console.log("connected");

        if (connected) {
            //console.log("already connected");
            location.reload();
        }

        connected = true;

        firstContact();
    });

    socket.on("disconnect", function () {
        console.log("disconnected");
    });

    socket.on("data", function (data) {
        console.log("data", data);

        if (data.g) {
            if (data.g.mode === 0) {
                if (currentMode === 1) {
                    location.reload();
                }
            }
            else {
                container.element.style.display = "none";

                document.getElementById("alert-mode").style.display = "";
            }

            currentMode = 1;
        }

        if (data.m) {
            if (!mouses.list[data.id]) {
                mouses.add(data.id);
            }

            mouses.update(data.id, data.m);
        }

        if (data.w) {
            elements.setup(data.w);
        }

        if (data.t) {
            elements.updateToolbar(data.t);
        }

        if (data.e) {
            const elementIds = Object.keys(data.e);

            if (data.e[0]) {
                console.log(data.e[0]);
            }

            for (let i = 0; i < elementIds.length; i++) {
                elements.update(elementIds[i], data.e[elementIds[i]]);
            }
        }
    });
}

function firstContact() {
    socket.emit("first.contact");
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

function addTemporaryUser() {
    socket.emit("set.user", {id: "bob", mouse: "/dev/hidraw0", keyboard: "/dev/hidraw1"});
}

function memorySizeOf(obj) {
    var bytes = 0;

    function sizeOf(obj) {
        if (obj !== null && obj !== undefined) {
            switch (typeof obj) {
                case 'number':
                    bytes += 8;
                    break;
                case 'string':
                    bytes += obj.length * 2;
                    break;
                case 'boolean':
                    bytes += 4;
                    break;
                case 'object':
                    var objClass = Object.prototype.toString.call(obj).slice(8, -1);
                    if (objClass === 'Object' || objClass === 'Array') {
                        for (var key in obj) {
                            if (!obj.hasOwnProperty(key)) continue;
                            sizeOf(obj[key]);
                        }
                    } else bytes += obj.toString().length * 2;
                    break;
            }
        }
        return bytes;
    }

    function formatByteSize(bytes) {
        if (bytes < 1024) return bytes + " bytes";
        else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + " KiB";
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + " MiB";
        else return (bytes / 1073741824).toFixed(3) + " GiB";
    }

    return formatByteSize(sizeOf(obj));
}

window.onload = function () {
    const server_url = getCookie(server_url_cookie);

    if (server_url !== "") {
        connect(server_url);
    }
    else {
        console.log("unable to connect to the server");
    }
};