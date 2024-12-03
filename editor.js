// @ts-check

// @ts-ignore
const vscode = acquireVsCodeApi();

window.onload = () => {
    document.body.innerHTML = `
        <h1>Hello from editor.js!</h1>
        <button onclick="vscode.postMessage({type: 'add'})">Add</button>
        <textarea id="output" rows="10" cols="50"></textarea>
    `;
}

window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
        const textArea = /** @type {HTMLTextAreaElement} */ (document.getElementById('output'));
        textArea.value = message.value;
    }
});
