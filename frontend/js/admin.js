let currentPage = 1;
const itemsPerPage = 5;
let currentSearch = "";
let searchTimeout;

function debounceSearch(value) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = value;
        loadUsers(1);
    }, 300);
}

async function loadUsers(page = 1) {
    currentPage = page;
    try {
        const skip = (page - 1) * itemsPerPage;
        let url = `/api/admin/users?skip=${skip}&limit=${itemsPerPage}`;
        if (currentSearch) {
            url += `&search=${encodeURIComponent(currentSearch)}`;
        }
        
        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + localStorage.token }
        });
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = "login?expired=1";
            return;
        }
        const data = await res.json();
        const users = data.items;
        const total = data.total;
        const totalPages = Math.ceil(total / itemsPerPage);
        
        const list = document.getElementById("userList");
        
        let html = `
            <div class="user-table-container">
                <table class="user-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>2FA</th>
                            <th style="text-align: right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        html += users.map(u => {
            const initials = u.username.substring(0, 2).toUpperCase();
            return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <div class="user-name">${u.username}</div>
                            <div class="user-meta">ID: ${u.id} • Joined ${new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; font-size: 0.85em; border: 1px solid rgba(255,255,255,0.05);">${u.role}</span>
                </td>
                <td>
                    <span class="status-badge ${u.is_active ? 'status-active' : 'status-disabled'}">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                        ${u.is_active ? 'Active' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${u.has_2fa ? 'status-active' : 'status-disabled'}">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                        ${u.has_2fa ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td style="text-align: right; position: relative;">
                    ${u.id !== parseJwt(localStorage.token).sub_id ? `
                        <button onclick="toggleActions(${u.id})" class="btn-icon" style="margin-left: auto;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                        </button>
                        <div id="actions-${u.id}" class="action-dropdown" style="display: none;">
                            <button onclick="openEditUser(${u.id}, '${u.username}', '${u.role}')" class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit User
                            </button>
                            <button onclick="toggleUser(${u.id})" class="dropdown-item ${u.is_active ? 'text-danger' : 'text-success'}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    ${u.is_active ? '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>' : '<path d="M5 12h14"></path><path d="M12 5v14"></path>'}
                                </svg>
                                ${u.is_active ? 'Disable Account' : 'Enable Account'}
                            </button>
                            <button onclick="resetPassword(${u.id})" class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                Reset Password
                            </button>
                            <button onclick="toggle2FA(${u.id}, ${!u.has_2fa})" class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                ${u.has_2fa ? 'Disable 2FA' : 'Enable 2FA'}
                            </button>
                        </div>
                    ` : '<span style="color: #64748b; font-size: 0.85em; font-style: italic; padding-right: 12px;">(You)</span>'}
                </td>
            </tr>
        `}).join("");
        
        html += `</tbody></table>`;
        
        // Pagination Controls
        if (totalPages > 1) {
            html += `
                <div class="pagination-controls">
                    <button onclick="loadUsers(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="btn-page">Previous</button>
                    <span style="color: #94a3b8; font-size: 0.9em;">Page ${currentPage} of ${totalPages}</span>
                    <button onclick="loadUsers(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="btn-page">Next</button>
                </div>
            `;
        }
        
        list.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

function toggleActions(id) {
    // Close all other dropdowns
    document.querySelectorAll('.action-dropdown').forEach(el => {
        if (el.id !== `actions-${id}`) el.style.display = 'none';
    });
    
    const dropdown = document.getElementById(`actions-${id}`);
    if (dropdown) {
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        } else {
            dropdown.style.display = 'block';
            
            // Fix for clipping: use fixed positioning
            const btn = dropdown.parentElement.querySelector('.btn-icon');
            if (btn) {
                const rect = btn.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 5) + 'px';
                // Align right edge of dropdown with right edge of button
                dropdown.style.right = (window.innerWidth - rect.right) + 'px';
                dropdown.style.left = 'auto';
                dropdown.style.zIndex = '1001';
            }
        }
    }
}

