//@ts-check - see https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html

var vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context 
 */
module.exports.activate = async function activate(context) {
    const cmdDisposable = vscode.commands.registerCommand('vsmin.cmd', function () {
        vscode.window.showInformationMessage('Hello from extension vs-min!');
    });

    const providerDisposable = vscode.window.registerCustomEditorProvider('vsmin.circuitEditor',
        new CircuitEditorProvider(context)
    );

    context.subscriptions.push(cmdDisposable, providerDisposable);
}

/**
 * @implements {vscode.CustomTextEditorProvider}
 */
class CircuitEditorProvider {
    /** @param {vscode.ExtensionContext} context */
    constructor(context) {
        this.context = context;
    }

    /**
     * @param {vscode.TextDocument} document 
     * @param {vscode.WebviewPanel} webviewPanel 
     * @param {vscode.CancellationToken} token 
     */
    async resolveCustomTextEditor(document, webviewPanel, token) {
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webviewPanel.webview.postMessage(
                    { type: 'update', value: document.getText() }
                );
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(e => {
            if (e.type === 'add') {
                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, new vscode.Position(0, 0), 'Hello from editor.js!\n');
                vscode.workspace.applyEdit(edit);
            }
        });

        webviewPanel.webview.options = {
            enableScripts: true,
        };
        const scriptUri = webviewPanel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'editor.js')
        );
        const styleUri = webviewPanel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'style.css')
        );
        webviewPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link href="${styleUri}" rel="stylesheet">
  </head>
  <body>
    <script src="${scriptUri}"></script>
  </body>
</html>
`;
    }
}
