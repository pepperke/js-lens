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
        this.backCurveIdx = backCurveIdx;
        this.frontCurveIdx = frontCurveIdx;
        if (botLineIdx != -1)
            this.botLineIdx = botLineIdx;
        if (topLineIdx != -1)
            this.topLineIdx = topLineIdx;

        let attr = {
            stroke: "#00a0f0",
            "stroke-width": 2,
            fill: "none",
            id: this.id
        };
        this.path = mainPlane.path(pathD).attr(attr);
    }

    getSegmentPoint(segmentIdx, pointIdx) {
        let pathD = this.path.array();
        if (segmentIdx < 0 || segmentIdx >= pathD.length) {
            console.error("getSegmentPoint: wrong segment index: ", segmentIdx);
            return null;
        }
        if (pointIdx < 1 || pointIdx >= (pathD[segmentIdx].length + 1) / 2) {
            console.error("getSegmentPoint: wrong point index: ", pointIdx);
            return null;
        }
        return new Point(pathD[segmentIdx][pointIdx * 2 - 1],
                         pathD[segmentIdx][pointIdx * 2]);
    }

    setSegmentPoint(segmentIdx, pointIdx, x, y) {
        let pathD = this.path.array();
        if (segmentIdx < 0 || segmentIdx >= pathD.length) {
            console.error("setSegmentPoint: wrong segment index: ", segmentIdx);
            return;
        }
        if (pointIdx < 1 || pointIdx >= (pathD[segmentIdx].length + 1) / 2) {
            console.error("setSegmentPoint: wrong point index: ", pointIdx);
            return;
        }
        pathD[segmentIdx][pointIdx * 2 - 1] = x;
        pathD[segmentIdx][pointIdx * 2] = y;
    }

    getSegmentLengthInPoints(segmentIdx) {
        let pathD = this.path.array();
        if (segmentIdx < 0 || segmentIdx >= pathD.length) {
            console.error("setSegmentPoint: wrong segment index: ", segmentIdx);
            return -1;
        }
        return parseInt(pathD[segmentIdx].length - 1) / 2;
    }
}

class LensInfo {
    constructor(id) {
        this.id = id + "-" + LensInfo.count++;
        this.pathInfo;
        this.circles = [];
        this.bezierPointsBack = [];
        this.bezierPointsFront = [];
    }

    createPath(pathD, backCurveIdx, frontCurveIdx,
            botLineIdx=-1, topLineIdx=-1) {
        this.pathInfo = new PathInfo(this.id, pathD, backCurveIdx,
                                     frontCurveIdx, botLineIdx, topLineIdx);
    }

    createPoints() {
        let lensId = this.id;
        let pathD = this.pathInfo.path.array();
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
                segment = i == this.pathInfo.backCurveIdx ? "back-" : "front-";
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
            "stroke-width": 2,
            style: "cursor: pointer",
            id: id
        };
        let circle = mainPlane.circle(pointSize).attr(attributes);
        circle.draggable();
        circle.on("dragmove.namespace", circleDrag);
        this.circles.push(circle);
    }

    calcBezierPoints() {
        if (this.pathInfo.getSegmentLengthInPoints(this.pathInfo.backCurveIdx) == 3);
            this.bezierPointsBack = this.calcBezierPts(this.circles.slice(0, 4));
        if (this.pathInfo.getSegmentLengthInPoints(this.pathInfo.frontCurveIdx) == 3);
            this.bezierPointsFront = this.calcBezierPts(this.circles.slice(4));
    }

    calcBezierPointsCurve(curveIdx) {
        if (curveIdx == this.pathInfo.backCurveIdx
            && this.pathInfo.getSegmentLengthInPoints(curveIdx) == 3)
            this.bezierPointsBack = this.calcBezierPts(this.circles.slice(0, 4));
        else if (curveIdx == this.pathInfo.frontCurveIdx
            && this.pathInfo.getSegmentLengthInPoints(curveIdx) == 3)
            this.bezierPointsFront = this.calcBezierPts(this.circles.slice(4));
    }

    calcBezierPts(circles) {
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
    lens.createPath(pathD, ...order);

    let path = lens.pathInfo.path;
    path.move(x - midPoint.x, y - midPoint.y);
    lens.createPoints();
    lens.calcBezierPoints();
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
    let curve = circleId[3];
    let circleIdx = circleId[4];
    let pathInfo = lens.pathInfo;
    let path = pathInfo.path;
    let adjCurveIdx, adjPointIdx, adjCircleIdx;
    let curveIdx;

    curveIdx = curve == "back" ? pathInfo.backCurveIdx : pathInfo.frontCurveIdx;

    if (circleIdx == 1) {
        if (curve == "back") {
            adjCurveIdx = pathInfo.topLineIdx > 0 ? pathInfo.topLineIdx : lens.frontCurveIdx;
            pathInfo.setSegmentPoint(0, 1, cx, cy);
        }
        else {
            adjCurveIdx = pathInfo.topLineIdx > 0 ? pathInfo.botLineIdx : lens.backCurveIdx;
        }
        adjPointIdx = pathInfo.getSegmentLengthInPoints(adjCurveIdx);
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
        pathInfo.setSegmentPoint(curveIdx, adjCircleIdx - 1, adjCx, adjCy);
    }
    pathInfo.setSegmentPoint(adjCurveIdx, adjPointIdx, cx, cy);
    path.plot(path.array());
    lens.calcBezierPointsCurve(curveIdx);
}
