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
    stage: null,
    init: function () {
        elements.stage = new Konva.Stage({
            container: 'container',
            width: window.innerWidth,
            height: window.innerHeight
        });

        elements.layer = new Konva.Layer();

        elements.stage.add(elements.layer);
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
                type: data.type,
                selected: data.selected,
                hover: data.hover
            };
        }
        else {
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
            }
            else {
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
                }
            }
            else {
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
                    }
                    else {
                        elements.list[id].mainElement.x(data.x + elements.list[id].mainElement.width() / 2);
                        elements.list[id].mainElement.y(data.y + elements.list[id].mainElement.height() / 2);
                    }
                }

                if (data.selected !== undefined) {
                    elements.list[id].selected = data.selected;

                    elements.selection(id);
                }
            }

            if (data.hover !== undefined) {
                elements.list[id].hover = data.hover;

                elements.selection(id);
            }

            elements.layer.draw();
        }
        else {
            elements.add(id, data);
        }
    },
    selection: function (id) {
        if (elements.list[id].selected !== null) {
            elements.list[id].mainElement.strokeWidth(5);
            elements.list[id].mainElement.stroke(mouses.get(elements.list[id].selected).style.backgroundColor);
        }
        else {
            elements.list[id].mainElement.strokeWidth(3);

            if (elements.list[id].hover !== null) {
                elements.list[id].mainElement.stroke(mouses.get(elements.list[id].hover).style.backgroundColor);
            }
            else {
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
    }
};

function memorySizeOf(obj) {
    var bytes = 0;

    function sizeOf(obj) {
        if(obj !== null && obj !== undefined) {
            switch(typeof obj) {
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
                    if(objClass === 'Object' || objClass === 'Array') {
                        for(var key in obj) {
                            if(!obj.hasOwnProperty(key)) continue;
                            sizeOf(obj[key]);
                        }
                    } else bytes += obj.toString().length * 2;
                    break;
            }
        }
        return bytes;
    }

    function formatByteSize(bytes) {
        if(bytes < 1024) return bytes + " bytes";
        else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
        else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
        else return(bytes / 1073741824).toFixed(3) + " GiB";
    }

    return formatByteSize(sizeOf(obj));
}

window.onload = function () {
    elements.init();

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

    socket.on("window", function (data) {
        console.log("window", data);
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
    });

    socket.emit("update.window", {width: window.innerWidth, height: window.innerHeight});
};