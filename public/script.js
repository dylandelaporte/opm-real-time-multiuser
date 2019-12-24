const socket = io('http://172.16.53.119:3000');

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

        mouse.style.left = data.position.left + "px";
        mouse.style.top = data.position.top + "px";
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

        const layer = new Konva.Layer();
        layer.add(areaElement);
        layer.add(textElement);

        elements.stage.add(layer);

        elements.list[data.id] = {
            layer: layer,
            areaElement: areaElement,
            textElement: textElement
        };
    },
    update: function (data) {
        if (elements.list[data.id]) {
            elements.list[data.id].textElement.x(data.properties.x);
            elements.list[data.id].textElement.y(data.properties.y);

            elements.list[data.id].areaElement.x(data.properties.x);
            elements.list[data.id].areaElement.y(data.properties.y);

            if (data.properties.selected >= 0) {
                elements.list[data.id].areaElement.strokeWidth(5);
                elements.list[data.id].areaElement.stroke(mouses.list[data.properties.selected].style.backgroundColor);
            }
            else {
                elements.list[data.id].areaElement.strokeWidth(3);

                if (data.properties.hover >= 0) {
                    elements.list[data.id].areaElement.stroke(mouses.list[data.properties.hover].style.backgroundColor);
                }
                else {
                    elements.list[data.id].areaElement.stroke("#555555");
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

    socket.on("mouse", function (data) {
        //console.log(data.id);

        if (!mouses.list[data.id]) {
            mouses.add(data.id);
        }

        mouses.update(data);
    });

    //shape with text zone, arrow
    socket.on("element", function (data) {
        console.log("element", data);

        elements.update(data);
    });

    socket.on("window", function (data) {
        console.log("window", data);
    });

    socket.emit("window", {width: window.innerWidth, height: window.innerHeight});
};