const PAGE_SIZE = 20;
window.scanResults = {};

function getPaginatedData(items, page) {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
}

function renderPaginationControls(scanId, type, page, total) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return '';

    return `
        <div class="pagination-controls" style="margin-top: 10px; display: flex; gap: 5px; align-items: center; justify-content: center;">
            <button ${page === 1 ? 'disabled' : ''} onclick="changePage('${type}', ${scanId}, ${page - 1})" style="padding: 4px 12px; background: #334155; border: 1px solid #475569; color: white; border-radius: 4px; cursor: pointer;">&laquo; Prev</button>
            <span style="font-size: 0.9em; color: #94a3b8; margin: 0 10px;">Page ${page} of ${totalPages}</span>
            <button ${page === totalPages ? 'disabled' : ''} onclick="changePage('${type}', ${scanId}, ${page + 1})" style="padding: 4px 12px; background: #334155; border: 1px solid #475569; color: white; border-radius: 4px; cursor: pointer;">Next &raquo;</button>
        </div>
    `;
}

function changePage(type, scanId, page) {
    if (type === 'subdomain') {
        renderSubdomainContent(scanId, page);
    } else if (type === 'sherlock') {
        renderSherlockContent(scanId, page);
    }
}

function renderSubdomainContent(scanId, page = 1) {
    const data = window.scanResults[scanId];
    if (!data || !data.subdomains) return;
    
    const items = data.subdomains;
    const pageItems = getPaginatedData(items, page);
    
    const html = `
        <div style="margin-top:5px">Found ${items.length} subdomains:</div>
        <ul style="margin-top:5px; padding-left: 20px;">
            ${pageItems.map(d => `<li>${d}</li>`).join('')}
        </ul>
        ${renderPaginationControls(scanId, 'subdomain', page, items.length)}
    `;
    
    const container = document.getElementById(`subdomain-result-${scanId}`);
    if (container) container.innerHTML = html;
}

function renderSherlockContent(scanId, page = 1) {
    const data = window.scanResults[scanId];
    if (!data || !data.sherlock_data) return;
    
    const entries = Object.entries(data.sherlock_data);
    const pageItems = getPaginatedData(entries, page);
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';
    for (const [site, url] of pageItems) {
            html += `
            <a href="${url}" target="_blank" style="text-decoration: none;">
                <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: #60a5fa; font-size: 1.1em; display: block;">${site}</strong>
                    <div style="font-size: 0.8em; color: #9ca3af; word-break: break-all; margin-top: 4px;">${url}</div>
                </div>
            </a>
            `;
    }
    html += '</div>';
    html += renderPaginationControls(scanId, 'sherlock', page, entries.length);
    
    const container = document.getElementById(`sherlock-result-${scanId}`);
    if (container) container.innerHTML = html;
}

