const socket = io('http://172.16.53.116:3000');

const mouses = {
    list: {},
    color: ["#D2691E", "#4C99FF"],
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
                stroke: 'red',
                strokeWidth: 2,
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
                y: data.properties.y,
                text: data.properties.text,
                fontSize: 18,
                fontFamily: 'Calibri',
                fill: '#555',
                width: data.properties.width,
                padding: 20,
                align: 'center'
            });

            const areaElement = new Konva.Rect({
                x: data.properties.x,
                y: data.properties.y,
                stroke: '#555',
                strokeWidth: 3,
                fill: '#ddd',
                width: data.properties.width,
                height: data.properties.height,
                shadowColor: 'black',
                shadowBlur: 10,
                shadowOffsetX: 10,
                shadowOffsetY: 10,
                shadowOpacity: 0.2,
                cornerRadius: 5
            });

            layer.add(areaElement);
            layer.add(textElement);

            elements.list[data.id] = {
                layer: layer,
                areaElement: areaElement,
                textElement: textElement
            };
        }

        elements.stage.add(layer);
    },
    update: function (data) {
        if (elements.list[data.id]) {
            if (data.properties.type.indexOf("arrow") >= 0) {
                elements.list[data.id].lineElement.points(data.properties.positions);
            }
            else {
                elements.list[data.id].textElement.x(data.properties.x);
                elements.list[data.id].textElement.y(data.properties.y);

                elements.list[data.id].areaElement.x(data.properties.x);
                elements.list[data.id].areaElement.y(data.properties.y);

                if (data.properties.selected !== null) {
                    elements.list[data.id].areaElement.strokeWidth(5);
                    elements.list[data.id].areaElement.stroke(mouses.list[data.properties.selected].style.backgroundColor);
                }
                else {
                    elements.list[data.id].areaElement.strokeWidth(3);

                    if (data.properties.hover !== null) {
                        elements.list[data.id].areaElement.stroke(mouses.list[data.properties.hover].style.backgroundColor);
                    }
                    else {
                        elements.list[data.id].areaElement.stroke("#555555");
                    }
                }
            }

            elements.list[data.id].layer.draw();
        }
        else {
            elements.add(data);
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

        socket.emit("new.user", {id: "bob", mouse: "/dev/hidraw0", keyboard: "none"})
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