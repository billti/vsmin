// @ts-check

/* TODO:
- Add a toolbar of gates
- Add support for drag and drop of gates across lines
- Add support for dragging a gate from a toolbar area to a line
*/

// @ts-ignore
const vscode = acquireVsCodeApi();

/**
 * 
 * @param  {...string} tags 
 * @returns {SVGElement[]}
 */
function createSvgElements(...tags) {
    return tags.map(tag => document.createElementNS('http://www.w3.org/2000/svg', tag));
}

/** 
 * @param {SVGElement} el
 * @param {Record<string, string>} attrs
 */
function setAttributes(el, attrs) {
    for (const key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

/**
 * @param {Element} parent 
 * @param {Element[]} children 
 */
function appendChildren(parent, children) {
    children.forEach(child => parent.appendChild(child));
}

const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
setAttributes(canvas, {'width': '800', 'height': '600', 'class': 'circuit'});

document.body.appendChild(canvas);

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

class CircuitGate extends CircuitElement {
    /**
     * @param {string} name
     * @param {number} x 
     * @param {number} y
     * @param {SVGElement} parent
     */
    constructor(name, x, y, parent) {
        super('g', parent);
        const [rect, text] = createSvgElements('rect', 'text');
        rect.classList.value = 'circuit-gate';

        text.textContent = name;
        text.classList.value = 'circuit-gate-text';

        appendChildren(this.domNode, [rect, text]);
        this.domNode.style.transform = `translate(${x}px, ${y}px)`;
    }
}

class CircuitReset extends CircuitElement {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {SVGElement} parent
     */
    constructor(x, y, parent) {
        super('g', parent);
        const [rect, bar, text, path] = createSvgElements('rect', 'line', 'text', 'path');

        setAttributes(rect, {'class': 'circuit-gate'});
        setAttributes(text, {'class': 'circuit-gate-text'});
        setAttributes(bar, {'y2': `${10}`, 'class': 'circuit-reset-bar'});
        setAttributes(path, {'d': 'M 0 0 l 2 5 l -2 5', 'class': 'circuit-reset-angle'});

        text.textContent = "0";

        this.domNode.style.transform = `translate(${x}px, ${y}px)`;
        appendChildren(this.domNode, [rect, bar, path, text]);
    }
}

class CircuitCXGate extends CircuitElement {
        /**
     * @param {number} x 
     * @param {number} y
     * @param {number} controlYDelta
     * @param {SVGElement} parent
     */
        constructor(x, y, controlYDelta, parent) {
            super('g', parent);
            const [link, cross, control, target] = createSvgElements('line', 'line', 'circle', 'circle');

            const extra = controlYDelta < y ? 16 : -16;

            setAttributes(link, {'x1': `${x}`, 'y1': `${y + controlYDelta}`, 'x2': `${x}`, 'y2': `${y + extra}`, 'class': 'circuit-cx-lines'});
            setAttributes(cross, {'x1': `${x - 16}`, 'y1': `${y}`, 'x2': `${x + 16}`, 'y2': `${y}`, 'class': 'circuit-cx-lines'});
            setAttributes(control, {'cx': `${x}`, 'cy': `${y + controlYDelta}`, 'r': '6', 'class': 'circuit-cx-lines'});
            setAttributes(target, {'cx': `${x}`, 'cy': `${y}`, 'r': '16', 'class': 'circuit-cx-lines circuit-cx-target'});

            appendChildren(this.domNode, [link, cross, control, target]);
        }
}

class CircuitMz extends CircuitElement {
    /**
     * @param {number} x 
     * @param {number} y
     * @param {SVGElement} parent
     */
    constructor(x, y, parent) {
        super('g', parent);
        const [rect, bar, path] = createSvgElements('rect', 'path', 'path');

        setAttributes(rect, {'class': 'circuit-gate'});
        setAttributes(bar, {'d': 'M 0 8 l 12 -17', 'class': 'circuit-measure-angle'});
        setAttributes(path, {'d': 'M -15 3 A 30 35 0 0 1 15 3', 'class': 'circuit-measure-angle'});

        this.domNode.style.transform = `translate(${x}px, ${y}px)`;
        appendChildren(this.domNode, [rect, bar, path]);
    }
}

function renderCircuit() {
    // Draw the circuit lines
    for (let i = 1; i < 5; i++) {
        new CircuitLine(75, i * 75, 650, canvas);
        new CircuitReset(75, i * 75, canvas);
        new CircuitMz(725, i * 75, canvas);
    }

    new CircuitGate('H', 150, 75, canvas);
    new CircuitCXGate(225, 150, -75, canvas);
    new CircuitGate('Z', 300, 150, canvas);
    new CircuitCXGate(375, 225, -75, canvas);
    new CircuitGate('Z', 450, 150, canvas);
    new CircuitCXGate(525, 300, -75, canvas);
}

window.onload = renderCircuit;

window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
        const textArea = /** @type {HTMLTextAreaElement} */ (document.getElementById('output'));
        textArea.value = message.value;
    }
});