function formatResult(scan) {
    let data;
    try {
        data = typeof scan.result === 'string' ? JSON.parse(scan.result) : scan.result;
    } catch (e) {
        return `<div class="result-box">${scan.result}</div>`;
    }

    if (data.error) {
        return `<div style="color: #ef4444">Error: ${data.error}</div>`;
    }

    if (scan.scan_type === 'ip_lookup') {
        // Flatten simple key-values
        const exclude = ['query', 'status']; // fields from ip-api to ignore
        let html = '<table class="result-table"><tbody>';
        for (const [k, v] of Object.entries(data)) {
            if (exclude.includes(k)) continue;
            html += `<tr><td>${k}</td><td>${v}</td></tr>`;
        }
        html += '</tbody></table>';
        return html;
    }
    
    if (scan.scan_type === 'nmap') {
        // data is usually nm[target]
        let html = '';
        // Hostnames
        if (data.hostnames && data.hostnames.length > 0) {
            html += `<div><strong>Hostnames:</strong> ${data.hostnames.map(h => h.name).join(', ')}</div>`;
        }
        // Ports
        if (data.tcp) {
            html += '<table class="result-table"><thead><tr><th>Port</th><th>State</th><th>Service</th></tr></thead><tbody>';
            for (const [port, info] of Object.entries(data.tcp)) {
                html += `<tr><td>${port}</td><td>${info.state}</td><td>${info.name}</td></tr>`;
            }
            html += '</tbody></table>';
        } else {
            html += '<div class="result-box">' + JSON.stringify(data, null, 2) + '</div>';
        }
        return html;
    }

    if (scan.scan_type === 'subdomain') {
        if (data.subdomains && Array.isArray(data.subdomains)) {
            setTimeout(() => renderSubdomainContent(scan.id, 1), 0);
            return `<div id="subdomain-result-${scan.id}">Loading...</div>`;
        }
    }

    if (scan.scan_type === 'dns_lookup') {
        if (data.message) return `<div>${data.message}</div>`;
        
        let html = '<div class="dns-results" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';
        for (const [type, records] of Object.entries(data)) {
            if (records && records.length > 0) {
                html += `
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px;">
                        <strong style="color: #60a5fa; display: block; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1);">${type}</strong>
                        <ul style="margin: 0; padding: 0; list-style-type: none; font-family: monospace; font-size: 0.9em;">
                            ${records.map(r => `<li style="padding: 2px 0; word-break: break-all;">${r}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }
        html += '</div>';
        return html;
    }

    if (scan.scan_type === 'whois') {
            // Whois data can be complex, often has 'domain_name', 'creation_date', etc.
            // We'll show a table of non-list/dict values and JSON for the rest
            let html = '<table class="result-table"><tbody>';
            let complex = {};
            for (const [k, v] of Object.entries(data)) {
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    // Date objects might come as strings in JSON
                    continue; 
                }
                // Arrays are okay if they are strings
                let val = v;
                if (Array.isArray(v)) val = v.join(', ');
                
                if (typeof val === 'string' || typeof val === 'number') {
                html += `<tr><td>${k}</td><td>${val}</td></tr>`;
                }
            }
            html += '</tbody></table>';
            return html;
    }

    if (scan.scan_type === 'checkphish') {
        if (data.disposition) {
            const color = data.disposition === 'clean' ? '#4ade80' : '#ef4444';
            return `<div style="padding: 10px; border-radius: 4px; background: rgba(255,255,255,0.05);">
                <strong>Verdict:</strong> 
                <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${data.disposition}</span>
            </div>`;
        } else if (data.status) {
            // Pending or other status
                return `<div style="padding: 10px; border-radius: 4px; background: rgba(255,255,255,0.05);">
                <strong>Status:</strong> 
                <span style="color: #fbbf24; font-weight: bold; text-transform: uppercase;">${data.status}</span>
            </div>`;
        }
    }

    if (scan.scan_type === 'asn_lookup') {
            if (data.asn_data && Array.isArray(data.asn_data)) {
                if (data.asn_data.length === 0) return '<div>No ASN data found</div>';
                
                let html = '<div style="overflow-x:auto;"><table class="result-table"><thead><tr><th>IP/Target</th><th>ASN</th><th>Org</th><th>Prefixes (Count: ' + (data.asn_data[0].prefixes ? data.asn_data[0].prefixes.length : 0) + ')</th></tr></thead><tbody>';
                data.asn_data.forEach(item => {
                    const ip = item.ip || '-';
                    const asn = item.asn || '-';
                    const org = item.org || '-';
                    let prefixes = '-';
                    if (item.prefixes && Array.isArray(item.prefixes)) {
                        // Limit display
                        const pfxList = item.prefixes.slice(0, 50);
                        prefixes = pfxList.join(', ');
                        if (item.prefixes.length > 50) prefixes += ` ... (+${item.prefixes.length - 50} more)`;
                    }
                    
                    html += `<tr>
                    <td>${ip}</td>
                    <td>${asn}</td>
                    <td>${org}</td>
                    <td style="font-size: 0.8em; max-width: 500px; word-wrap: break-word;">${prefixes}</td>
                    </tr>`;
                });
                html += '</tbody></table></div>';
                return html;
        }
    }

    if (scan.scan_type === 'wappalyzer') {
            if (data.technologies) {
                if (Object.keys(data.technologies).length === 0) return '<div>No technologies detected</div>';
                
                let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';
                for (const [tech, details] of Object.entries(data.technologies)) {
                    const versions = details.versions && details.versions.length > 0 ? details.versions.join(', ') : '';
                    const categories = details.categories && details.categories.length > 0 ? details.categories.join(', ') : '';
                    
                    html += `
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px;">
                        <strong style="color: #60a5fa; font-size: 1.1em;">${tech}</strong>
                        ${versions ? `<div style="margin-top:5px; font-size: 0.9em; color: #9ca3af;">Ver: ${versions}</div>` : ''}
                        ${categories ? `<div style="margin-top:5px; font-size: 0.8em; background: #374151; display: inline-block; padding: 2px 6px; border-radius: 4px;">${categories}</div>` : ''}
                    </div>
                    `;
                }
                html += '</div>';
                return html;
            }
    }

    if (scan.scan_type === 'sherlock') {
            if (data.sherlock_data) {
                if (Object.keys(data.sherlock_data).length === 0) return '<div>No accounts found</div>';
                
                setTimeout(() => renderSherlockContent(scan.id, 1), 0);
                return `<div id="sherlock-result-${scan.id}">Loading...</div>`;
            }
    }

    // Fallback
    return `<div class="result-box">${JSON.stringify(data, null, 2)}</div>`;
}

