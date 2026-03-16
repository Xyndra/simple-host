import { json } from '@sveltejs/kit';
import { addSite, DATA_DIR } from '$lib/server/servers';
import type { RequestHandler } from './$types';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const name = formData.get('name') as string;
		const port = parseInt(formData.get('port') as string, 10);

		if (!file || !name || isNaN(port)) {
			return json({ error: 'Missing required fields: file, name, port' }, { status: 400 });
		}

		if (port < 1024 || port > 65535) {
			return json({ error: 'Port must be between 1024 and 65535' }, { status: 400 });
		}

		const siteId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const siteDir = path.join(DATA_DIR, siteId);

		fs.mkdirSync(siteDir, { recursive: true });

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const zip = new AdmZip(buffer);
		zip.extractAllTo(siteDir, true);

		const site = addSite(name, port, siteDir);

		return json({ success: true, site });
	} catch (err) {
		console.error('Upload error:', err);
		return json({ error: 'Failed to process upload' }, { status: 500 });
	}
};
