//@ts-check

const scopes = {
  armMgmt: "https://management.azure.com/user_impersonation",
  quantum: "https://quantum.microsoft.com/user_impersonation",
};

// Replace with the underlying AAD tenant for your MSA account (or your org tenant if logging in 
// with an AAD account, e.g. "72f988bf-86f1-41af-91ab-2d7cd011db47" for Microsoft.com accounts)

// const tenantId = "7da14c7a-40ff-4b56-8e4b-760149cb8cbb"; // AAD tenant for my billti-test@outlook.com account
const tenantId = "72f988bf-86f1-41af-91ab-2d7cd011db47" // microsoft.com

var vscode = require("vscode");

/** @type {vscode.LogOutputChannel} */
let output;

/**
 * 
 * @param {string[]} scopes 
 */
async function getAuthSession(scopes) {
    output.info("About to getSession for scopes", scopes.join(","));
    const session = await vscode.authentication.getSession(
      "microsoft",
      scopes,
      { createIfNone: true }
    );
    output.info("Got session: ", session);
    return session;
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  output = vscode.window.createOutputChannel("vs-min", { log: true });
  output.info("vs-min extension is active");

  var disposable = vscode.commands.registerCommand(
    "vsmin.cmd",
    async function () {
      output.info("vs-min command invoked");

      const firstAuth = await getAuthSession([scopes.armMgmt]);

      if (!firstAuth) return;

      const tenantMatch = firstAuth.account.id.startsWith(tenantId);
      const accountType = /** @type {any} */ (firstAuth.account)?.type || "";

      // If the prior request returned an MSA token, need to request again for the
      // AAD tenant underlying the MSA using in Azure
      if (!tenantMatch || accountType !== "aad") {
        await getAuthSession([scopes.armMgmt, `VSCODE_TENANT:${tenantId}`]);
      }

      const quantumAuth = await getAuthSession([scopes.quantum, `VSCODE_TENANT:${tenantId}`]);

      // See if this prompts again (doesn't now with insiders build)
      const nextAuth = await getAuthSession([scopes.quantum, `VSCODE_TENANT:${tenantId}`]);
    }
  );

  context.subscriptions.push(disposable);
}

module.exports = {
  activate,
};
