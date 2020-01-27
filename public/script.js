const socket = io('http://172.16.53.116:3000');

const mouses = {
    list: {},
    color: ["#D2691E", "#4C99FF"],
    get: function (id) {
        if (!mouses.list[id]) {
            mouses.add(id);
        }

        return mouses.list[id];
    },
    add: function (id) {
        const mouseDiv = document.createElement("div");

        mouseDiv.classList.add("mouse-pointer");
        mouseDiv.style.backgroundColor = mouses.color[Object.keys(mouses.list).length];

        mouseDiv.id = "pointer-" + id;

        document.body.appendChild(mouseDiv);

        mouses.list[id] = mouseDiv;
    },
    update: function (id, data) {
        const mouse = mouses.list[id];

        mouse.style.borderLeft = data.click.left ? "2px solid black" : "0";
        mouse.style.borderRight = data.click.right ? "2px solid black" : "0";

        mouse.style.left = data.left + "px";
        mouse.style.top = data.top + "px";
    }
};

const elements = {
    list: {},
    layer: null,
    toolbar: {},
    stage: null,
    init: function (data) {
        if (elements.stage !== null) {
            elements.stage.width(data.width);
            elements.stage.height(data.height);

            document.getElementById("container").marginLeft = ((window.innerWidth - data.width) / 2) + "px";
        } else {
            elements.stage = new Konva.Stage({
                container: 'container',
                width: data.width,
                height: data.height
            });

            const layer = new Konva.Layer();
            layer.add(new Konva.Rect({
                x: 0,
                y: 0,
                width: data.width,
                height: data.height,
                fill: "#FFFFFF"
            }));

            elements.stage.add(layer);

            elements.layer = new Konva.Layer();

            elements.stage.add(elements.layer);

            document.getElementById("container").style.marginLeft =
                ((window.innerWidth - data.width) / 2) + "px";
        }
    },
    updateToolbar: function (data) {
        const buttons = Object.keys(data);

        console.log(buttons, data);

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

                elements.layer.add(button);
            }
        }

        elements.layer.draw();
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
                selected: data.selected,
                hover: data.hover
            };

            elements.selection(id);
        }

        elements.layer.draw();
    },
    update: function (id, data) {
        if (elements.list[id]) {
            if (elements.list[id].type.indexOf("arrow") >= 0) {
                if (data.positions) {
                    elements.list[id].mainElement.points(data.positions);

                    elements.updateNodes(id, data);
                }
            } else {
                if (data.text) {
                    elements.list[id].textElement.text(data.text);
                }

                if (data.width) {
                    elements.list[id].textElement.width(data.width);

                    elements.list[id].mainElement.width(data.width);
                }

                if (data.height) {
                    elements.list[id].mainElement.height(data.height);
                }

                if (data.x && data.y) {
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

            elements.layer.draw();
        } else {
            elements.add(id, data);
        }
    },
    selection: function (id) {
        if (elements.list[id].selected !== null) {
            elements.list[id].mainElement.strokeWidth(5);
            elements.list[id].mainElement.stroke(mouses.get(elements.list[id].selected).style.backgroundColor);
        } else {
            elements.list[id].mainElement.strokeWidth(3);

            if (elements.list[id].hover !== null) {
                elements.list[id].mainElement.stroke(mouses.get(elements.list[id].hover).style.backgroundColor);
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

function resize() {
    socket.emit("update.window", {width: window.innerWidth, height: window.innerHeight});
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
    let connected = false;

    socket.on("connect", function () {
        console.log("connected");

        if (connected) {
            location.reload();
        }

        connected = true;

        socket.emit("set.user", {id: "bob", mouse: "/dev/hidraw0", keyboard: "none"})
    });

    socket.on("disconnect", function () {
        console.log("disconnected");
    });

    socket.on("mouse", function (data) {
        console.log("mouse");

        /*
        if (!mouses.list[data.id]) {
            mouses.add(data.id);
        }

        mouses.update(data);
         */
    });

    socket.on("user", function (data) {
        console.log("user");

        //console.log("user", data);
    });

    //shape with text zone, arrow
    socket.on("element", function (data) {
        console.log("element");

        //console.log("element", data);
        //console.log(data, memorySizeOf(data));

        //elements.update(data);
    });

    socket.on("devices", function (data) {
        console.log("devices", data);
    });

    socket.on("data", function (data) {
        console.log("data", data);

        if (data.m) {
            if (!mouses.list[data.id]) {
                mouses.add(data.id);
            }

            mouses.update(data.id, data.m);
        }

        if (data.e) {
            const elementIds = Object.keys(data.e);

            for (let i = 0; i < elementIds.length; i++) {
                elements.update(elementIds[i], data.e[elementIds[i]]);
            }
        }

        if (data.w) {
            elements.init(data.w);
        }

        if (data.t) {
            elements.updateToolbar(data.t);
        }
    });

    resize();
};

window.onresize = function () {
    resize();
};