// Close dropdowns on scroll to prevent detachment
window.addEventListener('scroll', () => {
    document.querySelectorAll('.action-dropdown').forEach(el => el.style.display = 'none');
}, true);

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.action-dropdown') && !e.target.closest('.btn-icon')) {
        document.querySelectorAll('.action-dropdown').forEach(el => el.style.display = 'none');
    }
});

async function toggleUser(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const res = await fetch(`/api/admin/users/${id}/toggle`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + localStorage.token }
        });
        if (res.ok) loadUsers();
        else alert("Failed to update user");
    } catch (e) {
        console.error(e);
    }
}

async function resetPassword(id) {
    const newPass = prompt("Enter new password:");
    if (!newPass) return;
    
    try {
        const res = await fetch(`/api/admin/users/${id}/reset_password`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.token 
            },
            body: JSON.stringify({ password: newPass })
        });
        
        if (res.ok) alert("Password updated");
        else alert("Failed to update password");
    } catch (e) {
        console.error(e);
        alert("Error updating password");
    }
}

async function toggle2FA(id, enable) {
    const action = enable ? "enable" : "disable";
    if (!confirm(`Are you sure you want to ${action} 2FA for this user?`)) return;
    
    try {
        const res = await fetch(`/api/admin/users/${id}/2fa/toggle`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.token 
            },
            body: JSON.stringify({ enable: enable })
        });
        
        if (res.ok) {
            const data = await res.json();
            if (enable && data.qr) {
                // Show QR code modal
                // Assuming modal logic exists or alert
                alert("2FA Enabled");
            } else {
                alert("2FA Disabled");
            }
            loadUsers();
        }
        else alert("Failed to toggle 2FA");
    } catch (e) {
        console.error(e);
        alert("Error toggling 2FA");
    }
}

// Config Functions
async function loadConfig() {
    try {
        const res = await fetch("/api/scan/config?t=" + new Date().getTime(), {
            headers: { "Authorization": "Bearer " + localStorage.token }
        });
        const config = await res.json();
        const list = document.getElementById("configList");
        
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
        
        // Ensure all types are present
        const scan_types = ["ip_lookup", "nmap", "whois", "subdomain", "dns_lookup", "checkphish", "asn_lookup", "wappalyzer", "sherlock"];
        
        let html = '';
        for (const type of scan_types) {
            const enabled = config[type] !== false; // Default true
            const label = typeMap[type] || type;
            
            html += `
                <div class="config-item">
                    <span>${label}</span>
                    <label class="switch">
                        <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleScanConfig('${type}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            `;
        }
        list.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

async function toggleScanConfig(type, enabled) {
    try {
        const payload = {};
        payload[`scan_${type}`] = enabled ? "true" : "false";

        await fetch("/api/admin/config", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.token 
            },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error(e);
        alert("Failed to update config");
    }
}

// User Edit Modal Logic
let currentEditId = null;

function openEditUser(id, username, role) {
    currentEditId = id;
    document.getElementById("editUsername").value = username;
    document.getElementById("editRole").value = role;
    document.getElementById("editUserModal").style.display = "flex";
}

function closeEditUser() {
    document.getElementById("editUserModal").style.display = "none";
    currentEditId = null;
}

async function saveUser() {
    if (!currentEditId) return;
    
    const role = document.getElementById("editRole").value;
    // We only update role for now as username change might be complex
    
    try {
        const res = await fetch(`/api/admin/users/${currentEditId}/role`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.token 
            },
            body: JSON.stringify({ role: role })
        });
        
        if (res.ok) {
            closeEditUser();
            loadUsers();
        } else {
            alert("Failed to update user");
        }
    } catch (e) {
        console.error(e);
        alert("Error updating user");
    }
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.token;
    const role = localStorage.role;
    
    if (!token || role !== "admin") {
        alert("Access Denied");
        window.location.href = "dashboard";
        return;
    }
    
    loadUsers();
    loadConfig();
});
