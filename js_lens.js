/* global SVG */

class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    setVals(x, y) {
        this.x = x;
        this.y = y;
    }
}

class PathInfo {
    constructor(id, pathD, backCurveIdx,
                frontCurveIdx, botLineIdx=-1, topLineIdx=-1) {
        this.id = id + "-path";
        this.pathD = pathD;
        this.backCurveIdx = backCurveIdx;
        this.frontCurveIdx = frontCurveIdx;
        if (botLineIdx != -1)
            this.botLineIdx = botLineIdx;
        if (topLineIdx != -1)
            this.topLineIdx = topLineIdx;
    }
    getSegmentPoint(segmentIdx, pointIdx) {
        if (segmentIdx < 0 || segmentIdx >= this.pathD.length) {
            console.error("getSegmentPoint: wrong segment index: ", segmentIdx);
            return null;
        }
        if (pointIdx < 1 || pointIdx >= (this.pathD[segmentIdx].length + 1) / 2) {
            console.error("getSegmentPoint: wrong point index: ", pointIdx);
            return null;
        }
        return new Point(this.pathD[segmentIdx][pointIdx * 2 - 1],
                         this.pathD[segmentIdx][pointIdx * 2]);
    }
    setSegmentPoint(segmentIdx, pointIdx, x, y) {
        if (segmentIdx < 0 || segmentIdx >= this.pathD.length) {
            console.error("setSegmentPoint: wrong segment index: ", segmentIdx);
            return;
        }
        if (pointIdx < 1 || pointIdx >= (this.pathD[segmentIdx].length + 1) / 2) {
            console.error("setSegmentPoint: wrong point index: ", pointIdx);
            return;
        }
        this.pathD[segmentIdx][pointIdx * 2 - 1] = x;
        this.pathD[segmentIdx][pointIdx * 2] = y;
    }
    getSegmentLengthInPoints(segmentIdx) {
        if (segmentIdx < 0 || segmentIdx >= this.pathD.length) {
            console.error("setSegmentPoint: wrong segment index: ", segmentIdx);
            return -1;
        }
        return parseInt(this.pathD[segmentIdx].length - 1) / 2;
    }
    updatePathD(pathD) {
        this.pathD = pathD;
    }
    plot() {
        let path = SVG("#" + this.id);
        path.plot(this.pathD);
    }
}

