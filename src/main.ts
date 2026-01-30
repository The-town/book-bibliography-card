import { Plugin } from 'obsidian';

const OPENBD_API = 'https://api.openbd.jp/v1/get';

interface OpenBDSummary {
	isbn: string;
	title: string;
	volume?: string;
	series?: string;
	publisher: string;
	pubdate: string;
	cover: string;
	author: string;
}

function normalizeIsbn(source: string): string {
	return source.trim().replace(/-/g, '');
}

const CARD_CSS = `
.openbd-card { margin: 1em 0; }
.openbd-card-inner {
	display: flex;
	gap: 1.25em;
	align-items: flex-start;
	padding: 1.25em;
	border: none;
	border-radius: 12px;
	background: var(--background-secondary);
	box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
	transition: box-shadow 0.2s ease, transform 0.2s ease;
	position: relative;
	overflow: hidden;
}
.openbd-card-inner::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 3px;
	background: linear-gradient(180deg, var(--interactive-accent), var(--interactive-accent-hover));
	border-radius: 12px 0 0 12px;
}
.openbd-card-inner:hover {
	box-shadow: 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
}
.openbd-cover {
	flex-shrink: 0;
	line-height: 0;
	margin-left: 4px;
}
.openbd-cover img {
	display: block;
	max-height: 160px;
	width: auto;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.openbd-card-inner:hover .openbd-cover img {
	transform: translateY(-2px);
	box-shadow: 0 8px 20px rgba(0,0,0,0.14), 0 4px 8px rgba(0,0,0,0.06);
}
.openbd-meta {
	flex: 1;
	min-width: 0;
	font-size: 0.925em;
	letter-spacing: 0.01em;
}
.openbd-title {
	font-weight: 700;
	font-size: 1.05em;
	margin-bottom: 0.5em;
	line-height: 1.35;
	letter-spacing: -0.01em;
	color: var(--text-normal);
}
.openbd-author {
	color: var(--text-muted);
	font-size: 0.9em;
	margin-top: 0.25em;
	font-weight: 500;
}
.openbd-publisher, .openbd-pubdate {
	color: var(--text-faint);
	font-size: 0.85em;
	margin-top: 0.15em;
}
.openbd-loading, .openbd-error {
	color: var(--text-muted);
	margin: 0.5em 0;
	font-size: 0.9em;
}
.openbd-error { color: var(--text-error); }
`;

export default class ExamplePlugin extends Plugin {
	private styleEl: HTMLStyleElement | null = null;

	private addStyle(): void {
		this.styleEl = document.createElement('style');
		this.styleEl.textContent = CARD_CSS;
		document.head.appendChild(this.styleEl);
	}

	async onload() {
		this.addStyle();
		this.registerMarkdownCodeBlockProcessor('isbn', async (source, el, ctx) => {
			const isbn = normalizeIsbn(source);
			if (!isbn) {
				el.createEl('p', { text: 'ISBNを入力してください。', cls: 'openbd-error' });
				return;
			}

			const card = el.createEl('div', { cls: 'openbd-card' });
			card.createEl('p', { text: '取得中…', cls: 'openbd-loading' });

			try {
				const res = await fetch(`${OPENBD_API}?isbn=${encodeURIComponent(isbn)}`);
				const data = await res.json();

				card.empty();
				if (!Array.isArray(data) || data.length === 0 || !data[0]) {
					card.createEl('p', { text: '書誌情報が見つかりませんでした。', cls: 'openbd-error' });
					return;
				}

				const summary = (data[0] as { summary?: OpenBDSummary }).summary;
				if (!summary) {
					card.createEl('p', { text: '書誌情報がありません。', cls: 'openbd-error' });
					return;
				}

				// カード本体
				const inner = card.createEl('div', { cls: 'openbd-card-inner' });

				// 書影
				if (summary.cover) {
					const coverWrap = inner.createEl('div', { cls: 'openbd-cover' });
					const img = coverWrap.createEl('img', { attr: { src: summary.cover, alt: summary.title } });
					img.onerror = () => coverWrap.remove();
				}

				const meta = inner.createEl('div', { cls: 'openbd-meta' });
				if (summary.title) meta.createEl('div', { cls: 'openbd-title', text: summary.title });
				if (summary.author) meta.createEl('div', { cls: 'openbd-author', text: `著: ${summary.author}` });
				if (summary.publisher) meta.createEl('div', { cls: 'openbd-publisher', text: summary.publisher });
				if (summary.pubdate) {
					const d = summary.pubdate;
					const pubdateStr = d.length >= 8 ? `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6, 8)}` : d;
					meta.createEl('div', { cls: 'openbd-pubdate', text: pubdateStr });
				}
			} catch (e) {
				card.empty();
				card.createEl('p', { text: `取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`, cls: 'openbd-error' });
			}
		});
	}

	onunload() {
		this.styleEl?.remove();
		this.styleEl = null;
	}
}