async function loadScanTypes() {
    try {
        const res = await fetch("/api/scan/config", {
            headers: { Authorization: "Bearer " + localStorage.token }
        });
        const config = await res.json();
        
        const select = document.getElementById("scanType");
        select.innerHTML = "";
        
        const typeMap = {
            "ip_lookup": "IP Lookup",
            "nmap": "Nmap Scan",
            "whois": "Whois Lookup",
            "subdomain": "Subdomain Finder",
            "dns_lookup": "DNS Lookup",
            "checkphish": "CheckPhish",
            "asn_lookup": "ASN Lookup",
            "wappalyzer": "Wappalyzer",
            "sherlock": "Sherlock (Username)"
        };
        
        let hasEnabled = false;
        for (const [key, enabled] of Object.entries(config)) {
            if (enabled) {
                const option = document.createElement("option");
                option.value = key;
                option.textContent = typeMap[key] || key;
                select.appendChild(option);
                hasEnabled = true;
            }
        }
        
        if (!hasEnabled) {
            const option = document.createElement("option");
            option.textContent = "No scans enabled";
            option.disabled = true;
            select.appendChild(option);
        }

        // Add change listener for placeholders
        const placeholders = {
            "ip_lookup": "Target IP or Domain (e.g., 8.8.8.8)",
            "nmap": "Target IP or Domain (e.g., scanme.nmap.org)",
            "whois": "Domain name (e.g., google.com)",
            "subdomain": "Domain name (e.g., example.com)",
            "dns_lookup": "Domain name (e.g., example.com)",
            "checkphish": "URL to check (e.g., http://example.com)",
            "asn_lookup": "ASN (e.g. AS15169) or IP/Domain",
            "wappalyzer": "URL or Domain (e.g. google.com)",
            "sherlock": "Username (e.g. elonmusk)"
        };

        select.addEventListener('change', () => {
            const val = select.value;
            const ph = placeholders[val] || "Target (e.g., google.com)";
            document.getElementById("scanTarget").placeholder = ph;
        });
        
        // Trigger once
        if (select.value) {
                select.dispatchEvent(new Event('change'));
        }
        
    } catch (e) {
        console.error("Failed to load scan types", e);
        const select = document.getElementById("scanType");
        select.innerHTML = '<option disabled>Error loading types</option>';
    }
}

