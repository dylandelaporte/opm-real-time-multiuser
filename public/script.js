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
    update: function (data) {
        const mouse = mouses.list[data.id];

        mouse.style.borderLeft = data.properties.click.left ? "2px solid black" : "0";
        mouse.style.borderRight = data.properties.click.right ? "2px solid black" : "0";

        mouse.style.left = data.properties.left + "px";
        mouse.style.top = data.properties.top + "px";
    }
};

const elements = {
    list: {},
    stage: null,
    init: function () {
        elements.stage = new Konva.Stage({
            container: 'container',
            width: window.innerWidth,
            height: window.innerHeight
        });
    },
    add: function (data) {
        const layer = new Konva.Layer();

        if (data.properties.type.indexOf("arrow") >= 0) {
            const positions = data.properties.positions;

            const lineElement = new Konva.Line({
                points: positions,
                stroke: 'black',
                strokeWidth: 5,
                lineCap: 'round',
                lineJoin: 'round'
            });

            layer.add(lineElement);

            elements.list[data.id] = {
                layer: layer,
                lineElement: lineElement,
            };
        }
        else {
            const textElement = new Konva.Text({
                x: data.properties.x,
                y: data.properties.y + 22,
                text: data.properties.text,
                fontSize: 18,
                fontFamily: 'Calibri',
                fill: '#555',
                width: data.properties.width,
                align: 'center'
            });

            const areaElement = new Konva.Rect({
                x: data.properties.x,
                y: data.properties.y,
                strokeWidth: 2,
                stroke: "#000",
                fill: '#ffffff',
                width: data.properties.width,
                height: data.properties.height,
                shadowColor: 'black',
                shadowBlur: 5,
                shadowOffsetX: 5,
                shadowOffsetY: 5,
                shadowOpacity: 0.1,
                cornerRadius: 2
            });

            layer.add(areaElement);
            layer.add(textElement);

            elements.list[data.id] = {
                layer: layer,
                areaElement: areaElement,
                textElement: textElement
            };

            elements.selection(data);
        }

        elements.stage.add(layer);
    },
    update: function (data) {
        if (elements.list[data.id]) {
            if (data.properties.type.indexOf("arrow") >= 0) {
                elements.list[data.id].lineElement.points(data.properties.positions);
            }
            else {
                console.log(data.properties.width, data.properties.text, data.properties.hover, data.properties.selected);

                elements.list[data.id].textElement.x(data.properties.x);
                elements.list[data.id].textElement.y(data.properties.y + 22);

                elements.list[data.id].textElement.width(data.properties.width);

                elements.list[data.id].textElement.text(data.properties.text);

                elements.list[data.id].areaElement.x(data.properties.x);
                elements.list[data.id].areaElement.y(data.properties.y);

                elements.list[data.id].areaElement.width(data.properties.width);
                elements.list[data.id].areaElement.height(data.properties.height);

                elements.selection(data);
            }

            elements.list[data.id].layer.draw();
        }
        else {
            elements.add(data);
        }
    },
    selection: function (data) {
        console.log(data, data.properties.selected);

        if (data.properties.selected !== null) {
            elements.list[data.id].areaElement.strokeWidth(5);
            elements.list[data.id].areaElement.stroke(mouses.get(data.properties.selected).style.backgroundColor);
        }
        else {
            elements.list[data.id].areaElement.strokeWidth(3);

            if (data.properties.hover !== null) {
                elements.list[data.id].areaElement.stroke(mouses.get(data.properties.hover).style.backgroundColor);
            }
            else {
                if (data.properties.type === "object") {
                    elements.list[data.id].areaElement.stroke("#2e923b");
                }
            }
        }
    }
};

window.onload = function () {
    elements.init();

    let connected = false;

    socket.on("connect", function () {
        console.log("connected");

        if (connected) {
            location.reload();
        }

        connected = true;

        socket.emit("set.user", {id: "bob", mouse: "/dev/hidraw0", keyboard: "/dev/hidraw2"})
    });

    socket.on("disconnect", function () {
        console.log("disconnected");
    });

    socket.on("mouse", function (data) {
        //console.log(data.id);

        if (!mouses.list[data.id]) {
            mouses.add(data.id);
        }

        mouses.update(data);
    });

    socket.on("user", function (data) {
        console.log("user", data);
    });

    //shape with text zone, arrow
    socket.on("element", function (data) {
        console.log("element", data);

        elements.update(data);
    });

    socket.on("window", function (data) {
        console.log("window", data);
    });

    socket.on("devices", function (data) {
        console.log("devices", data);
    });

    socket.emit("update.window", {width: window.innerWidth, height: window.innerHeight});
};