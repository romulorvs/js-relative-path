import { commands, window, QuickPickItem, Selection, ExtensionContext } from 'vscode';
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
					dot: true, // hidden files
					nosort: true,
					mark: true,
					ignore: [

						/**
						 * Folders
						 */
						// excluding hidden folders
						projectRoot + '/.*/**/',
						projectRoot + '/.*/**/*',
						
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
						// projectRoot + '/PUBLIC/**',
						// projectRoot + '/public/**',
						projectRoot + '/OUT/**',
						projectRoot + '/out/**',
						projectRoot + '/DIST/**',
						projectRoot + '/dist/**',

						/**
						 * Root Files
						 */
						projectRoot + '/*LICENSE*',
						projectRoot + '/*license*',
						projectRoot + '/*config*',
						projectRoot + '/*setup*',
						projectRoot + '/*ignore*',
						// projectRoot + '/.*', // files in the root that starts with dot (hidden files in the root dir)
						projectRoot + '/*.tmpl',
						projectRoot + '/*.lock',
						projectRoot + '/*.json',
						projectRoot + '/*.log',
						projectRoot + '/*.md',
						projectRoot + '/*.vsix',

						/**
						 * Max dir levels to search
						 */
						ignoreLevels
					]
				},
				callback
			);
		} catch (error) {
			callback(error);		
		}
	} else {
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

function reallyChangeActiveItem() {
	if(projectRoot && openedFilename) {
		var openedFileId = openedFilename.replace(projectRoot, '');
		if(typeof selectionFilesIndex[openedFileId] !== 'undefined') {
			currentFileIndex = selectionFilesIndex[openedFileId];
			if(currentFileIndex >= 0) {
				changeActiveItem(quickPick, currentFileIndex);
			}
		}
	}
}
function updateQuickPickItems(props: {forceUpdate?: boolean} = {forceUpdate: false}) {
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

const getImportTypeLabel = () => (
	importType === 'require'
		? 'change from "Require" to "Import...From"'
		: 'change from "Import...From" to "Require"'
);

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
		 * And for that to work properly, you need to set all the dir names in uppercase
		 * at the filepath, and the filename to lowercase (this will help to keep the
		 * directories above them the files below). pathToSort var will store this value.
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

	storedItems = [{
		label: getImportTypeLabel(),
		detail: '',
		filename: '%%import_change%%',
		isDir: false
	} as QuickPickItem];
	storedItemsFilter = [];
	selectionFilesIndex = {};	
	fileData.forEach(function ({label, dir, file, isDir, ext}, index){
		if(!projectRoot) {return;}

		var labelNoIcon = isDir ? label.slice(0, -1) : label;
		label = isDir
				? `📂 ${label.slice(0, -1)}`
				: `$(file) ${label}`;

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
			label = '     ' + label;
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

function normalizeFilename(fileWithoutExt: string, fileExtension: string){
	return fileWithoutExt.replace(/[^\A-Za-z0-9_$]+/g, ' ').split(' ').reduce((total, current, index) => {
		if(index === 0 && !['jsx','tsx'].includes(fileExtension)) {
			return `${total}${current}`;
		}
		const camelCaseWord = current.charAt(0).toUpperCase() + current.slice(1);
		return `${total}${camelCaseWord}`;
	}, '');
}

function importFile(file: string, isDir: boolean = false){

	if(isDir){
		file = `${file}index.js`;
	}

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

	var activeTextEditor = window.activeTextEditor;
	
	quickPick.hide();

	activeTextEditor?.edit(function (editor){
		if(!activeTextEditor){ return;}

		var lineNumber = (activeTextEditor.selection.active.line);
		var lineText = activeTextEditor.document.lineAt(lineNumber).text;
		
		var fileType = activeTextEditor.document.languageId;
		var [fileWithoutExt, fileExtension, filepathWithoutExt] = getFileDataFromURL(importUrl);
		
		var isImportJS = false;
		if(
			(fileType === 'javascript' && ['js'].includes(fileExtension)) ||
			(fileType === 'javascriptreact' && ['js'].includes(fileExtension)) ||
			(fileType === 'typescript' && ['js','jsx','ts','tsx'].includes(fileExtension)) ||
			(fileType  === 'typescriptreact' && ['js','jsx','ts','tsx'].includes(fileExtension))
		){
			importUrl = filepathWithoutExt;
			isImportJS = true;

			if(fileWithoutExt === 'index'){
				if(importUrl !== `./${fileWithoutExt}`){
					importUrl = importUrl.substr(0, importUrl.lastIndexOf('/'));
					fileWithoutExt = importUrl.substr(importUrl.lastIndexOf('/')+1);
					if(fileWithoutExt === '.' || fileWithoutExt === '..'){
						fileWithoutExt = 'index';
					}
				}
			}
		}

		fileWithoutExt = normalizeFilename(fileWithoutExt, fileExtension);

		if(fileWithoutExt.toLowerCase() === 'index'){
			if(importUrl.toLowerCase() !== `./index`){
				let newImportUrl = importUrl;
				newImportUrl = newImportUrl.substr(0, newImportUrl.lastIndexOf('/'));
				const newFileWithoutExt = newImportUrl.substr(newImportUrl.lastIndexOf('/')+1);
				if(newFileWithoutExt === '.' || newFileWithoutExt === '..'){
					// do nothing
				}else{
					fileWithoutExt = newFileWithoutExt;
					fileWithoutExt = normalizeFilename(fileWithoutExt, fileExtension);
				}
			}
		}

		if(lineText.trim()){ // if current line is not empty
			editor.replace(activeTextEditor.selection, `'${importUrl}'`);
		}else{ // if current line is empty
			var firstCharPos = 0;
			var lastCharPos = 0;

			// insert text on line start
			activeTextEditor.selection = new Selection(
				lineNumber, firstCharPos, 
				lineNumber, lastCharPos
			);
			
			if(importType === 'require') {
				var importText = `const ${fileWithoutExt} = require('${importUrl}');`;
				firstCharPos = 'const '.length,
				lastCharPos = 'const '.length + fileWithoutExt.length;
			} else {
				var importText = `import ${fileWithoutExt} from '${importUrl}';`;
				firstCharPos = 'import '.length,
				lastCharPos = 'import '.length + fileWithoutExt.length;
			}

			editor.replace(activeTextEditor.selection, importText);

			setTimeout(function (){
				if(!activeTextEditor) {return;}

				activeTextEditor.selection = new Selection(
					lineNumber, firstCharPos, 
					lineNumber, lastCharPos
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

let importType: string | undefined;
let context: ExtensionContext;
function setImportType(value: any = ''){
	importType = value;
	context.globalState.update('@JSRImport:ImportType', value);
}
function changeImportType(){
	if(storedItems && storedItems.length > 0){
		const item = storedItems[0] as any;

		if(item.filename === '%%import_change%%'){

			if(importType === 'require') {
				setImportType('import');
				window.showInformationMessage('using "Import...From"');
			} else {
				setImportType('require');
				window.showInformationMessage('using "Require"');
			}

			const firstStoredItem = {
				...item,
				label: getImportTypeLabel() 
			} as QuickPickItem;

			storedItems[0] = firstStoredItem;

			updateQuickPickItems({forceUpdate: true});
		}
	}

	quickPick.hide();
}

quickPick.onDidAccept(function(){
	if(!currentFile) {return;}

	if(currentFile.filename === '%%import_change%%'){
		changeImportType();
	} else {
		importFile(currentFile.filename, currentFile.isDir);
	}
});

quickPick.onDidChangeValue(function (){
	updateQuickPickItems();
});

var pickImportType = window.createQuickPick();
pickImportType.placeholder = 'Choose the import method below (You can change it later):';
pickImportType.onDidAccept(() => {
	const { type } = pickImportType.selectedItems[0] as any;
	setImportType(type);
	pickImportType.dispose();
	runExtension();
});

function runImportSelector(){
	pickImportType.items = [
		{ label: 'import...from', type: 'import' } as QuickPickItem,
		{ label: 'require', type: 'require' } as QuickPickItem,
	];
	pickImportType.show();
}

const runExtension = () => {
	if(!projectRoot){
		var [newProjectRoot, newOpenedFilename] = getPaths();
		projectRoot = newProjectRoot;
		openedFilename = newOpenedFilename;
	} else {
		var newOpenedFilename = getPaths()[1];
		openedFilename = newOpenedFilename;
	}
	quickPick.show();
	loadItems();
	// since quickPick.show() always clear the items, you have to force items update every time it is called
	updateQuickPickItems({forceUpdate: true});
};

export function activate(extContext: ExtensionContext) {
	context = extContext;
	
	setImportType(context.globalState.get('@JSRImport:ImportType'));

	context.subscriptions.push(commands.registerCommand('js-relative-import.showinput', () => {

		if(!importType){
			runImportSelector();
		}else{
			runExtension();
		}
	}));
}

export function deactivate() {}
