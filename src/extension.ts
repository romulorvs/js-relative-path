import { commands, window,  QuickPickItem } from 'vscode';
import * as vscode from 'vscode';
import * as glob from 'glob';
import getPaths from './utils/getPaths';
import changeActiveItem from './utils/changeActiveItem';

var projectRoot: string | null = null;
var openedFilename: string | null = null;
const deepness = 8; // 8 folder levels to search (root + 7)

var getDirectories = async function(callback: any){
	if(projectRoot){
		let ignoreLevels = projectRoot + '/*/*';
		for (let index = 0; index < deepness; index++) { ignoreLevels += '/*'; }
		ignoreLevels += '*';
		try {
			glob(
				projectRoot + '/**/*',
				{
					nosort: true,
					mark: true,
					ignore: [
						projectRoot + '/NODE_MODULES/**',
						projectRoot + '/node_modules/**',
						projectRoot + '/COVERAGE/**',
						projectRoot + '/coverage/**',
						projectRoot + '/ANDROID/**',
						projectRoot + '/android/**',
						projectRoot + '/IOS/**',
						projectRoot + '/ios/**',
						projectRoot + '/INTERNALS/**',
						projectRoot + '/internals/**',
						projectRoot + '/WEBPACK/**',
						projectRoot + '/webpack/**',
						projectRoot + '/BUILD/**',
						projectRoot + '/build/**',
						projectRoot + '/PUBLIC/**',
						projectRoot + '/public/**',
						projectRoot + '/OUT/**',
						projectRoot + '/out/**',
						projectRoot + '/.*/**',
						projectRoot + '/*LICENSE*',
						projectRoot + '/*license*',
						projectRoot + '/*config*',
						projectRoot + '/*setup*',
						projectRoot + '/*ignore*',
						projectRoot + '/.*',
						projectRoot + '/*.tmpl',
						projectRoot + '/*.lock',
						projectRoot + '/*.json',
						projectRoot + '/*.log',
						projectRoot + '/*.md',
						projectRoot + '/*.vsix',
						ignoreLevels
					]
				},
				callback
			);
		} catch (error) {
			callback(error);		
		}
	}else{
		callback(new Error('no project root dir found'));	
	}
};

var quickPick = window.createQuickPick();
quickPick.matchOnDetail = true;

type ItemType = {
	label: string,
	dir: string,
	file: string,
	isDir: boolean,
	pathToSort: string,
	ext: string
};
var storedItems: QuickPickItem[] = [];
var storedItemsFilter: QuickPickItem[] = [];
var storedFiles: string[] = [];
interface StoredDirs {
	[key: string]: {
		isOpen: boolean
	}
}
var storedDirs: StoredDirs = {};
var selectionFilesIndex: {[key: string]: number} = {};
var currentFileIndex = -1;
var isFiltering: boolean | null = null; // null means the first filtering
quickPick.busy = true;

function reallyChangeActiveItem(){
	if(projectRoot && openedFilename){
		var openedFileId = openedFilename.replace(projectRoot, '');
		if(typeof selectionFilesIndex[openedFileId] !== 'undefined'){
			currentFileIndex = selectionFilesIndex[openedFileId];
			if(currentFileIndex >= 0){
				changeActiveItem(quickPick, currentFileIndex);
			}
		}
	}
}
function updateQuickPickItems(props = { forceUpdate: false}){
	var forceUpdate = props.forceUpdate;

	if(quickPick.busy){
		return;
	}

	if(isFiltering === null){
		if(quickPick.value.trim()){
			quickPick.items = storedItemsFilter;
			isFiltering = true;
		}else{
			quickPick.items = storedItems;
			isFiltering = false;
			reallyChangeActiveItem();
		}
		return;
	}

	if(quickPick.value.trim()){
		if(!isFiltering || forceUpdate){
			quickPick.items = storedItemsFilter;
			isFiltering = true;
		}
	}else{
		if(isFiltering || forceUpdate){
			quickPick.items = storedItems;
			isFiltering = false;
			reallyChangeActiveItem();
		}
	}
}

