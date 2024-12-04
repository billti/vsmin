// @ts-check

// @ts-ignore
const vscode = acquireVsCodeApi();

// **** Metrics for controlling the layout ****

let svgWidth = 800;
let svgHeight = 600;
let circuitHeight = 500;
const circuitPadding = 10;
const qubitLinePadding = 75;
const qubitOffsetTop = 75;
const qubitSpacing = 75;
const gateSpacing = 75;
const gateWidth = 40; // Ensure this and below matches the CSS values
const gateHeight = 40;
const cxTargetRadius = 16;
const cxControlRadius = 6;


// **** Helper functions for rendering SVG elements ****

/** @typedef {Record<string, string>} StringMap */

const createSvgElements = (/** @type {string[]}] */ ...tags) => {
    return tags.map(tag => document.createElementNS('http://www.w3.org/2000/svg', tag));
}

const setAttributes = (/** @type {SVGElement} */ el, /** @type {StringMap} */ attrs) => {
    for (const key in attrs) el.setAttribute(key, attrs[key]);
}

const appendChildren = (/** @type {Element} */ parent, /** @type {Element[]} */ children) => {
    children.forEach(child => parent.appendChild(child));
}

const getGateX = (/** @type {number} */ gateIndex) => circuitPadding + qubitLinePadding  + gateIndex * gateSpacing;
const getGateXMax = () => svgWidth - circuitPadding - qubitLinePadding;
const getQubitY = (/** @type {number} */ qubitIndex) => qubitOffsetTop + qubitIndex * qubitSpacing;


const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
setAttributes(canvas, {'width': `${svgWidth}`, 'height': `${svgHeight}`});

const [circuitBackground, hoverBackground] = createSvgElements('rect', 'rect');
setAttributes(circuitBackground, {'width': `${svgWidth - circuitPadding}`, 'height': `${circuitHeight}`, 'x': `${circuitPadding}`, 'y': `${circuitPadding}`, 'class': 'circuit-background'});
setAttributes(hoverBackground, {'width': '45', 'height': '285', 'x': '90', 'y': '45', 'class': 'circuit-droparea-background'});
appendChildren(canvas, [circuitBackground, hoverBackground]);

function onDragging(/** @type {MouseEvent} */ ev) {
    const svgPoint = canvas.createSVGPoint();
    svgPoint.x = ev.clientX;
    svgPoint.y = ev.clientY;
    const point = svgPoint.matrixTransform(canvas.getScreenCTM()?.inverse());
    if (point.x < 90 || point.x > 735 || point.y < 45 || point.y > 325) {
        hoverBackground.style.display = 'none';
        return;
    }
    for(let i = 90; i < 615; i+= 75) {
        if (point.x > i && point.x < i + 75) {
            hoverBackground.setAttribute('x', `${i}`);
            hoverBackground.style.display = 'inline';
            return;
        }
    }
    hoverBackground.style.display = 'none';
};
canvas.addEventListener('mouseleave', () => hoverBackground.style.display = 'none');

document.body.appendChild(canvas);


// **** Classes for rendering the circuit elements ****

class CircuitElement {
    /**
     * @param {string} tag
     * @param {SVGElement} parent
     */
    constructor(tag, parent) {
        this.domNode = document.createElementNS('http://www.w3.org/2000/svg', tag);
        parent.appendChild(this.domNode);
    }

    remove() {
        this.domNode.parentNode?.removeChild(this.domNode);
    }
}

class CircuitLine extends CircuitElement {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {number} width
     * @param {SVGElement} parent
     */
    constructor(x, y, width, parent) {
        super('line', parent);
        setAttributes(this.domNode, 
            {'x1': `${x}`, 'y1': `${y}`, 'x2': `${x + width}`, 'y2': `${y}`, 'class': 'circuit-line'}
        );
    }
}

class CircuitDraggable extends CircuitElement {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {SVGElement} parent
     */
    constructor(x, y, parent) {
        super('g', parent);
        this.x = x;
        this.y = y;
        this.setPosition(x, y);
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.domNode.style.transform = `translate(${x}px, ${y}px)`;
    }

    /**
     * @param {SVGElement} node 
     */
    setDraggableNode(node) {
        node.style.cursor = 'grab';
        node.addEventListener('mousedown', (/** @type {MouseEvent} */ ev) => {
            // Register for mousemove events until a mouseup event
            const startX = this.x;
            const startY = this.y;
            // Convert the mouse location to SVG coordinates
            const svgPoint = canvas.createSVGPoint();
            svgPoint.x = ev.clientX;
            svgPoint.y = ev.clientY;
            const point = svgPoint.matrixTransform(canvas.getScreenCTM()?.inverse());
            const xDelta = point.x - this.x;
            const yDelta = point.y - this.y;

            const mouseMoveHandler = (/** @type {MouseEvent} */ ev) => {
                const svgPoint = canvas.createSVGPoint();
                svgPoint.x = ev.clientX;
                svgPoint.y = ev.clientY;
                const point = svgPoint.matrixTransform(canvas.getScreenCTM()?.inverse());

                this.setPosition(point.x - xDelta, point.y - yDelta);
                onDragging(ev);
            };
            const mouseUpHandler = () => {
                window.removeEventListener('mousemove', mouseMoveHandler);
                window.removeEventListener('mouseup', mouseUpHandler);
                hoverBackground.style.display = 'none';
                // TODO: Snap to drop location (if valid) and re-render the circuit
            };
            // TODO: Cancellation or invalid drop location
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
        });
    }
}

