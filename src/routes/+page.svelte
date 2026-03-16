<script lang="ts">
	import { onMount } from 'svelte';
	import { Upload, Globe, Trash2, Play, Square, RefreshCw, FolderOpen, Server, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-svelte';

	interface Site {
		id: string;
		name: string;
		port: number;
		status: 'running' | 'stopped' | 'error';
		siteDir: string;
		createdAt: string;
	}

	interface PortRange {
		label: string;
		start: number;
		end: number;
	}

	const MANAGEMENT_PORT = 5500;

	const PORT_RANGES: PortRange[] = [
		{ label: '4050-4170 (121 ports)', start: 4050, end: 4170 },
		{ label: '4330-4420 (91 ports)', start: 4330, end: 4420 },
		{ label: '4450-4495 (46 ports)', start: 4450, end: 4495 }
	];

	let sites = $state<Site[]>([]);
	let uploading = $state(false);
	let loading = $state(false);
	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let siteName = $state('');
	let selectedRangeIndex = $state(0);
	let selectedPort = $state(PORT_RANGES[0].start);
	let error = $state('');
	let success = $state('');
	let showUploadModal = $state(false);
	let showPortHelp = $state(false);

	let currentRange = $derived(PORT_RANGES[selectedRangeIndex]);

	$effect(() => {
		const range = PORT_RANGES[selectedRangeIndex];
		if (selectedPort < range.start || selectedPort > range.end) {
			selectedPort = range.start;
		}
	});

	function onRangeChange(e: Event) {
		const idx = parseInt((e.target as HTMLSelectElement).value);
		selectedRangeIndex = idx;
		selectedPort = PORT_RANGES[idx].start;
	}

	async function fetchSites() {
		loading = true;
		try {
			const res = await fetch('/api/sites');
			sites = await res.json();
		} catch (e) {
			error = 'Failed to fetch sites';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchSites();
		const interval = setInterval(fetchSites, 5000);
		return () => clearInterval(interval);
	});

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file && file.name.endsWith('.zip')) {
			selectedFile = file;
			if (!siteName) {
				siteName = file.name.replace('.zip', '');
			}
			showUploadModal = true;
		} else {
			error = 'Please upload a .zip file';
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			selectedFile = file;
			if (!siteName) {
				siteName = file.name.replace('.zip', '');
			}
			showUploadModal = true;
		}
	}

	async function uploadSite() {
		if (!selectedFile || !siteName) {
			error = 'Please provide a name and file';
			return;
		}

		uploading = true;
		error = '';
		success = '';

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('name', siteName);
			formData.append('port', String(selectedPort));

			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();
			if (data.success) {
				success = `Site "${siteName}" uploaded on port ${selectedPort}!`;
				selectedFile = null;
				siteName = '';
				selectedPort = PORT_RANGES[0].start;
				selectedRangeIndex = 0;
				showUploadModal = false;
				await fetchSites();
			} else {
				error = data.error || 'Upload failed';
			}
		} catch (e) {
			error = 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	async function toggleServer(site: Site) {
		try {
			const action = site.status === 'running' ? 'stop' : 'start';
			await fetch('/api/sites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: site.id, action })
			});
			await fetchSites();
		} catch (e) {
			error = 'Failed to toggle server';
		}
	}

	async function deleteSite(site: Site) {
		if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
		try {
			await fetch('/api/sites', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: site.id })
			});
			await fetchSites();
		} catch (e) {
			error = 'Failed to delete site';
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString();
	}
</script>