async function loadScans() {
    try {
        const res = await fetch("/api/scan/?limit=10", {
            headers: { Authorization: "Bearer " + localStorage.token }
        });
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = "login?expired=1";
            return;
        }
        const scans = await res.json();
        // Cache scan results for pagination
        window.scanResults = {};
        scans.forEach(s => {
            try {
                window.scanResults[s.id] = typeof s.result === 'string' ? JSON.parse(s.result) : s.result;
            } catch (e) {
                window.scanResults[s.id] = {};
            }
        });

        const list = document.getElementById("results");
        list.innerHTML = scans.map(s => `
            <div class="scan-item">
                <div class="scan-header">
                    <div>
                        <strong>${s.target}</strong>
                        <span class="badge">${s.scan_type}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="scan-actions">
                            <button onclick="downloadReport('csv', ${s.id})" title="Export CSV" style="padding: 2px 6px; font-size: 0.8em; background: #334155; border: 1px solid #475569; border-radius: 4px; color: #94a3b8; cursor: pointer;">CSV</button>
                        </div>
                        <small>${new Date(s.created_at).toLocaleString()}</small>
                    </div>
                </div>
                <details>
                    <summary>View Results</summary>
                    <div style="margin-top: 10px;">
                        ${formatResult(s)}
                    </div>
                </details>
            </div>
        `).join("");
    } catch (e) {
        console.error(e);
    }
}

async function runScan() {
    const target = document.getElementById("scanTarget").value;
    const type = document.getElementById("scanType").value;
    const statusDiv = document.getElementById("scanStatus");
    
    if (!target) {
        alert("Please enter a target");
        return;
    }

    statusDiv.innerText = "Scanning...";
    
    try {
        const res = await fetch("/api/scan/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.token
            },
            body: JSON.stringify({ target, type })
        });
        
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = "login?expired=1";
            return;
        }
        
        const data = await res.json();
        
        if (!res.ok) {
            statusDiv.innerText = "Error: " + (data.detail || "Scan failed");
        } else {
            statusDiv.innerText = "Scan completed! ID: " + data.id;
            loadScans();
            // Refresh chart logic if needed, but simple reload is easier or separate function
            loadStats();
        }
    } catch (e) {
        statusDiv.innerText = "Error: " + e.message;
    }
}

function downloadReport(format, id = null) {
    const token = localStorage.token;
    if (!token) {
        alert("Please login first");
        return;
    }
    
    let url = `/api/export/scans.${format}`;
    if (id) {
        url += `?scan_id=${id}`;
    }
    
    fetch(url, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => {
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = "login?expired=1";
            throw new Error("Session expired");
        }
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = id ? `scan_${id}.${format}` : `scans.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(e => alert(e.message));
}

function loadStats() {
    fetch("/api/scan/stats", {
        headers: { Authorization: "Bearer " + localStorage.token }
    })
    .then(r => {
        if (r.status === 401) {
            localStorage.clear();
            window.location.href = "login?expired=1";
            throw new Error("Session expired");
        }
        if (!r.ok) throw new Error("Failed to fetch stats");
        return r.json();
    })
    .then(data => {
        // Check if chart exists and destroy or update
        const ctx = document.getElementById("scanChart");
        // Simple way: re-create canvas or handle update. 
        // For now, just create new chart. If one exists, it might glitch. 
        // Better: store chart instance.
        if (window.myChart) window.myChart.destroy();
        
        window.myChart = new Chart(ctx, {
            type: "bar",
            data: {
            labels: Object.keys(data.by_type || {}),
            datasets: [{
                label: "Scans",
                data: Object.values(data.by_type || {}),
                backgroundColor: '#38bdf8',
                borderColor: '#0ea5e9',
                borderWidth: 1
            }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#e5e7eb' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: '#e5e7eb' },
                        grid: { color: '#334155' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#e5e7eb' } }
                }
            }
        });
    })
    .catch(err => console.error(err));
}

// Init logic
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.token;
    if (!token) {
        window.location.href = "login";
        return;
    }
    
    try {
        if (token === "undefined" || token === "null") {
            throw new Error("Invalid token stored");
        }

        const res = await fetch("/api/auth/verify", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
            const userData = await res.json();
            if (userData.role === "admin") {
                document.getElementById("adminLink").style.display = "inline";
            }
            document.body.style.display = 'block';
            
            // Load initial data
            loadScanTypes();
            loadScans();
            loadStats();
        } else {
            localStorage.clear();
            window.location.href = "login";
        }
    } catch (e) {
        localStorage.clear();
        window.location.href = "login";
    }
});
