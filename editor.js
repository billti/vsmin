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
setAttributes(canvas, {'width': '800', 'height': '600'});

const [circuitBackground, hoverBackground] = createSvgElements('rect', 'rect');
setAttributes(circuitBackground, {'width': '780', 'height': '500', 'x': '10', 'y': '10', 'class': 'circuit-background'});
setAttributes(hoverBackground, {'width': '45', 'height': '285', 'x': '90', 'y': '45', 'class': 'circuit-hover-background'});
appendChildren(canvas, [circuitBackground, hoverBackground]);

canvas.addEventListener('mousemove', (/** @type {MouseEvent} */ ev) => {
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
});
canvas.addEventListener('mouseleave', () => hoverBackground.style.display = 'none');

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
        text.classList.value = 'circuit-gate-text';

        if (name[0] === 'R') {
            // Rotation gate
            text.innerHTML = `R<tspan dy="5" class="circuit-script">${name[1]}</tspan>`;
        } else if (name[1] === '†') {
            // Adjoint gate
            text.innerHTML = `<tspan dx="3">${name[0]}</tspan><tspan dx="3" dy="-6" class="circuit-script">${name[1]}</tspan>`;
        } else if (name[1] === '0') {
            // Reset gate
            text.textContent = name;
            setAttributes(text, {'class': 'circuit-gate-text circuit-gate-reset'});
        } else {
            text.textContent = name;
        }

        appendChildren(this.domNode, [rect, text]);
        this.domNode.style.transform = `translate(${x}px, ${y}px)`;
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
        new CircuitGate("∣0⟩", 75, i * 75, canvas);
        new CircuitMz(725, i * 75, canvas);
    }

    new CircuitGate('H', 150, 75, canvas);
    new CircuitCXGate(225, 150, -75, canvas);
    new CircuitGate('T†', 300, 150, canvas);
    new CircuitCXGate(375, 225, -75, canvas);
    new CircuitGate('RZ', 450, 150, canvas);
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
