// @ts-check

// @ts-ignore
const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : {};

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

const spansRange = (/** @type {number[]} */ arr) => {
    if (arr.length === 0) throw new Error('Empty array');
    const result = {min: arr[0], max: arr[0]};
    arr.forEach(v => {
        if (v < result.min) result.min = v;
        if (v > result.max) result.max = v;
    });
    return result;
};

const getGateX = (/** @type {number} */ gateIndex) => circuitPadding + qubitLinePadding  + gateIndex * gateSpacing;
const getGateXMax = () => svgWidth - circuitPadding - qubitLinePadding;
const getQubitY = (/** @type {number} */ qubitIndex) => qubitOffsetTop + qubitIndex * qubitSpacing;


// function onDragging(/** @type {MouseEvent} */ ev) {
//     const point = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(canvas.getScreenCTM()?.inverse());
//     if (point.x < 90 || point.x > 735 || point.y < 45 || point.y > 325) {
//         hoverBackground.style.display = 'none';
//         return;
//     }
//     for(let i = 90; i < 615; i+= 75) {
//         if (point.x > i && point.x < i + 75) {
//             hoverBackground.setAttribute('x', `${i}`);
//             hoverBackground.style.display = 'inline';
//             return;
//         }
//     }
//     hoverBackground.style.display = 'none';
// };
// canvas.addEventListener('mouseleave', () => hoverBackground.style.display = 'none');


// **** Classes for rendering the circuit elements ****