class LensInfo {
    constructor(id) {
        this.id = id + "-" + LensInfo.count++;
        this.path;
        this.circles = [];
        this.bezierPointsBack = [];
        this.bezierPointsFront = [];
    }
    setPath(pathD, backCurveIdx, frontCurveIdx,
            botLineIdx=-1, topLineIdx=-1) {
        this.path = new PathInfo(this.id, pathD, backCurveIdx,
                                 frontCurveIdx, botLineIdx, topLineIdx);
    }
    createPoints() {
        let lensId = this.id;
        let pathD = this.path.pathD;
        let cx, cy, segment, circleIdx;

        for (let i = 0; i < pathD.length; i++) {
            if (pathD[i][0] == "M") {
                circleIdx = 1;
                segment = "back-";
                cx = pathD[i][1];
                cy = pathD[i][2];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
            else if (pathD[i][0] == "C") {
                segment = i == this.path.backCurveIdx ? "back-" : "front-";
                for (let j = 1; j < pathD[i].length; j += 2) {
                    cx = pathD[i][j];
                    cy = pathD[i][j + 1];
                    this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
                }
            }
            else if (pathD[i][0] == "H" && i != pathD.length - 1) {
                circleIdx = 1;
                segment = segment == "back-" ? "front-" : "back-";
                cx = pathD[i][1];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
            else if (pathD[i][0] == "V" && i != pathD.length - 1) {
                cy = pathD[i][1];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
            else if (pathD[i][0] == "L" && i != pathD.length - 1) {
                circleIdx = 1;
                segment = segment == "back-" ? "front-" : "back-";
                cx = pathD[i][1];
                cy = pathD[i][2];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
        }
    }
    createCircle(cx, cy, id) {
        let attributes = {
            cx: cx,
            cy: cy,
            fill: "white",
            stroke: "#189ab4",
            "stroke-width": 2.5,
            style: "cursor: pointer",
            id: id
        };
        let circle = mainPlane.circle(pointSize).attr(attributes);
        circle.draggable();
        circle.on('dragmove.namespace', circleDrag);
        this.circles.push(circle)
    }
    calcBezierPointsBack() {
        if (this.path.getSegmentLengthInPoints(this.path.backCurveIdx) == 3);
            this.bezierPointsBack = this.calcBezierPoints(this.circles.slice(0, 4));
    }
    calcBezierPointsFront() {
        if (this.path.getSegmentLengthInPoints(this.path.frontCurveIdx) == 3);
            this.bezierPointsFront = this.calcBezierPoints(this.circles.slice(4));
    }
    calcBezierPoints(circles) {
        let bezierPoints = [];
        let dt = 0.01;
        for (let t = 0; t < 1; t += dt) {
            let c0 = (1 - t) * (1 - t) * (1 - t);
            let c1 = 3 * t * (1 - t) * (1 - t);
            let c2 = 3 * t * t * (1 - t);
            let c3 = t * t * t;

            let x = c0 * circles[0].cx() + c1 * circles[1].cx()
                    + c2 * circles[2].cx() + c3 * circles[3].cx();
            let y = c0 * circles[0].cy() + c1 * circles[1].cy()
                    + c2 * circles[2].cy() + c3 * circles[3].cy();
            bezierPoints.push(new Point(x, y));
        }
        return bezierPoints;
    }
}

LensInfo.count = 1;

let lenses = [];
const pointSize = 10;

let mainPlane = SVG("#main-plane");

function removeElementIfExists(id) {
    let elem = SVG("#" + id);
    if (elem)
        elem.remove();
}

// eslint-disable-next-line no-unused-vars
function createLens(event) {
    let mainPlaneElem = document.getElementById("main-plane");
    const yOffset = mainPlaneElem.getBoundingClientRect().y;
    let x = event.clientX;
    let y = event.clientY - yOffset;

    let midPoint = new Point();
    let prevCoords = new Point();
    let pathD, lens, order;

    let attr = {
        stroke: "#00a0f0",
        "stroke-width": 2,
        fill: "none",
        id: ""
    };

    let lensId = event.target.id;

    if (lensId == "biconvex") {
        pathD = new SVG.PathArray([
            ['M', 30, 0],
            ['C', -10, 70, -10, 135, 30, 200],
            ['L', 50, 200],
            ['C', 90, 135, 90, 70, 50, 0],
            ['L', 30, 0]
        ]);
        midPoint.setVals(40, 100);
        order = [1, 3, 2, 4];
    }
    lens = new LensInfo(lensId);
    lens.setPath(pathD, ...order);

    attr.id = lens.path.id;
    let path = mainPlane.path(pathD).attr(attr);
    path.move(x - midPoint.x, y - midPoint.y);
    lens.path.updatePathD(path.array());
    lens.createPoints();
    lenses.push(lens);

    prevCoords.setVals(x, y);

    mainPlaneElem.addEventListener("mousemove", mouseMoveLens, false);
    mainPlaneElem.addEventListener("mouseup", mouseUpLens, false);

    function mouseMoveLens(event) {
        let x = event.clientX;
        let y = event.clientY - yOffset;
        if (x < 150)
            x = 150;
        let xDiff = x - prevCoords.x;
        let yDiff = y - prevCoords.y;

        path.move(x - midPoint.x, y - midPoint.y);
        lens.path.updatePathD(path.array());

        prevCoords.setVals(x, y);

        let circles = lens.circles;
        for (let i = 0; i < circles.length; i++) {
            let cx = circles[i].cx();
            let cy = circles[i].cy();

            circles[i].move(cx + xDiff - pointSize / 2,
                            cy + yDiff - pointSize / 2);
        }
    }

    function mouseUpLens() {
        mainPlaneElem.removeEventListener("mousemove", mouseMoveLens, false);
        mainPlaneElem.removeEventListener("mouseup", mouseUpLens, false);
    }
}


// eslint-disable-next-line no-unused-vars
function createLaser(event) {
    let mainPlaneElem = document.getElementById("main-plane");
    const yOffset = mainPlaneElem.getBoundingClientRect().y;
    let x = event.clientX;
    let y = event.clientY - yOffset;
    const rectW = 44, rectH = 10;
    const rayW = mainPlane.width() * 1.5;
    let rect = mainPlane.rect(rectW, rectH).fill("#211414").rx(2).move(x, y);
    let rayX = x + rectW, rayY = y + rectH / 2;
    let ray = mainPlane.line(rayX, rayY, rayX + rayW, rayY).stroke({ "color": "#FC0000" });
    let stripX = x + rectW - 8.5;
    let strip = mainPlane.line(stripX, y + rectH, stripX, y).stroke({ "color": "white"});

    mainPlaneElem.addEventListener("mousemove", mouseMoveLaser, false);
    mainPlaneElem.addEventListener("mouseup", mouseUpLaser, false);

    function mouseMoveLaser(event) {
        let x = event.clientX;
        let y = event.clientY - yOffset;
        rect.move(x - 0.5 * rectW, y - 0.5 * rectH);
        let rayX = rect.x() + rectW, rayY = y;
        ray.move(rayX, rayY);
        let stripX = rect.x() + rectW - 8.5;
        strip.move(stripX, rect.y());
    }

    function mouseUpLaser() {
        mainPlaneElem.removeEventListener("mousemove", mouseMoveLaser, false);
        mainPlaneElem.removeEventListener("mouseup", mouseUpLaser, false);
    }
}

//     function rotateOnScroll(event) {
//         let lineCoords = line.array();
//         let x = event.clientX;
//         let y = event.clientY - yOffset;
//         let yTop = lineCoords[0][1] - y;
//         let xTop = lineCoords[0][0] - x;
//         let yBot = lineCoords[1][1] - y;
//         let xBot = lineCoords[1][0] - x;
//         let angle = 2 / 180 * Math.PI;
//         angle = event.deltaY < 0 ? angle : -angle;

//         let newXTop = xTop * Math.cos(angle) - yTop * Math.sin(angle) + x;
//         let newYTop = xTop * Math.sin(angle) + yTop * Math.cos(angle) + y;
//         let newXBot = xBot * Math.cos(angle) - yBot * Math.sin(angle) + x;
//         let newYBot = xBot * Math.sin(angle) + yBot * Math.cos(angle) + y;

//         if (newYTop > newYBot) {
//             [newXTop, newYTop, newXBot, newYBot] = [newXBot, newYBot, newXTop, newYTop];
//         }
//         line.plot(newXTop, newYTop, newXBot, newYBot);
//     }

function circleDrag(event) {
    const { handler, box } = event.detail;
    event.preventDefault();
    let { x, y } = box;
    let xDiff = x - event.target.instance.x();
    let yDiff = y - event.target.instance.y();

    handler.move(x, y);

    // get center of a mouse click
    x += box.w / 2;
    y += box.h / 2;

    let circleId = event.currentTarget.id.split("-");
    let lensId = circleId[0] + "-" + circleId[1];
    let lens = lenses.find(lens => lens.id == lensId);
    moveAdjacent(x, y, circleId, lens, xDiff, yDiff);
}

function moveAdjacent(cx, cy, circleId, lens, xDiff, yDiff) {
    let adjCurveIdx, adjPointIdx, adjCircleIdx;
    let curveIdx;
    let curve = circleId[3];
    let circleIdx = circleId[4];
    let path = lens.path;

    curveIdx = curve == "back" ? path.backCurveIdx : path.frontCurveIdx;

    if (circleIdx == 1) {
        if (curve == "back") {
            adjCurveIdx = path.topLineIdx > 0 ? path.topLineIdx : lens.frontCurveIdx;
            path.setSegmentPoint(0, 1, cx, cy);
        }
        else {
            adjCurveIdx = path.topLineIdx > 0 ? path.botLineIdx : lens.backCurveIdx;
        }
        adjPointIdx = path.getSegmentLengthInPoints(adjCurveIdx);
        if (adjPointIdx < 0) {
            console.error("adjPointIdx < 0: ", adjPointIdx);
            return;
        }
    }
    else {
        adjCurveIdx = curveIdx;
        adjPointIdx = circleIdx - 1;
    }

    if (circleIdx == 1 || circleIdx == 4) {
        adjCircleIdx = circleIdx == 1 ? 2 : 3;
        circleId[4] = adjCircleIdx;
        let adjCircleId = circleId.join("-");
        let adjCircle = lens.circles.find(c => c.id() == adjCircleId);
        let adjCx = adjCircle.cx() + xDiff;
        let adjCy = adjCircle.cy() + yDiff;
        adjCircle.move(adjCx - pointSize / 2, adjCy - pointSize / 2);
        path.setSegmentPoint(curveIdx, adjCircleIdx - 1, adjCx, adjCy);
    }
    path.setSegmentPoint(adjCurveIdx, adjPointIdx, cx, cy);
    path.plot();
}
