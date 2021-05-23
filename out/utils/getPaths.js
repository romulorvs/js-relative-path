"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function getProjectRoot() {
    var _a;
    var activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor || !activeTextEditor.document || !activeTextEditor.document.uri) {
        return [null, null];
    }
    var projectRoot = (_a = vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri)) === null || _a === void 0 ? void 0 : _a.uri.path;
    var openedFilename = activeTextEditor.document.uri.path;
    if (process.platform === "win32") { // win32 = any windows system
        if (projectRoot && projectRoot.startsWith('/')) {
            projectRoot = projectRoot.slice(1);
        }
        if (openedFilename && openedFilename.startsWith('/')) {
            openedFilename = openedFilename.slice(1);
        }
    }
    if (projectRoot) {
        openedFilename = projectRoot && openedFilename.replace(projectRoot, '');
    }
    return projectRoot && openedFilename ? [projectRoot, openedFilename] : [null, null];
}
exports.default = getProjectRoot;
//# sourceMappingURL=getPaths.js.map