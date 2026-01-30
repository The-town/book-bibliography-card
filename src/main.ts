import { Plugin, requestUrl } from 'obsidian';

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

export default class BookBibliographyCardPlugin extends Plugin {
	onload() {
		this.registerMarkdownCodeBlockProcessor('isbn', async (source, el, ctx) => {
			const isbn = normalizeIsbn(source);
			if (!isbn) {
				el.createEl('p', { text: 'Please enter an ISBN.', cls: 'openbd-error' });
				return;
			}

			const card = el.createEl('div', { cls: 'openbd-card' });
			card.createEl('p', { text: 'Loading...', cls: 'openbd-loading' });

			try {
				const res = await requestUrl(`${OPENBD_API}?isbn=${encodeURIComponent(isbn)}`);
				const data = await res.json;

				card.empty();
				if (!Array.isArray(data) || data.length === 0 || !data[0]) {
					card.createEl('p', { text: 'Bibliographic information not found.', cls: 'openbd-error' });
					return;
				}

				const summary = (data[0] as { summary?: OpenBDSummary }).summary;
				if (!summary) {
					card.createEl('p', { text: 'Bibliographic information is not available.', cls: 'openbd-error' });
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
				card.createEl('p', { text: `Failed to retrieve data: ${e instanceof Error ? e.message : String(e)}`, cls: 'openbd-error' });
			}
		});
	}
}