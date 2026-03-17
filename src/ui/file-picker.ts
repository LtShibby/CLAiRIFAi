import { execFile } from 'node:child_process';
import { platform } from 'node:os';

const SUPPORTED_EXTENSIONS = ['txt', 'srt', 'vtt', 'md'];

/**
 * Opens a native file picker dialog and returns the selected file path.
 * Returns null if the user cancels or the platform is unsupported.
 */
export function openFilePicker(): Promise<string | null> {
	const os = platform();

	if (os === 'win32') {
		return openWindows();
	} else if (os === 'darwin') {
		return openMacOS();
	} else {
		return openLinux();
	}
}

function openWindows(): Promise<string | null> {
	const filter = SUPPORTED_EXTENSIONS.map(ext => `*.${ext}`).join(';');
	const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select a transcript file'
$dialog.Filter = 'Transcript files (${filter})|${filter}|All files (*.*)|*.*'
$dialog.FilterIndex = 1
if ($dialog.ShowDialog() -eq 'OK') { $dialog.FileName } else { '' }
`;
	return new Promise((resolve) => {
		execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], (err, stdout) => {
			if (err) {
				resolve(null);
				return;
			}
			const result = stdout.trim();
			resolve(result || null);
		});
	});
}

function openMacOS(): Promise<string | null> {
	const typeList = SUPPORTED_EXTENSIONS.map(ext => `"${ext}"`).join(', ');
	const script = `
set chosenFile to choose file with prompt "Select a transcript file" of type {${typeList}}
return POSIX path of chosenFile
`;
	return new Promise((resolve) => {
		execFile('osascript', ['-e', script], (err, stdout) => {
			if (err) {
				resolve(null);
				return;
			}
			const result = stdout.trim();
			resolve(result || null);
		});
	});
}

function openLinux(): Promise<string | null> {
	const filter = SUPPORTED_EXTENSIONS.map(ext => `*.${ext}`).join(' ');
	return new Promise((resolve) => {
		// Try zenity first, then kdialog
		execFile('zenity', [
			'--file-selection',
			'--title=Select a transcript file',
			`--file-filter=Transcript files | ${filter}`,
			'--file-filter=All files | *',
		], (err, stdout) => {
			if (!err) {
				const result = stdout.trim();
				resolve(result || null);
				return;
			}
			// Fallback to kdialog
			execFile('kdialog', [
				'--getopenfilename',
				'.',
				`${filter}`,
				'--title',
				'Select a transcript file',
			], (err2, stdout2) => {
				if (err2) {
					resolve(null);
					return;
				}
				const result = stdout2.trim();
				resolve(result || null);
			});
		});
	});
}
