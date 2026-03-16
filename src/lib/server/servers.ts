import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface StaticServer {
	id: string;
	name: string;
	port: number;
	status: 'running' | 'stopped' | 'error';
	process?: ChildProcess;
	siteDir: string;
	createdAt: string;
}

const servers = new Map<string, StaticServer>();
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), '..', 'static-sites');
const SITES_FILE = path.join(DATA_DIR, 'sites.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function persistSites() {
	ensureDataDir();
	const data = Array.from(servers.values()).map(s => ({
		id: s.id,
		name: s.name,
		port: s.port,
		status: s.process ? 'running' : 'stopped',
		siteDir: s.siteDir,
		createdAt: s.createdAt
	}));
	fs.writeFileSync(SITES_FILE, JSON.stringify(data, null, 2));
}

export function loadSites() {
	ensureDataDir();
	if (fs.existsSync(SITES_FILE)) {
		const data = JSON.parse(fs.readFileSync(SITES_FILE, 'utf-8'));
		for (const site of data) {
			servers.set(site.id, { ...site, status: 'stopped' });
		}
	}
}

export function getSites(): Omit<StaticServer, 'process'>[] {
	return Array.from(servers.values()).map(s => ({
		id: s.id,
		name: s.name,
		port: s.port,
		status: s.process ? 'running' : 'stopped',
		siteDir: s.siteDir,
		createdAt: s.createdAt
	}));
}

export function addSite(name: string, port: number, siteDir: string): StaticServer {
	const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const server: StaticServer = {
		id,
		name,
		port,
		status: 'stopped',
		siteDir,
		createdAt: new Date().toISOString()
	};
	servers.set(id, server);
	persistSites();
	return server;
}

export function removeSite(id: string): boolean {
	const server = servers.get(id);
	if (!server) return false;
	if (server.process) {
		server.process.kill();
	}
	servers.delete(id);
	if (fs.existsSync(server.siteDir)) {
		fs.rmSync(server.siteDir, { recursive: true, force: true });
	}
	persistSites();
	return true;
}

export function startServer(id: string): boolean {
	const server = servers.get(id);
	if (!server) return false;
	if (server.process) return true;

	const serveEntry = path.resolve(process.cwd(), 'node_modules', 'serve', 'build', 'main.js');
	const childProcess = spawn('node', [serveEntry, '--no-clipboard', '-l', String(server.port), server.siteDir], {
		detached: false,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: { ...process.env, PORT: String(server.port) }
	});

	childProcess.on('error', (err) => {
		console.error(`Server ${id} error:`, err);
		server.status = 'error';
		server.process = undefined;
	});

	childProcess.on('exit', () => {
		server.status = 'stopped';
		server.process = undefined;
		persistSites();
	});

	server.process = childProcess;
	server.status = 'running';
	persistSites();
	return true;
}

export function stopServer(id: string): boolean {
	const server = servers.get(id);
	if (!server || !server.process) return false;
	server.process.kill();
	server.process = undefined;
	server.status = 'stopped';
	persistSites();
	return true;
}

export { DATA_DIR };
