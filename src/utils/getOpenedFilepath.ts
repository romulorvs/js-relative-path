import * as vscode from 'vscode';

function getProjectRoot(props = {onlyFilename: false}): [string, string] | [null, null] | string | null {
	var onlyFilename = props.onlyFilename;
	var activeTextEditor = vscode.window.activeTextEditor;
	if(!activeTextEditor || !activeTextEditor.document || !activeTextEditor.document.uri) {
		if(onlyFilename){ return null; }
		return [null, null];
	}
	
	var projectRoot = vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri)?.uri.path;
	var openedFilename = activeTextEditor.document.uri.path;

	if(process.platform === "win32"){ // win32 = any windows system
		if(projectRoot && projectRoot.startsWith('/')){
			projectRoot = projectRoot.slice(1);
		}
	
		if(openedFilename && openedFilename.startsWith('/')){
			openedFilename = openedFilename.slice(1);
		}
	}

	if(projectRoot){
		openedFilename = projectRoot && openedFilename.replace(projectRoot, '');
	}

	if(onlyFilename){ return openedFilename; }

	return projectRoot && openedFilename ? [projectRoot, openedFilename] : [null, null];
}
export default getProjectRoot;