var fileData: ItemType[] = [];
function setItemsFromFiles(files = storedFiles){

	fileData = [];
	files.forEach(function (file){
		if(!projectRoot){return;}
		var isDir = file[file.length - 1] === '/';
		var lastIndex = file.lastIndexOf('/', isDir ? file.length - 2 : undefined);
		var filepath = file.substring(0, lastIndex + 1);
		var filename = file.substring(lastIndex + 1);

		/**
		 * To better sort the file's array, you should sort by the absolute filepath.
		 * And for that to work properly, you need to set all the dir names in uppercase at the filepath,
		 * and the filename to lowercase. pathToSort var will store this value.
		 */
		var pathToSort = filename;
		if(isDir){
			if(typeof storedDirs[file] === 'undefined'){
				storedDirs[file] = {
					isOpen: true
				};
			}
			pathToSort = pathToSort.toUpperCase();
		}else{
			pathToSort = pathToSort.toLowerCase();
		}
		pathToSort = filepath.toUpperCase() + pathToSort;

		if(typeof storedDirs[filepath] !== 'undefined' && !storedDirs[filepath].isOpen){
			return;
		}
		
		var extLastIndex: number | null = filename.lastIndexOf('.');
		extLastIndex = extLastIndex < 0 ? null : extLastIndex + 1;

		fileData.push({
			label: filename,
			dir: filepath.replace(projectRoot,''),
			file,
			isDir,
			pathToSort,
			ext: isDir ? '' : filename.slice(extLastIndex || 0)
		});
	});

	fileData.sort(function(a,b){
		return a.pathToSort === b.pathToSort
				? 0
				: a.pathToSort < b.pathToSort
					? -1
					: 1;
	});

	storedItems = [];
	storedItemsFilter = [];
	selectionFilesIndex = {};
	fileData.forEach(function ({label, dir, file, isDir, ext}, index){
		if(!projectRoot) {return;}

		var labelNoIcon = isDir ? label.slice(0, -1) : label;
		label = isDir
				? `${storedDirs[file].isOpen ? '-' : '+'}📂${label.slice(0, -1)}`
				: `📜${label}`;

		if(!isDir){
			storedItemsFilter.push({
				label,
				detail: dir + labelNoIcon,
				filename: file.replace(projectRoot,''),
				isDir
			} as QuickPickItem);
		}

		var foldersLength = dir.split('/').length - 2;
		for (var i = 0; i < foldersLength; i++) {
			label = '      ' + label;
		}

		let description = dir;
		let dirNoSlasheAtEdge = dir;
		dirNoSlasheAtEdge = (
			dirNoSlasheAtEdge[dirNoSlasheAtEdge.length - 1] === '/'
			? dirNoSlasheAtEdge.slice(0, -1)
			: dirNoSlasheAtEdge
		);
		dirNoSlasheAtEdge = (
			dirNoSlasheAtEdge[0] === '/'
			? dirNoSlasheAtEdge.slice(1)
			: dirNoSlasheAtEdge
		);
		let dirs = dirNoSlasheAtEdge.split('/');
		if(dirs.length >= 3){
			description = `.../${dirs[dirs.length - 2]}/${dirs[dirs.length - 1]}/`;
		}
		var filename = file.replace(projectRoot,'');
		storedItems.push({
			label,
			description: ' ' + description,
			filename,
			isDir
		} as QuickPickItem);

		selectionFilesIndex[filename] = index;
	});

	quickPick.busy = false;
	updateQuickPickItems({forceUpdate: true});
}

var reloadItems = false;
var isLoading = false;
function loadItems(){
	if(isLoading){
		reloadItems = true;
		return;
	}

	isLoading = true;
	getDirectories(function (err: any, res: string[] = []){
		if (err) {
			// threat error
		} else {
			var newStoredFiles = res;

			var filesHasChanged = false;
			if(newStoredFiles.length !== storedFiles.length){
				filesHasChanged = true;
			}else{
				var lookup: any = {};
				for (var j in newStoredFiles) {
					lookup[newStoredFiles[j]] = newStoredFiles[j];
				}

				for (var i in storedFiles) {
					if (typeof lookup[storedFiles[i]] === 'undefined') {
						filesHasChanged = true;
						break;
					} 
				}
			}

			storedFiles = res;
			if(filesHasChanged){
				setItemsFromFiles();
			}

			isLoading = false;
			if(reloadItems){
				reloadItems = false;
				loadItems();
			}
		}
	});
}