<svelte:head>
	<title>Simple Host - Static Site Manager</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-5xl">
	<div class="text-center mb-8">
		<div class="flex items-center justify-center gap-3 mb-2">
			<FolderOpen class="w-10 h-10 text-primary" />
			<h1 class="text-4xl font-bold">Simple Host</h1>
		</div>
		<p class="text-base-content/60">Upload static sites and serve them on any port</p>
		<p class="text-base-content/40 text-sm mt-1">Management: port {MANAGEMENT_PORT}</p>
	</div>

	{#if error}
		<div class="alert alert-error mb-4">
			<AlertCircle class="w-5 h-5" />
			<span>{error}</span>
			<button class="btn btn-ghost btn-sm" onclick={() => error = ''}>Dismiss</button>
		</div>
	{/if}

	{#if success}
		<div class="alert alert-success mb-4">
			<CheckCircle class="w-5 h-5" />
			<span>{success}</span>
			<button class="btn btn-ghost btn-sm" onclick={() => success = ''}>Dismiss</button>
		</div>
	{/if}

	<div
		class="card bg-base-100 shadow-xl mb-8 transition-all duration-200 {dragOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-200 scale-[1.01]' : ''}"
		role="button"
		tabindex="0"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
	>
		<div class="card-body items-center text-center py-12">
			<Upload class="w-12 h-12 text-primary mb-4 {dragOver ? 'animate-bounce' : ''}" />
			<h2 class="card-title">Upload Static Site</h2>
			<p class="text-base-content/60 mb-4">Drag & drop a .zip file here, or click to browse</p>
			<label class="btn btn-primary">
				<Upload class="w-4 h-4 mr-2" />
				Choose ZIP File
				<input type="file" accept=".zip" class="hidden" onchange={handleFileSelect} />
			</label>
		</div>
	</div>

	<div class="flex items-center justify-between mb-4">
		<h2 class="text-2xl font-semibold flex items-center gap-2">
			<Server class="w-6 h-6" />
			Your Sites
		</h2>
		<button class="btn btn-ghost btn-sm" onclick={fetchSites} disabled={loading}>
			<RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
		</button>
	</div>

	{#if loading && sites.length === 0}
		<div class="flex justify-center py-12">
			<Loader2 class="w-8 h-8 animate-spin text-primary" />
		</div>
	{:else if sites.length === 0}
		<div class="card bg-base-100 shadow">
			<div class="card-body items-center text-center py-12">
				<Globe class="w-16 h-16 text-base-content/20 mb-4" />
				<p class="text-base-content/40 text-lg">No sites yet</p>
				<p class="text-base-content/30">Upload a ZIP file to get started</p>
			</div>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each sites as site (site.id)}
				<div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
					<div class="card-body">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="card-title text-lg">{site.name}</h3>
									<div class="badge {site.status === 'running' ? 'badge-success' : site.status === 'error' ? 'badge-error' : 'badge-ghost'}">
										{site.status}
									</div>
								</div>
								<div class="flex items-center gap-4 text-sm text-base-content/60">
									<span class="flex items-center gap-1">
										<Globe class="w-4 h-4" />
										Port: {site.port}
									</span>
									<span>Created: {formatDate(site.createdAt)}</span>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if site.status === 'running'}
									<a
										href="http://localhost:{site.port}"
										target="_blank"
										rel="noopener noreferrer"
										class="btn btn-outline btn-sm"
									>
										<Globe class="w-4 h-4" />
										Visit
									</a>
								{/if}
								<button
									class="btn {site.status === 'running' ? 'btn-warning' : 'btn-success'} btn-sm"
									onclick={() => toggleServer(site)}
								>
									{#if site.status === 'running'}
										<Square class="w-4 h-4" />
										Stop
									{:else}
										<Play class="w-4 h-4" />
										Start
									{/if}
								</button>
								<button class="btn btn-ghost btn-sm text-error" onclick={() => deleteSite(site)}>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showUploadModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4 flex items-center gap-2">
				<Upload class="w-5 h-5" />
				Configure Your Site
			</h3>
			<div class="form-control mb-4">
				<label class="label" for="site-name">
					<span class="label-text">Site Name</span>
				</label>
				<input
					id="site-name"
					type="text"
					class="input input-bordered w-full"
					placeholder="my-awesome-site"
					bind:value={siteName}
				/>
			</div>
			<div class="form-control mb-4">
				<label class="label" for="port-range">
					<span class="label-text">Port Range</span>
					<span class="label-text-alt">
						<button
							class="btn btn-ghost btn-xs p-0"
							onclick={() => showPortHelp = !showPortHelp}
							aria-label="Show port help"
						>
							<Info class="w-3 h-3" />
						</button>
					</span>
				</label>
				<select id="port-range" class="select select-bordered w-full" value={selectedRangeIndex} onchange={onRangeChange}>
					{#each PORT_RANGES as range, i}
						<option value={i}>{range.label}</option>
					{/each}
				</select>
			</div>
			<div class="form-control mb-4">
				<label class="label" for="port-slider">
					<span class="label-text">Port: <span class="font-mono font-bold text-primary">{selectedPort}</span></span>
					<span class="label-text-alt">{currentRange.start} - {currentRange.end}</span>
				</label>
				<input
					id="port-slider"
					type="range"
					class="range range-primary"
					min={currentRange.start}
					max={currentRange.end}
					step="1"
					bind:value={selectedPort}
				/>
				<div class="flex justify-between text-xs text-base-content/40 px-1 mt-1">
					<span>{currentRange.start}</span>
					<span>{currentRange.end}</span>
				</div>
			</div>
			{#if showPortHelp}
				<div class="alert alert-info mb-4 text-sm">
					<Info class="w-4 h-4" />
					<div>
						<p class="font-semibold">How port selection works</p>
						<p>Pick a range from the dropdown, then slide to choose your exact port. Only ports within exposed Docker ranges work.</p>
					</div>
				</div>
			{/if}
			{#if selectedFile}
				<div class="alert alert-info mb-4">
					<FolderOpen class="w-5 h-5" />
					<span>File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
				</div>
			{/if}
			<div class="modal-action">
				<button class="btn btn-ghost" onclick={() => { showUploadModal = false; selectedFile = null; }}>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={uploadSite} disabled={uploading || !siteName}>
					{#if uploading}
						<Loader2 class="w-4 h-4 animate-spin" />
						Uploading...
					{:else}
						<Upload class="w-4 h-4" />
						Upload & Deploy
					{/if}
				</button>
			</div>
		</div>
		<button class="modal-backdrop" onclick={() => { showUploadModal = false; selectedFile = null; }} aria-label="Close modal"></button>
	</div>
{/if}

<footer class="text-center py-8 text-base-content/40 text-sm">
	<p>Simple Host &mdash; Self-hosted static site manager</p>
</footer>