class CircuitElement {
    /**
     * @param {string} tag
     * @param {CircuitDesigner} designer
     */
    constructor(tag, designer) {
        this.domNode = document.createElementNS('http://www.w3.org/2000/svg', tag);
        designer.canvas.appendChild(this.domNode);
        this.designer = designer;
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
     * @param {CircuitDesigner} designer
     */
    constructor(x, y, width, designer) {
        super('line', designer);
        setAttributes(this.domNode, 
            {'x1': `${x}`, 'y1': `${y}`, 'x2': `${x + width}`, 'y2': `${y}`, 'class': 'circuit-line'}
        );
    }
}

class CircuitDraggable extends CircuitElement {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {CircuitDesigner} designer
     */
    constructor(x, y, designer) {
        super('g', designer);
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
            const canvas = this.domNode.ownerSVGElement;
            if (!canvas) return;

            // Make it the top-most element when dragging
            // TODO: Make the drop zone outline just below this.
            canvas.appendChild(this.domNode);

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
                // onDragging(ev);
            };
            const mouseUpHandler = () => {
                window.removeEventListener('mousemove', mouseMoveHandler);
                window.removeEventListener('mouseup', mouseUpHandler);
                // hoverBackground.style.display = 'none';
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
     * @param {CircuitDesigner} designer
     */
    constructor(name, x, y, designer) {
        super(x, y, designer);
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
     * @param {CircuitDesigner} designer
     */
        constructor(x, y, controlYDelta, designer) {
            super(x, y, designer);
            const [link, cross, control, target] = createSvgElements('line', 'line', 'circle', 'circle');

            const extra = controlYDelta < y ? cxTargetRadius : -cxTargetRadius;

            setAttributes(link, {'x1': `0`, 'y1': `${controlYDelta}`, 'x2': `0`, 'y2': `${extra}`, 'class': 'circuit-cx-lines'});
            setAttributes(cross, {'x1': `${-cxTargetRadius}`, 'y1': `0`, 'x2': `${cxTargetRadius}`, 'y2': `0`, 'class': 'circuit-cx-lines'});
            setAttributes(control, {'cx': `0`, 'cy': `${controlYDelta}`, 'r': `${cxControlRadius}`, 'class': 'circuit-cx-lines'});
            setAttributes(target, {'cx': `0`, 'cy': `0`, 'r': `${cxTargetRadius}`, 'class': 'circuit-cx-lines circuit-cx-target'});

            appendChildren(this.domNode, [target, link, cross, control]);
            this.setDraggableNode(target);
            // TODO: Dragging the control to a qubit line
        }
}

class CircuitMz extends CircuitDraggable {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {CircuitDesigner} designer
     */
    constructor(x, y, designer) {
        super(x, y, designer);
        const [rect, bar, path] = createSvgElements('rect', 'path', 'path');

        setAttributes(rect, {'class': 'circuit-gate'});
        setAttributes(bar, {'d': 'M 0 8 l 12 -17', 'class': 'circuit-measure-angle'});
        setAttributes(path, {'d': 'M -15 3 A 30 35 0 0 1 15 3', 'class': 'circuit-measure-angle'});

        appendChildren(this.domNode, [rect, bar, path]);
    }
}

/** @typedef {{gate: string; step: number; qubits: number[]; el?: CircuitDraggable}} GateEntry */

/** @type {GateEntry[]} */
const gateList = [
    {gate: 'H',  step: 1, qubits: [0]},
    {gate: 'CX', step: 1, qubits: [1, 0]},
    {gate: 'T†', step: 1, qubits: [1]},
    {gate: 'CX', step: 1, qubits: [2, 1]},
    {gate: 'RZ', step: 1, qubits: [1]},
    {gate: 'CX', step: 1, qubits: [3, 0]},
];

class CircuitDesigner {
    constructor(/** @type{HTMLElement} */ parent, /** @type{GateEntry[]} */ gates) {
        this.canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        setAttributes(this.canvas, {'width': `${svgWidth}`, 'height': `${svgHeight}`});
        
        const [circuitBackground, hoverBackground] = createSvgElements('rect', 'rect');
        setAttributes(circuitBackground, {'width': `${svgWidth - circuitPadding * 2}`, 'height': `${circuitHeight}`, 'x': `${circuitPadding}`, 'y': `${circuitPadding}`, 'class': 'circuit-background'});
        setAttributes(hoverBackground, {'width': '45', 'height': '285', 'x': '90', 'y': '45', 'class': 'circuit-droparea-background'});
        appendChildren(this.canvas, [circuitBackground, hoverBackground]);

        parent.appendChild(this.canvas);
        this.gateList = gates;
        this.renderCircuit();
    }

    renderCircuit() {
        const qubitLineXStart = getGateX(0);
        const qubitLineXEnd = getGateXMax();
        const qubitLineWidth = qubitLineXEnd - qubitLineXStart;
    
        // Draw the circuit lines
        for (let i = 0; i < 4; i++) {
            const yOffset = getQubitY(i);
            new CircuitLine(qubitLineXStart, yOffset, qubitLineWidth, this);
            new CircuitGate("∣0⟩", qubitLineXStart, yOffset, this);
            new CircuitMz(qubitLineXEnd, yOffset, this);
        }
    
        // Draw the gates
        this.shuffleGates();
        this.gateList.forEach(gate => {
            const x = getGateX(gate.step);
            const y = getQubitY(gate.qubits[0]);
            if (gate.gate === 'CX') {
                const controlYOffset = getQubitY(gate.qubits[1]) - y;
                gate.el = new CircuitCXGate(x, y, controlYOffset, this);
            } else {
                gate.el = new CircuitGate(gate.gate, x, y, this);
            }
        });
    }

    shuffleGates() {
        // Go through gate list first to last and figure out what step to put it in
        // If there is a gate in that step, move it to the next. It will never go back a step.
        let step = 1;
        /** @type {number[]} */
        let takenSlots = [];
        this.gateList.forEach(gate => {
            const span = spansRange(gate.qubits);
            const taken = takenSlots.some(slot => slot >= span.min && slot <= span.max);
            if (taken) {
                step++;
                takenSlots = [];
            }
            gate.step = step;
            for(let i = span.min; i <= span.max; i++) takenSlots.push(i);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const designer = new CircuitDesigner(document.body, gateList);
});


// **** Communicating with the host extension ****

window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
        // TODO: Update the circuit based on the message.data
    }
});

/*
Here's how drag & drop works:
- After the initial render, the gate list has the qubits, steps, and CircuitDraggable elements
- On mousedown on a gate:
  - A 'missing' placeholder element is created at the current location
  - The gateList entry is replaced with the 'missing' entry
  - The dragged element is moved to the top of the SVG stack
  - The mousemove and mouseup events are wired up
- On mousemove:
  - The dragged SVG element is moved to the new mouse location
  - The new mouse location is hit-tests against valid dropzones
  - If the dropzone has changed:
    - Add/update a dropzone element at the target
    - Insert/move an entry in gatelist to start of dropzone step
    - Call updateGates to:
      - 'shuffle' is called to update the gate steps
      - 'animate' is called to transform to their new locations (commit animation when completed)
- On mouseup:
  - If a dropzone is active:
    - Replace the dropzone in the gatelist with an entry for the dragged gate
    - Remove the 'missing' placeholder element
  else:
    - Replace the 'missing' placeholder with the dragged gate
  - Remove the dropzone and 'missing' placeholder (if present)
  - Do the updateGates/shuffle/animate dance
  - Remove all mouse event listeners
- On cancel (if needed?):
  - Do same as on mouseup 'else' branch (i.e. ignore any valid dropzone, other than removing it)
*/

/*
TODO
- Fix drop-zones to be layout aware
- Make dropping snap gates to correct location
- Disable dropping in invalid locations
- Enable drag & drop for controls
- Add a toolbar of gates to drop
- Enable dropping new gates from the toolbar
- Update the gate list state based on gate edits
- Add if/else blocks for conditional operations (on simple measurements)
- Add zoom in/out or drag around with mouse wheel/button
- Can zoom into an operation (with cool animation?)
- Make the initial resets unmovable (and remove final measurements?)
*/
