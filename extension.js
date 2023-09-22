//@ts-check

var vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
    console.log('vsmin extension is active');

    var disposable = vscode.commands.registerCommand('vsmin-cmd', function () {
        vscode.window.showInformationMessage('Hello from extension vsmin!');
    });

    context.subscriptions.push(disposable);
}

module.exports = {
    activate
}
