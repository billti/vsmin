//@ts-check

console.log("In first line of vs-min extension")
var vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context 
 */
async function activate(context) {
    console.log('vs-min extension is active');

    var disposable = vscode.commands.registerCommand('vsmin.cmd', function () {
        vscode.window.showInformationMessage('Hello from extension vs-min!');
    });

    context.subscriptions.push(disposable);
}

module.exports = {
    activate
}
