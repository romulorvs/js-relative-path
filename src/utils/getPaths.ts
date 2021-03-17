import * as vscode from 'vscode';

function getProjectRoot(): [string, string] | [null, null] {
	var activeTextEditor = vscode.window.activeTextEditor;
	if(!activeTextEditor || !activeTextEditor.document || !activeTextEditor.document.uri) {return [null, null];}
	
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

	return projectRoot && openedFilename ? [projectRoot, openedFilename] : [null, null];
}
export default getProjectRoot;