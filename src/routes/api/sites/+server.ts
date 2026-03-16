import { json } from '@sveltejs/kit';
import { getSites, addSite, removeSite, startServer, stopServer, DATA_DIR } from '$lib/server/servers';
import type { RequestHandler } from './$types';
import path from 'path';
import fs from 'fs';

export const GET: RequestHandler = async () => {
	return json(getSites());
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();
	const success = removeSite(id);
	return json({ success });
};

export const POST: RequestHandler = async ({ request }) => {
	const { id, action } = await request.json();
	if (action === 'start') {
		const success = startServer(id);
		return json({ success });
	} else if (action === 'stop') {
		const success = stopServer(id);
		return json({ success });
	}
	return json({ error: 'Invalid action' }, { status: 400 });
};
