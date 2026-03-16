import { EventEmitter } from 'node:events';
import type { Readable } from 'node:stream';

const MAX_BUFFER_LINES = 50;

export class OutputWatcher extends EventEmitter {
	private buffer = '';
	readonly lines: string[] = [];
	private chunks: string[] = [];

	constructor(stream: Readable) {
		super();

		stream.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			this.chunks.push(text);
			this.buffer += text;

			const parts = this.buffer.split('\n');
			this.buffer = parts.pop() ?? '';

			for (const line of parts) {
				this.addLine(line);
			}
		});

		stream.on('end', () => {
			if (this.buffer.length > 0) {
				this.addLine(this.buffer);
				this.buffer = '';
			}
			this.emit('end');
		});
	}

	/** Full collected stdout — used to extract stage output after process exits. */
	get collectedOutput(): string {
		return this.chunks.join('');
	}

	private addLine(line: string): void {
		this.lines.push(line);

		if (this.lines.length > MAX_BUFFER_LINES) {
			this.lines.shift();
		}

		this.emit('line', line);
	}
}