function getFileDataFromURL(url: string): [string,string,string] {
	var lastSlashIndex = url.lastIndexOf('/');
	var filename = url.slice(lastSlashIndex + 1);
	var lastDotIndex = filename.lastIndexOf('.');

	var filenameWithoutExt = filename.slice(0, lastDotIndex < 0 ? undefined : lastDotIndex);
	var extension = lastDotIndex >= 0  ? filename.slice(lastDotIndex + 1) : '';
	var filepathWithoutExt = url.slice(0, lastSlashIndex + 1) + filenameWithoutExt;
	
	return [filenameWithoutExt, extension, filepathWithoutExt];
}

function importFile(file: string){
	if(!openedFilename){return;}
	var lastIndex = openedFilename.lastIndexOf('/');
	var filepath = openedFilename.substring(0, lastIndex + 1);
	
	var importUrl = '';

	// import from the same or further dir of the opened file
	if(file.startsWith(filepath)){
		importUrl = `./${file.replace(filepath,'')}`;

	// import from a previous dir
	}else{
		var fileArr = file.split('/');
		var openedFilenameArr = openedFilename.split('/');
		var ignoreFrom = -1;
		for (var index = 0; index < openedFilenameArr.length; index++) {
			if(openedFilenameArr[index] !== fileArr[index] && ignoreFrom === -1){
				ignoreFrom = index;
			}else if(ignoreFrom >= 0){
				importUrl += '../';
			}
		}
		if(ignoreFrom === -1) {return;}

		importUrl += fileArr.slice(ignoreFrom).join('/');
	}

	var activeTextEditor = vscode.window.activeTextEditor;
	
	quickPick.hide();

	activeTextEditor?.edit(function (editor){
		if(!activeTextEditor){ return;}

		var lineNumber = (activeTextEditor.selection.active.line);
		var lineText = activeTextEditor.document.lineAt(lineNumber).text;
		
		var fileType = activeTextEditor.document.languageId;
		var [fileWithoutExt, fileExtension, filepathWithoutExt] = getFileDataFromURL(importUrl);
		fileWithoutExt = fileWithoutExt.replace(/[^\A-Za-z0-9_$]+/g, '');
		
		var isImportJS = false;
		if(
			(fileType === 'javascript' && fileExtension === 'js') ||
			(fileType === 'typescript' && ['js','ts','tsx'].includes(fileExtension)) ||
			(fileType  === 'typescriptreact' && ['js','ts','tsx'].includes(fileExtension))
		){
			importUrl = filepathWithoutExt;
			isImportJS = true;
		}

		if(lineText.trim() || !isImportJS){ // if current line is not empty or imported file is not JS
			editor.replace(activeTextEditor.selection, `'${importUrl}'`);
		}else{ // if current line is empty
			var firstCharPos = 0;
			var latCharPos = 0;

			// insert text on line start
			activeTextEditor.selection = new vscode.Selection(
				lineNumber, firstCharPos, 
				lineNumber, latCharPos
			);
			
			var importText = `import ${fileWithoutExt} from '${importUrl}';`;
			editor.replace(activeTextEditor.selection, importText);

			firstCharPos = 'import '.length,
			latCharPos = 'import '.length + fileWithoutExt.length;
			setTimeout(function (){
				if(!activeTextEditor) {return;}

				activeTextEditor.selection = new vscode.Selection(
					lineNumber, firstCharPos, 
					lineNumber, latCharPos
				);
			}, 10);
		}
	});
}

interface ItemData extends QuickPickItem{
	filename: string;
	isDir: boolean;
}
var currentFile: ItemData | null = null;
quickPick.onDidChangeActive(function (selection){
	if(selection.length){
		currentFile = selection[0] as ItemData;
	}else{
		currentFile = null;
	}
});

quickPick.onDidAccept(function(){
	if(!currentFile) {return;}

	if(!currentFile.isDir){
		importFile(currentFile.filename);
	}
});

quickPick.onDidChangeValue(function (){
	updateQuickPickItems();
});

export function activate(context: vscode.ExtensionContext){

	context.subscriptions.push(commands.registerCommand('js-relative-path.showinput', function(){
		if(!projectRoot){
			var [newProjectRoot, newOpenedFilename] = getPaths();
			projectRoot = newProjectRoot;
			openedFilename = newOpenedFilename;
		}else{
			var newOpenedFilename = getPaths()[1];
			openedFilename = newOpenedFilename;
		}
		quickPick.show();
		loadItems();
		// since quickPick.show() always clear the items, you have to force items update every time it is called
		updateQuickPickItems({forceUpdate: true});
	}));
};

export function deactivate(){};