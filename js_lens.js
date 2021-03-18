class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    setVals(x, y) {
        this.x = x;
        this.y = y;
    }
}

let circlePoints = {};
let bezierPoints = [];
const pointSize = 15;

let mainPlane = SVG().addTo("body").size(600, 600);

// eslint-disable-next-line no-unused-vars
function createLine() {
    let yCoords = [];
    for (let index in circlePoints) {
        yCoords.push(circlePoints[index].y);
    }
    if (yCoords.length < 2)
        return;

    let [minIdx, maxIdx] = argminAndArgmax(yCoords);
    let highPoint = circlePoints[minIdx + 1];
    let lowPoint = circlePoints[maxIdx + 1];

    mainPlane.line(highPoint.x + pointSize / 2, highPoint.y + pointSize / 2, 
                   lowPoint.x + pointSize / 2, lowPoint.y + pointSize / 2)
             .stroke({ width: 2, color: '#00a0f0' })
             .attr({ id: "line" });
}

// eslint-disable-next-line no-unused-vars
function onClickfrontCurve() {
    let pointsLength = Object.keys(circlePoints).length + 1;
    let len_not_1_or_4 = (pointsLength - 1) * (pointsLength - 4);
    let offset = 0;

    if (len_not_1_or_4)
        offset = 100;
        
    let x = 100 + offset;
    let y = pointsLength * 70 + 10;

    if (pointsLength <= 4)
        circlePoints[pointsLength] = new Point(x, y);
    else
        return;

    drawPoints(x, y, pointsLength);
}

function drawPoints(x, y, pointsLength) {
    const strokeWidth = 1;

    let attributes = {
        cx: x + pointSize / 2,
        cy: y + pointSize / 2,
        fill: "white",
        stroke: "#00f0a0",
        "stroke-width": strokeWidth,
        style: "cursor: pointer",
        id: `c-${pointsLength}`
    };

    let circle = mainPlane.circle(pointSize).attr(attributes);
    circle.draggable();
    circle.on('dragmove.namespace', circleDrag);

    calcBezierPoints(pointsLength);
    if (bezierPoints.length == 0)
        return;
    
    let o = pointSize / 2;
    let frontPathD = `M ${circlePoints[1].x + o} ${circlePoints[1].y + o} `;
    let point2 = `${circlePoints[2].x + o} ${circlePoints[2].y + o} `;
    let point3 = `${circlePoints[3].x + o} ${circlePoints[3].y + o} `;
    if (pointsLength == 3) {
        frontPathD += "Q " + point2 + point3;
    }
    else if (pointsLength == 4) {
        let point4 = `${circlePoints[4].x + o} ${circlePoints[4].y + o}`;
        frontPathD += "C " + point2 + point3 + point4;
    }
    else
        return;

    let frontPath = document.getElementById("frontCurve");
    if (frontPath)
        frontPath.parentNode.removeChild(frontPath);

    let line = document.getElementById("line");
    if (line)
        line.parentNode.removeChild(line);

    mainPlane.path(frontPathD).stroke({ width: 2, color: '#00a0f0' })
             .fill("none").id("frontCurve");
}

function circleDrag(event) {
    const { handler, box } = event.detail;

    event.preventDefault();

    let { x, y } = box;

    let circleId = event.currentTarget.id;
    let circleIdx = parseInt(circleId.split("-")[1]);

    [x, y] = calcXY(x, y, circleIdx, box);

    handler.move(x, y);

    circlePoints[circleIdx].setVals(x, y);

    let path = SVG("#frontCurve");
    if (!path)
        return;

    let frontPathD = path.attr("d").split(" ");
    let x_place = 0;

    if (circleIdx == 1)
        x_place = 1;
    else {
        x_place = circleIdx * 2;
    }

    x += box.w / 2;
    y += box.h / 2;

    frontPathD[x_place] = x;
    frontPathD[x_place + 1] = y;
    path.plot(frontPathD.join(" "));

    let line = SVG("#line");
    if (!line || circleIdx == 2 || circleIdx == 3)
        return;
    
    let lineCoords = line.array();
    let idx = Math.floor(circleIdx / 4);
    lineCoords[idx][0] = x;
    lineCoords[idx][1] = y;
    lineCoords = lineCoords[0].concat(lineCoords[1]);

    line.plot(...lineCoords);
}