class CircuitGate extends CircuitDraggable {
    /**
     * @param {string} name
     * @param {number} x 
     * @param {number} y
     * @param {SVGElement} parent
     */
    constructor(name, x, y, parent) {
        super(x, y, parent);
        const [rect, text] = createSvgElements('rect', 'text');
        rect.classList.value = 'circuit-gate';
        text.classList.value = 'circuit-gate-text';

        if (name[0] === 'R') {
            // Rotation gate - needs a subscript
            text.innerHTML = `<tspan class='circuit-gate-text'>R</tspan><tspan dy="5" class="circuit-script">${name[1]}</tspan>`;
        } else if (name[1] === '†') {
            // Adjoint gate - needs a superscript
            text.innerHTML = `<tspan class='circuit-gate-text' dx="3">${name[0]}</tspan><tspan dx="3" dy="-6" class="circuit-script">${name[1]}</tspan>`;
        } else if (name[1] === '0') {
            // Reset gate - needs a non-italic style for the ket
            text.textContent = name;
            setAttributes(text, {'class': 'circuit-gate-text circuit-gate-reset'});
        } else {
            text.textContent = name;
        }

        appendChildren(this.domNode, [rect, text]);
        this.setDraggableNode(rect);
    }
}

class CircuitCXGate extends CircuitDraggable {
        /**
     * @param {number} x 
     * @param {number} y
     * @param {number} controlYDelta
     * @param {SVGElement} parent
     */
        constructor(x, y, controlYDelta, parent) {
            super(x, y, parent);
            const [link, cross, control, target] = createSvgElements('line', 'line', 'circle', 'circle');

            const extra = controlYDelta < y ? cxTargetRadius : -cxTargetRadius;

            setAttributes(link, {'x1': `0`, 'y1': `${controlYDelta}`, 'x2': `0`, 'y2': `${extra}`, 'class': 'circuit-cx-lines'});
            setAttributes(cross, {'x1': `${-cxTargetRadius}`, 'y1': `0`, 'x2': `${cxTargetRadius}`, 'y2': `0`, 'class': 'circuit-cx-lines'});
            setAttributes(control, {'cx': `0`, 'cy': `${controlYDelta}`, 'r': `${cxControlRadius}`, 'class': 'circuit-cx-lines'});
            setAttributes(target, {'cx': `0`, 'cy': `0`, 'r': `${cxTargetRadius}`, 'class': 'circuit-cx-lines circuit-cx-target'});

            appendChildren(this.domNode, [link, cross, control, target]);
            this.setDraggableNode(target);
            // TODO: Dragging the control to a qubit line
        }
}

class CircuitMz extends CircuitDraggable {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {SVGElement} parent
     */
    constructor(x, y, parent) {
        super(x, y, parent);
        const [rect, bar, path] = createSvgElements('rect', 'path', 'path');

        setAttributes(rect, {'class': 'circuit-gate'});
        setAttributes(bar, {'d': 'M 0 8 l 12 -17', 'class': 'circuit-measure-angle'});
        setAttributes(path, {'d': 'M -15 3 A 30 35 0 0 1 15 3', 'class': 'circuit-measure-angle'});

        appendChildren(this.domNode, [rect, bar, path]);
    }
}

const gateList = [
    {gate: 'H',  step: 1, qubits: [0]},
    {gate: 'CX', step: 2, qubits: [1, 0]},
    {gate: 'T†', step: 3, qubits: [1]},
    {gate: 'CX', step: 4, qubits: [2, 1]},
    {gate: 'RZ', step: 5, qubits: [1]},
    {gate: 'CX', step: 6, qubits: [3, 0]},
];

function renderCircuit() {
    const qubitLineXStart = getGateX(0);
    const qubitLineXEnd = getGateXMax();
    const qubitLineWidth = qubitLineXEnd - qubitLineXStart;

    // Draw the circuit lines
    for (let i = 0; i < 4; i++) {
        const yOffset = getQubitY(i);
        new CircuitLine(qubitLineXStart, yOffset, qubitLineWidth, canvas);
        new CircuitGate("∣0⟩", qubitLineXStart, yOffset, canvas);
        new CircuitMz(qubitLineXEnd, yOffset, canvas);
    }

    // Draw the gates
    gateList.forEach(gate => {
        const x = getGateX(gate.step);
        const y = getQubitY(gate.qubits[0]);
        if (gate.gate === 'CX') {
            const controlYOffset = getQubitY(gate.qubits[1]) - y;
            new CircuitCXGate(x, y, controlYOffset, canvas);
        } else {
            new CircuitGate(gate.gate, x, y, canvas);
        }
    });
}


// **** Communicating with the host extension ****

window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
        // TODO: Update the circuit based on the message.data
    }
});


window.onload = renderCircuit;

/*
TODO
- Clean up the init code
- Fix drop-zones to be layout aware
- Make dropping snap gates to correct location
- Disable dropping in invalid locations
- Enable drag & drop for controls
- Add a toolbar of gates to drop
- Enable dropping new gates from the toolbar
- Update the gate list state based on gate edits
- Add if/else blocks
*/