function calcBezierPoints(pointsLength) {
    bezierPoints = [];
    let dt = 0.01;
    if (pointsLength == 3) {
        for (let t = 0; t < 1; t += dt) {
            let c1 = (1 - t) * (1 - t);
            let c2 = 2 * t * (1 - t);
            let c3 = t * t;

            let x = c1 * circlePoints[1].x + c2 * circlePoints[2].x 
                    + c3 * circlePoints[3].x;
            let y = c1 * circlePoints[1].y + c2 * circlePoints[2].y 
                    + c3 * circlePoints[3].y;
            bezierPoints.push(new Point(x, y));
        }
    }
    else if (pointsLength == 4) {
        for (let t = 0; t < 1; t += dt) {
            let c1 = (1 - t) * (1 - t) * (1 - t);
            let c2 = 3 * t * (1 - t) * (1 - t);
            let c3 = 3 * t * t * (1 - t);
            let c4 = t * t * t;

            let x = c1 * circlePoints[1].x + c2 * circlePoints[2].x 
                    + c3 * circlePoints[3].x + c4 * circlePoints[4].x;
            let y = c1 * circlePoints[1].y + c2 * circlePoints[2].y 
                    + c3 * circlePoints[3].y + c4 * circlePoints[4].y;
            bezierPoints.push(new Point(x, y));
        }
    }
    else {
        return;
    }
}

function argminAndArgmax(array) {
    let maxIdx = 0, minIdx = 0;
    let max = array[0], min = array[0];
    for (let i = 1; i < array.length; i++) {
        let element = array[i];
        if (element > max) {
            max = element;
            maxIdx = i;
        }
        else if (element < min) {
            min = element;
            minIdx = i;
        }
    }
    return [minIdx, maxIdx];
}

function calcXY(x, y, circleIdx, box) {
    // первое предположение: точек всегда > 2
    // второе: третья точка не находится справа последней
    const mainSVG = mainPlane.node;
    let prevCircle = circleIdx - 1;
    let nextCircle = circleIdx + 1;

    let pointsLength = Object.keys(circlePoints).length;

    if (circleIdx == 1) { // top
        let nextPoint = circlePoints[nextCircle];
        if (x < mainSVG.clientLeft)
            x = mainSVG.clientLeft;
        else if (box.x2 > nextPoint.x)
            x = nextPoint.x - box.w;

        if (y < mainSVG.clientTop)
            y = mainSVG.clientTop;
        else if (box.y2 > nextPoint.y)
            y = nextPoint.y - box.h;

        return [x, y];
    }
    else if (circleIdx == 2) {
        return calcXYMiddle(x, y, box, prevCircle, nextCircle, mainSVG);
    }
    else if (circleIdx == 3) {
        if (pointsLength == 3) {
            return calcXYLast(x, y, box, prevCircle, mainSVG);
        }
        else {
            return calcXYMiddle(x, y, box, prevCircle, nextCircle, mainSVG);
        }
    }
    else if (circleIdx == 4) {
        return calcXYLast(x, y, box, prevCircle, mainSVG);
    }
}

function calcXYMiddle(x, y, box, prevCircle, nextCircle, mainSVG) {
    let xMax = Math.max(circlePoints[1].x, circlePoints[4].x);
    if (x < xMax)
        x = xMax;
    else if (box.x2 > mainSVG.clientWidth)
        x = mainSVG.clientWidth - box.w;
    
    let prevPoint = circlePoints[prevCircle]
    let nextPoint = circlePoints[nextCircle];
    if (y < prevPoint.y + box.h)
        y = prevPoint.y + box.h;
    else if (y > nextPoint.y - box.h)
        y = nextPoint.y - box.h;
    
    return [x, y];
}

function calcXYLast(x, y, box, prevCircle, mainSVG) {
    let prevPoint = circlePoints[prevCircle];
    if (x < mainSVG.clientLeft)
        x = mainSVG.clientLeft;
    else if (box.x2 > prevPoint.x)
        x = prevPoint.x - box.w;

    if (box.y2 > mainSVG.clientHeight)
        y = mainSVG.clientHeight - box.h - 1;
    else if (y < prevPoint.y + box.h)
        y = prevPoint.y + box.h;
    return [x, y];
}