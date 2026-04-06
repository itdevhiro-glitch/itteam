const ADMIN_UID = "Ogy9lUbGHbSu8wYIYx2gQsTtFDF2";
    const ADMIN_EMAIL = "root@zeppelin.center";
    const SLA_HOURS = { Low: 48, Normal: 24, Critical: 4 };
    
    const ticketCategories = {
        "Instalasi": {
            label: "Instalasi & Konfigurasi",
            options: [
                { val: "Install - New PC/Laptop", text: "Setup Laptop/PC Baru" },
                { val: "Install - Reinstall OS", text: "Install Ulang Windows/OS" },
                { val: "Install - Software", text: "Instalasi Software Baru" },
                { val: "Install - Network Point", text: "Instalasi Kabel/Jaringan LAN" },
                { val: "Install - Peripheral", text: "Setup Printer/Scanner/Lainnya" }
            ]
        },
        "Maintenance": {
            label: "Maintenance & Updates",
            options: [
                { val: "Maint - Update OS", text: "Update Windows / Security Patch" },
                { val: "Maint - Update Driver", text: "Update Driver & BIOS" },
                { val: "Maint - Antivirus", text: "Update/Scan Antivirus" },
                { val: "Maint - Cleanup", text: "System Cleanup / Slow Performance" },
                { val: "Maint - Preventive", text: "Preventive Maintenance Rutin" }
            ]
        },
        "Hardware": {
            label: "Perbaikan Hardware",
            options: [
                { val: "Hardware - Laptop/PC", text: "Kerusakan Laptop/PC (Mati Total)" },
                { val: "Hardware - Screen/LCD", text: "Layar Rusak / Bergaris" },
                { val: "Hardware - Keyboard/Mouse", text: "Keyboard / Mouse Error" },
                { val: "Hardware - Battery/Charger", text: "Baterai Drop / Charger Rusak" },
                { val: "Hardware - Printer", text: "Printer Error / Tinta" },
                { val: "Hardware - Storage", text: "Hardisk / SSD Rusak" }
            ]
        },
        "Network": {
            label: "Jaringan & Koneksi",
            options: [
                { val: "Network - No Internet", text: "Tidak Ada Koneksi Internet" },
                { val: "Network - WiFi", text: "Masalah WiFi (Lemah/Putus)" },
                { val: "Network - VPN", text: "Akses VPN Error" },
                { val: "Network - File Share", text: "Akses Folder Sharing / Server" }
            ]
        },
        "Software": {
            label: "Software & Aplikasi",
            options: [
                { val: "Software - Office", text: "Microsoft Office / Word / Excel" },
                { val: "Software - Email", text: "Outlook / Email Error" },
                { val: "Software - Browser", text: "Masalah Browser" },
                { val: "Software - ERP/SAP", text: "Aplikasi Internal / ERP Error" }
            ]
        },
        "Account": {
            label: "Akun & Keamanan",
            options: [
                { val: "Account - Reset Password", text: "Reset Password" },
                { val: "Account - Unlock", text: "Unlock Akun Terkunci" },
                { val: "Account - Permission", text: "Permintaan Hak Akses" }
            ]
        },
        "Other": {
            label: "Lainnya",
            options: [
                { val: "Other", text: "Permintaan Lainnya" }
            ]
        }
    };

    const firebaseConfig = {
        apiKey: "AIzaSyA9wgSalrlTcveIZi2i-WND86z1i9JYHKw",
        authDomain: "it-support-53eeb.firebaseapp.com",
        databaseURL: "https://it-support-53eeb-default-rtdb.firebaseio.com",
        projectId: "it-support-53eeb",
        storageBucket: "it-support-53eeb.firebasestorage.app",
        messagingSenderId: "573924501146",
        appId: "1:573924501146:web:12f34306ed675472322123",
        measurementId: "G-33K6DDE1VR"
    };
    const mainApp = firebase.initializeApp(firebaseConfig);
    const db = mainApp.database();
    const auth = mainApp.auth();
    const firestore = mainApp.firestore();
    let reports = [];
    let users = [];
    let requests = [];
    let assets = [];
    let vendors = [];
    let announcements = [];
    let isTrashMode = false;
    let currentTicketPage = 1;
    const itemsPerPage = 10;
    let editingId = null;
    let editingAnnId = null;
    let editingUserId = null;
    let editingAssetId = null;
    let editingVendorId = null;
    const $ = (sel) => document.querySelector(sel);
    const nowISO = () => new Date().toISOString();
    const showToast = (msg, type='normal') => {
        const t = $('#toast'); 
        t.querySelector('span').textContent = msg; 
        t.style.background = type === 'error' ? 'var(--danger)' : '#1e293b';
        t.style.bottom = "40px";
        setTimeout(() => t.style.bottom = "-100px", 3000);
    };
    const showLoading = () => {
        const l = $('#appLoader');
        l.style.display = 'flex';
        l.style.visibility = 'visible';
        l.style.opacity = '1';
    };
    const hideLoading = () => {
        const l = $('#appLoader');
        l.style.opacity = '0';
        setTimeout(() => {
            l.style.visibility = 'hidden';
            l.style.display = 'none';
        }, 500);
    };
    window.toggleSidebar = () => {
        const sb = $('#sidebar');
        const overlay = $('#sidebarOverlay');
        const isOpen = sb.classList.contains('open');
        if (isOpen) {
            sb.classList.remove('open');
            overlay.classList.remove('show');
            setTimeout(() => overlay.style.display = 'none', 300);
        } else {
            overlay.style.display = 'block';
            overlay.offsetHeight; 
            sb.classList.add('open');
            overlay.classList.add('show');
        }
    };
    window.switchTab = (tab) => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(tab));
        if(navItem) navItem.classList.add('active');
        ['dashboard', 'tickets', 'users', 'requests', 'assets', 'vendors'].forEach(id => $(`#view-${id}`).classList.add('hidden'));
        $(`#view-${tab}`).classList.remove('hidden');
        if(window.innerWidth < 1024) window.toggleSidebar();
    };
    window.toggleViewMode = (mode) => { 
        if(mode === 'list') { 
            $('#cont-list').classList.remove('hidden'); 
            $('#cont-kanban').classList.add('hidden'); 
            $('#btnList').classList.add('active'); 
            $('#btnKanban').classList.remove('active'); 
        } else { 
            $('#cont-list').classList.add('hidden'); 
            $('#cont-kanban').classList.remove('hidden'); 
            $('#btnList').classList.remove('active'); 
            $('#btnKanban').classList.add('active'); 
            renderKanban(); 
        } 
    };
    auth.onAuthStateChanged(user => {
        if (user && user.uid === ADMIN_UID) {
            $('#loginScreen').classList.add('hidden');
            $('#appInterface').classList.remove('hidden');
            initApp(user);
        } else {
            $('#loginScreen').classList.remove('hidden');
            $('#appInterface').classList.add('hidden');
        }
        setTimeout(() => hideLoading(), 800);
    });
    $('#loginBtn').onclick = async () => {
        const u = $('#loginUser').value; const p = $('#loginPass').value;
        if (u !== 'root' || p !== 'adm123') {
            $('#authError').textContent = "Invalid Credentials"; 
            $('#authError').style.display = 'block';
            return;
        }
        try { 
            showLoading(); 
            await auth.signInWithEmailAndPassword(ADMIN_EMAIL, p); 
        } catch (e) { 
            hideLoading(); 
            $('#authError').textContent = e.message; 
            $('#authError').style.display = 'block'; 
        }
    };
    $('#logoutBtn').onclick = () => { showLoading(); auth.signOut(); };
    function initApp(user) {
        $('#themeToggle').onclick = () => {
            const newTheme = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            $('#themeToggle i').className = newTheme === 'light' ? 'ri-moon-line' : 'ri-sun-line';
        };
        $('#mobileMenuBtn').onclick = window.toggleSidebar;
        $('#filterCat').onchange = () => renderTickets(1);
        $('#userFilterDept').onchange = renderUsers;
        $('#userFilterStatus').onchange = renderUsers;
        $('#reqFilterDept').onchange = renderRequests;
        $('#reqFilterStatus').onchange = renderRequests;
        $('#ticketSearch').oninput = () => renderTickets(1);
        $('#globalSearch').oninput = () => { renderTickets(1); renderUsers(); renderRequests(); renderAssets(); };
        $('#userSearchInput').oninput = renderUsers;
        $('#reqSearch').oninput = renderRequests;
        $('#astSearch').oninput = renderAssets;
        $('#astFilterType').onchange = renderAssets;
        $('#astFilterStatus').onchange = renderAssets;
        $('#backupBtn').onclick = async () => {
            showLoading();
            try {
                const backupData = { reports, users, requests, assets, vendors, announcements, timestamp: Date.now() };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                const a = document.createElement('a'); a.href = dataStr; a.download = "zeppelin_backup_" + new Date().toISOString().slice(0,10) + ".json";
                document.body.appendChild(a); a.click(); a.remove(); showToast("Backup Berhasil");
            } catch (err) { showToast("Gagal Backup", 'error'); } finally { hideLoading(); }
        };
        $('#restoreBtn').onclick = () => $('#restoreFile').click();
        $('#restoreFile').onchange = (event) => {
            const file = event.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                showLoading();
                try {
                    const data = JSON.parse(e.target.result);
                    if(data.reports) await db.ref('reports').update(data.reports.reduce((acc,r)=>{acc[r.id]=r; return acc;},{}));
                    showToast("Restore Berhasil!");
                } catch (err) { alert("File Corrupt!"); } finally { hideLoading(); $('#restoreFile').value = ''; }
            };
            reader.readAsText(file);
        };
        db.ref('reports').on('value', snap => { reports = snap.val() ? Object.keys(snap.val()).map(k => ({...snap.val()[k], id: k})) : []; renderTickets(); renderStats(); renderCharts(); });
        db.ref('announcements').on('value', snap => { announcements = snap.val() ? Object.keys(snap.val()).map(k => ({...snap.val()[k], key: k})) : []; renderAnnouncements(); });
        
        // FIX: Re-render assets & requests after users load to fix "Unknown User"
        db.ref('users').on('value', snap => { 
            users = snap.val() ? Object.keys(snap.val()).map(k => ({...snap.val()[k], uid: k})) : []; 
            renderUsers(); 
            populateDropdowns(); 
            renderAssets(); // ADDED
            renderRequests(); // ADDED
        });
        
        db.ref('device_requests').on('value', snap => { requests = snap.val() ? Object.keys(snap.val()).map(k => ({...snap.val()[k], id: k})) : []; renderRequests(); });
        firestore.collection('assets').onSnapshot(snap => { assets = snap.docs.map(doc => ({id: doc.id, ...doc.data()})); renderAssets(); });
        firestore.collection('vendors').onSnapshot(snap => { vendors = snap.docs.map(doc => ({id: doc.id, ...doc.data()})); renderVendors(); populateDropdowns(); });
        db.ref('chats/private_chats').on('value', snap => { $('#chatBadge').style.display = snap.exists() ? 'block' : 'none'; });
        
        const mainCatSel = $('#t_main_cat');
        for (const [key, val] of Object.entries(ticketCategories)) {
            mainCatSel.innerHTML += `<option value="${key}">${val.label}</option>`;
        }
    }
    window.updateSubCat = () => {
        const main = $('#t_main_cat').value;
        const sub = $('#t_jenis');
        sub.innerHTML = '<option value="">-- Pilih Detail --</option>';
        if (main && ticketCategories[main]) {
            ticketCategories[main].options.forEach(opt => {
                sub.innerHTML += `<option value="${opt.val}">${opt.text}</option>`;
            });
            sub.disabled = false;
        } else {
            sub.disabled = true;
        }
    }
    function renderTickets(page = 1) {
        currentTicketPage = page;
        const tbody = $('#reportTable tbody');
        tbody.innerHTML = '';
        const searchTerm = ($('#ticketSearch').value || $('#globalSearch').value).toLowerCase();
        const filterCategory = $('#filterCat').value;
        const priorityConfig = {
            'Critical': { color: '#ef4444', label: 'Critical' },
            'Normal':   { color: '#f59e0b', label: 'Normal' },
            'Low':      { color: '#3b82f6', label: 'Low' }
        };
        let filteredData = reports.filter(r => {
            if(isTrashMode) return r.isDeleted;
            if(r.isDeleted) return false;
            let matchesSearch = JSON.stringify(r).toLowerCase().includes(searchTerm);
            if (searchTerm === 'overdue') {
                if (r.status === 'Closed') return false;
                const limit = new Date(r.created_iso).getTime() + (SLA_HOURS[r.kategori]*3600000);
                matchesSearch = Date.now() > limit;
            }
            const matchesCat = !filterCategory || r.kategori === filterCategory;
            return matchesSearch && matchesCat;
        });
        filteredData.sort((a,b) => new Date(b.created_iso) - new Date(a.created_iso));
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if(currentTicketPage > totalPages) currentTicketPage = totalPages;
        const startIndex = (currentTicketPage - 1) * itemsPerPage;
        const paginatedItems = filteredData.slice(startIndex, startIndex + itemsPerPage);
        paginatedItems.forEach(r => {
            const slaLimit = new Date(r.created_iso).getTime() + (SLA_HOURS[r.kategori]*3600000);
            const timeLeft = slaLimit - Date.now();
            const fullDuration = SLA_HOURS[r.kategori] * 3600000;
            let pct = Math.max(0, Math.min(100, (timeLeft / fullDuration) * 100));
            let slaColor = '#10b981';
            if (r.status === 'Closed') {
                pct = 100; slaColor = '#e2e8f0';
            } else {
                if (timeLeft < 0) slaColor = '#ef4444';
                else if (pct < 30) slaColor = '#f59e0b';
            }
            const pColor = priorityConfig[r.kategori] ? priorityConfig[r.kategori].color : '#cbd5e1';
            const createdDate = new Date(r.created_iso);
            const dateStr = createdDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const timeStr = createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            let avatarHtml = '';
            if (r.pic) {
                const initial = r.pic.charAt(0).toUpperCase();
                avatarHtml = `
                    <div class="pic-avatar assigned" title="PIC: ${r.pic}">
                        ${initial}
                    </div>
                    <div style="margin-left:10px;">
                        <div style="font-size:13px; font-weight:600;">${r.pic}</div>
                        <div style="font-size:11px; color:var(--text-tertiary);">Technician</div>
                    </div>`;
            } else {
                avatarHtml = `
                    <div class="pic-avatar" title="Unassigned">?</div>
                    <div style="margin-left:10px; font-size:12px; color:var(--text-tertiary); font-style:italic;">
                        Unassigned
                    </div>`;
            }
            const rowHtml = `
            <tr onclick="openReportModal('${r.id}')">
                <td style="position:relative; width: 180px;">
                    <div class="priority-indicator" style="background: ${pColor}; box-shadow: 2px 0 8px ${pColor}40;"></div>
                    <div style="padding-left: 14px;">
                        <span class="ticket-id-badge">${r.id}</span>
                        <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-top:4px;">${r.nama}</div>
                    </div>
                </td>
                <td>
                    <span class="ticket-subject">${r.jenis}</span>
                    <div class="ticket-desc">
                        <i class="ri-file-text-line" style="vertical-align:middle; margin-right:4px;"></i>
                        ${r.catatan || 'Tidak ada catatan tambahan...'}
                    </div>
                </td>
                <td style="width: 160px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span class="badge status-${r.status}">${r.status}</span>
                        <span style="font-size:10px; font-weight:700; color:${slaColor}">${r.status==='Closed' ? 'DONE' : Math.round(pct)+'%'}</span>
                    </div>
                    ${r.status !== 'Closed' ? `
                    <div class="sla-track">
                        <div class="sla-fill" style="width:${pct}%; background:${slaColor}"></div>
                    </div>` : ''}
                </td>
                <td style="width: 200px;">
                    <div style="display:flex; align-items:center;">
                        ${avatarHtml}
                    </div>
                </td>
                <td style="width: 120px; text-align:right;">
                    <div style="font-weight:600; font-size:13px;">${dateStr}</div>
                    <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono);">${timeStr}</div>
                </td>
                <td style="width: 100px; text-align:right;">
                    <div class="action-btn-group">
                        <button class="icon-btn" onclick="event.stopPropagation(); openReportModal('${r.id}')" title="Edit Detail">
                            <i class="ri-pencil-fill" style="color:var(--text-secondary);"></i>
                        </button>
                        <button class="icon-btn" onclick="event.stopPropagation(); ${isTrashMode ? `restore('${r.id}')` : `softDelete('${r.id}')`}" 
                                title="${isTrashMode ? 'Restore' : 'Delete'}" 
                                style="color: ${isTrashMode ? 'var(--success)' : 'var(--danger)'}; bg: transparent;">
                            <i class="${isTrashMode ? 'ri-arrow-go-back-line' : 'ri-delete-bin-line'}"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
            tbody.innerHTML += rowHtml;
        });
        
        // --- UPDATED PAGINATION RENDER ---
        $('#paginationInfo').textContent = `Showing ${totalItems>0 ? startIndex+1 : 0}-${Math.min(startIndex+itemsPerPage, totalItems)} of ${totalItems} Tickets`;
        const btnContainer = $('#paginationBtns');
        btnContainer.innerHTML = '';
        
        if(totalPages > 1) {
            // Previous Button
            btnContainer.innerHTML += `<button class="page-btn ${currentTicketPage === 1 ? 'disabled' : ''}" onclick="${currentTicketPage > 1 ? `renderTickets(${currentTicketPage-1})` : ''}"><i class="ri-arrow-left-s-line"></i></button>`;
            
            for(let i=1; i<=totalPages; i++) {
                if(i==1 || i==totalPages || (i>=currentTicketPage-1 && i<=currentTicketPage+1)) {
                    btnContainer.innerHTML += `<button class="page-btn ${i===currentTicketPage?'active':''}" onclick="renderTickets(${i})">${i}</button>`; 
                } else if(i==currentTicketPage-2 || i==currentTicketPage+2) {
                    btnContainer.innerHTML += `<span style="font-size:12px; color:var(--text-tertiary);">...</span>`; 
                }
            }
            
            // Next Button
            btnContainer.innerHTML += `<button class="page-btn ${currentTicketPage === totalPages ? 'disabled' : ''}" onclick="${currentTicketPage < totalPages ? `renderTickets(${currentTicketPage+1})` : ''}"><i class="ri-arrow-right-s-line"></i></button>`;
        }
        
        if(!$('#cont-kanban').classList.contains('hidden')) renderKanban();
    }
    
    function renderKanban() { 
        const s = ($('#ticketSearch').value || $('#globalSearch').value).toLowerCase(); 
        const c = $('#filterCat').value; 
        const f = reports.filter(r => { 
            if(isTrashMode) return r.isDeleted; 
            if(r.isDeleted) return false; 
            let m = JSON.stringify(r).toLowerCase().includes(s); 
            if (s === 'overdue') { 
                if (r.status === 'Closed') return false; 
                const l = new Date(r.created_iso).getTime() + (SLA_HOURS[r.kategori]*3600000); 
                m = Date.now() > l; 
            } 
            const mc = !c || r.kategori === c; 
            return m && mc; 
        }); 
        
        const priorityColors = { 'Critical': '#ef4444', 'Normal': '#f59e0b', 'Low': '#3b82f6' };
        
        ['Open', 'Progress', 'Closed'].forEach(st => { 
            const container = $(`#kb-${st}`); 
            const items = f.filter(r => r.status === st); 
            $(`#count${st}`).textContent = items.length; 
            
            container.innerHTML = items.map(r => `
                <div class="kanban-card" onclick="openReportModal('${r.id}')">
                    <div class="kanban-priority-line" style="background: ${priorityColors[r.kategori] || '#ccc'};"></div>
                    <div class="k-card-top">
                        <span style="font-family:var(--font-mono); font-weight:700; color:var(--text-primary);">${r.id}</span>
                        <span>${new Date(r.created_iso).toLocaleDateString()}</span>
                    </div>
                    <div class="k-card-title">${r.jenis}</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                        <i class="ri-user-line"></i> ${r.nama}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--border-subtle);">
                         <div style="font-size:11px; font-weight:600; color:${priorityColors[r.kategori] || '#666'}; background:${priorityColors[r.kategori]}15; padding:2px 8px; border-radius:4px;">${r.kategori}</div>
                        <div style="font-size:12px; color:var(--text-tertiary);"><i class="ri-tools-line"></i> ${r.pic||'Unassigned'}</div>
                    </div>
                </div>`).join(''); 
        }); 
    }
    window.openReportModal = (id) => { 
        editingId = id; 
        const m = $('#modalTicket'); 
        m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); 
        $('#formTicket').reset(); 
        
        if(id) { 
            const r = reports.find(x => x.id === id); 
            $('#t_nama').value = r.nama; $('#t_nama').readOnly = true; 
            $('#t_pic').value = r.pic || ''; 
            $('#t_kategori').value = r.kategori; $('#t_status').value = r.status; 
            $('#t_note').value = r.catatan || ''; $('#t_internal').value = r.note_internal || ''; 

            const currentSubVal = r.jenis;
            let foundMain = '';
            for (const [key, val] of Object.entries(ticketCategories)) {
                if (val.options.some(opt => opt.val === currentSubVal)) {
                    foundMain = key;
                    break;
                }
            }
            if (!foundMain && currentSubVal.includes('Hardware')) foundMain = 'Hardware';
            else if (!foundMain && currentSubVal.includes('Network')) foundMain = 'Network';
            else if (!foundMain && currentSubVal.includes('Software')) foundMain = 'Software';
            else if (!foundMain && currentSubVal.includes('Account')) foundMain = 'Account';
            else if (!foundMain) foundMain = 'Other';

            $('#t_main_cat').value = foundMain;
            updateSubCat(); 
            $('#t_jenis').value = currentSubVal; 
        } else { 
            $('#t_nama').readOnly = false; $('#t_status').value = 'Open'; 
            $('#t_main_cat').value = '';
            updateSubCat();
        } 
    };
    window.saveTicket = async () => { 
        const n = $('#t_nama').value, p = $('#t_pic').value, j = $('#t_jenis').value;
        if(!n || !p || !j) return alert("Please fill Requester, Technician and Incident Type"); 
        showLoading(); 
        try { 
            let id = editingId; 
            const old = id ? reports.find(r => r.id === id) : {}; 
            if(!id) { 
                const s = await db.ref('counter').transaction(c => (c||0)+1); 
                id = 'ZP-'+String(s.snapshot.val()).padStart(4,'0'); 
            } 
            const d = { 
                id, nama: n, pic: p, jenis: j, 
                kategori: $('#t_kategori').value, status: $('#t_status').value, 
                catatan: $('#t_note').value, note_internal: $('#t_internal').value, 
                updated_iso: nowISO(), created_iso: old.created_iso || nowISO(), 
                uid: old.uid || auth.currentUser.uid, urgent: $('#t_kategori').value === 'Critical' 
            }; 
            await db.ref('reports/'+id).update(d); 
            closeModal('modalTicket'); showToast("Ticket Saved"); 
        } catch(e) { alert(e.message); } finally { hideLoading(); } 
    };
    window.softDelete = (id) => { if(confirm("Move to trash?")) db.ref(`reports/${id}`).update({isDeleted: true}); };
    window.restore = (id) => db.ref(`reports/${id}`).update({isDeleted: null});
    window.toggleTrash = () => { isTrashMode = !isTrashMode; renderTickets(); showToast(isTrashMode ? "Trash Active" : "Active Restored"); };
    window.filterByStat = (statType) => { switchTab('tickets'); $('#filterCat').value = ""; const s = $('#ticketSearch'); if (statType === 'All') s.value = ""; else if (statType === 'Overdue') s.value = "overdue"; else s.value = statType; renderTickets(1); };
    function renderVendors() {
        const tbody = $('#vendorTableBody');
        if(!tbody) return;
        tbody.innerHTML = vendors.map(v => `
            <tr>
                <td><div style="font-weight:600;">${v.name}</div></td>
                <td>${v.cp || '-'}</td>
                <td>${v.phone || '-'}</td>
                <td>${v.email || '-'}</td>
                <td><div style="font-size:12px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.address || '-'}</div></td>
                <td style="text-align:right">
                    <button class="btn btn-ghost" onclick="openVendorModal('${v.id}')">Edit</button>
                </td>
            </tr>
        `).join('');
    }
    window.openVendorModal = (id) => {
        editingVendorId = id;
        const m = $('#modalVendor'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10);
        if(id) {
            const v = vendors.find(x => x.id === id);
            $('#v_name').value = v.name; $('#v_cp').value = v.cp; $('#v_phone').value = v.phone;
            $('#v_email').value = v.email; $('#v_address').value = v.address;
        } else { $('#formVendor').reset(); }
    }
    window.saveVendor = async () => {
        const name = $('#v_name').value;
        if(!name) return alert("Company Name Required");
        showLoading();
        try {
            let id = editingVendorId || firestore.collection('vendors').doc().id;
            const data = {
                name, cp: $('#v_cp').value, phone: $('#v_phone').value,
                email: $('#v_email').value, address: $('#v_address').value
            };
            await firestore.collection('vendors').doc(id).set(data, { merge: true });
            closeModal('modalVendor'); showToast("Vendor Saved");
        } catch(e) { alert(e.message); } finally { hideLoading(); }
    }
    window.deleteVendor = async () => {
        if(!editingVendorId) return;
        if(confirm("Delete this vendor?")) {
            showLoading(); await firestore.collection('vendors').doc(editingVendorId).delete();
            closeModal('modalVendor'); showToast("Vendor Deleted"); hideLoading();
        }
    }
    function renderAssets() {
        const search = ($('#astSearch').value || $('#globalSearch').value).toLowerCase();
        const typeFilter = $('#astFilterType').value;
        const statusFilter = $('#astFilterStatus').value;
        $('#astTotal').textContent = assets.length;
        $('#astAvail').textContent = assets.filter(a => a.status === 'Available').length;
        $('#astUsed').textContent = assets.filter(a => a.status === 'In Use').length;
        $('#astMaint').textContent = assets.filter(a => a.status === 'Repair').length;
        const filtered = assets.filter(a => {
            const matchesSearch = (a.name||'').toLowerCase().includes(search) || (a.tag||'').toLowerCase().includes(search) || (a.brand||'').toLowerCase().includes(search);
            const matchesType = !typeFilter || a.type === typeFilter;
            const matchesStatus = !statusFilter || a.status === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });
        $('#assetTableBody').innerHTML = filtered.map(a => {
            const userObj = users.find(u => u.uid === a.assigned_uid);
            const userName = userObj ? userObj.nama : (a.assigned_uid ? 'Unknown User' : '-');
            const displayName = a.brand ? `${a.brand} - ${a.name}` : a.name; 
            const statusClass = `status-${a.status.replace(/\s/g,'')}`;
            return `
            <tr>
                <td><div style="font-family:var(--font-mono); font-weight:700; color:var(--primary);">${a.tag}</div></td>
                <td><div style="font-weight:600;">${displayName}</div></td>
                <td>${a.type} <span style="font-size:11px; color:var(--text-tertiary);">(${a.serial||'N/A'})</span></td>
                <td>${userName}</td>
                <td><span class="badge ${statusClass}">${a.status}</span></td>
                <td style="font-size:12px; color:var(--text-secondary);">${a.last_updated ? new Date(a.last_updated).toLocaleDateString() : '-'}</td>
                <td style="text-align:center">
                     <button class="icon-btn" style="color:var(--primary);" onclick="openAssetDetail('${a.id}')"><i class="ri-eye-line"></i></button>
                    <button class="btn btn-ghost" style="padding:6px 12px; font-size:12px;" onclick="openAssetModal('${a.id}')">Edit</button>
                </td>
            </tr>`;
        }).join('');
    }
    window.openAssetModal = (id) => {
        editingAssetId = id;
        const m = $('#modalAsset'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10);
        populateDropdowns(); 
        if(id) {
            const a = assets.find(x => x.id === id);
            $('#ast_tag').value = a.tag; $('#ast_tag').readOnly = true;
            $('#ast_brand').value = a.brand || '';
            $('#ast_name').value = a.name;
            $('#ast_type').value = a.type;
            $('#ast_serial').value = a.serial || '';
            $('#ast_location').value = a.location || '';
            $('#ast_user_select').value = a.assigned_uid || '';
            $('#ast_vendor_select').value = a.vendor_id || '';
            $('#ast_status').value = a.status;
        } else {
            $('#formAsset').reset(); $('#ast_tag').readOnly = false;
        }
    }
    window.openAssetDetail = (id) => {
        const a = assets.find(x => x.id === id);
        if(!a) return;
        editingAssetId = id;
        const m = $('#modalAssetDetail');
        if (!m.classList.contains('active')) switchAssetTab('info');
        m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10);
        $('#ad_title').textContent = a.brand ? `${a.brand} ${a.name}` : a.name;
        $('#ad_subtitle').textContent = a.tag;
        $('#ad_status_badge').textContent = a.status;
        $('#ad_status_badge').className = `badge status-${a.status.replace(/\s/g,'')}`;
        const userObj = users.find(u => u.uid === a.assigned_uid);
        $('#ad_user').textContent = userObj ? userObj.nama : (a.assigned_uid ? 'Unknown User' : 'Available / None');
        $('#ad_location').textContent = a.location || 'Not Set';
        $('#ad_serial').textContent = a.serial || '-';
        $('#ad_type').textContent = a.type;
        const vendorObj = vendors.find(v => v.id === a.vendor_id);
        $('#ad_vendor').textContent = vendorObj ? vendorObj.name : '-';
        $('#ad_updated').textContent = a.last_updated ? new Date(a.last_updated).toLocaleString() : '-';
        renderAssetNotes(a.notes || []);
        renderAssetLogs(a.activity_logs || []);
    };
    window.switchAssetTab = (t) => {
        const m = $('#modalAssetDetail');
        m.querySelectorAll('.modal-tab').forEach(tb => tb.classList.remove('active'));
        m.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        event.target.classList.add('active');
        m.querySelector(`#atab-${t}`).classList.remove('hidden');
    }
    window.addAssetComment = async () => {
        const txt = $('#ad_new_note').value;
        if(!txt || !editingAssetId) return;
        showLoading();
        try {
            const assetRef = firestore.collection('assets').doc(editingAssetId);
            const newNote = {
                text: txt,
                timestamp: nowISO(),
                author: 'Admin' 
            };
            const doc = await assetRef.get();
            let currentNotes = doc.data().notes || [];
            currentNotes.push(newNote);
            await assetRef.update({ notes: currentNotes });
            $('#ad_new_note').value = '';
            renderAssetNotes(currentNotes);
            showToast("Note Added");
        } catch(e) { alert(e.message); } finally { hideLoading(); }
    };
    function renderAssetNotes(notes) {
        const c = $('#ad_notes_list');
        if(!notes || notes.length === 0) {
            c.innerHTML = '<div style="text-align:center; color:var(--text-tertiary); padding:20px;">No maintenance notes yet.</div>';
            return;
        }
        const sorted = [...notes].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        c.innerHTML = sorted.map(n => `
            <div style="padding:10px; border-bottom:1px solid var(--border-subtle);">
                <div style="font-size:11px; color:var(--text-tertiary); display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="font-weight:700; color:var(--primary);">${n.author}</span>
                    <span>${new Date(n.timestamp).toLocaleString()}</span>
                </div>
                <div style="font-size:13px; color:var(--text-primary);">${n.text}</div>
            </div>
        `).join('');
    }
    function renderAssetLogs(logs) {
        const c = $('#ad_logs_list');
        if(!logs || logs.length === 0) {
            c.innerHTML = '<div style="text-align:center; color:var(--text-tertiary); padding:20px;">No system logs recorded.</div>';
            return;
        }
        const sorted = [...logs].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        c.innerHTML = sorted.map(l => `
            <div class="timeline-box">
                <div class="timeline-dot"></div>
                <div class="log-time">${new Date(l.timestamp).toLocaleString()}</div>
                <div class="log-text">${l.action}</div>
            </div>
        `).join('');
    }
    function populateDropdowns() {
        const userSel = $('#ast_user_select');
        const currUser = userSel.value;
        userSel.innerHTML = '<option value="">-- Available (No User) --</option>';
        users.filter(u => u.status === 'approved').forEach(u => {
             userSel.innerHTML += `<option value="${u.uid}">${u.nama} (${u.departemen})</option>`;
        });
        userSel.value = currUser;
        const vendSel = $('#ast_vendor_select');
        const currVend = vendSel.value;
        vendSel.innerHTML = '<option value="">-- Select Vendor --</option>';
        vendors.forEach(v => {
            vendSel.innerHTML += `<option value="${v.id}">${v.name}</option>`;
        });
        vendSel.value = currVend;
    }
    window.saveAsset = async () => {
        const tag = $('#ast_tag').value;
        const brand = $('#ast_brand').value;
        const name = $('#ast_name').value;
        const newStatus = $('#ast_status').value;
        if(!tag || !name) return alert("Tag and Model Name are required");
        showLoading();
        try {
            let id = editingAssetId;
            let currentLogs = [];
            if(id) {
                const doc = await firestore.collection('assets').doc(id).get();
                if(doc.exists) currentLogs = doc.data().activity_logs || [];
            } else {
                 const duplicate = assets.find(a => a.tag === tag);
                 if(duplicate) throw new Error("Asset Tag already exists!");
                 id = firestore.collection('assets').doc().id;
            }
            const logEntry = {
                timestamp: nowISO(),
                action: id ? `Asset updated. Status: ${newStatus}` : `Asset Registered: ${tag}`
            };
            currentLogs.push(logEntry);
            const data = {
                tag, brand, name, type: $('#ast_type').value, 
                serial: $('#ast_serial').value, 
                location: $('#ast_location').value, 
                assigned_uid: $('#ast_user_select').value, 
                vendor_id: $('#ast_vendor_select').value,
                status: newStatus,
                last_updated: nowISO(),
                activity_logs: currentLogs 
            };
            await firestore.collection('assets').doc(id).set(data, { merge: true });
            closeModal('modalAsset'); showToast("Asset Saved");
        } catch(e) { alert(e.message); } finally { hideLoading(); }
    }
    window.deleteAsset = async () => {
        if(!editingAssetId) return;
        if(confirm("Delete this asset?")) {
            showLoading(); await firestore.collection('assets').doc(editingAssetId).delete();
            closeModal('modalAsset'); showToast("Asset Deleted"); hideLoading();
        }
    }
    function renderStats() { 
        const active = reports.filter(r => !r.isDeleted); 
        $('#statTotal').textContent = active.length; 
        $('#statOpen').textContent = active.filter(r => r.status === 'Open').length; 
        $('#statClosed').textContent = active.filter(r => r.status === 'Closed').length; 
        $('#statOverdue').textContent = active.filter(r => { 
            if(r.status === 'Closed') return false; 
            return Date.now() > (new Date(r.created_iso).getTime() + (SLA_HOURS[r.kategori]*3600000)); 
        }).length; 
    }
    function renderAnnouncements() { 
        const s = announcements.sort((a,b) => (a.isPinned === b.isPinned) ? b.timestamp - a.timestamp : a.isPinned ? -1 : 1); 
        $('#announcementFeed').innerHTML = s.length ? s.map(a => `
            <div class="announcement-item" onclick="openAnnModal('${a.key}')">
                <div class="ann-marker" style="background:${a.isPinned?'var(--warning)':'var(--primary)'}"></div>
                <div class="ann-content">
                    <div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span>${a.category}</span><span style="color:var(--text-tertiary); font-weight:500;">${new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div style="font-weight:600; font-size:14px; color:var(--text-primary); margin-bottom:2px;">${a.title}</div>
                    <div style="font-size:13px; color:var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${a.content}</div>
                </div>
                <div style="display:flex; flex-direction:column; justify-content:space-between; align-items:flex-end;">
                    ${a.isPinned ? '<i class="ri-pushpin-fill" style="color:var(--warning)"></i>' : ''}
                    <i class="ri-delete-bin-line" onclick="event.stopPropagation(); deleteAnn('${a.key}')" style="color:var(--danger); cursor:pointer; opacity:0.6;"></i>
                </div>
            </div>`).join('') : '<div style="text-align:center; padding:32px; color:var(--text-secondary)">No announcements yet</div>'; 
    }
    window.openAnnModal = (k) => { 
        editingAnnId = k; const m = $('#modalAnn'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); 
        if(k) { const a = announcements.find(x => x.key === k); $('#a_title').value = a.title; $('#a_content').value = a.content; $('#a_cat').value = a.category; $('#a_pin').checked = a.isPinned; } 
        else { $('#a_title').value = ''; $('#a_content').value = ''; $('#a_pin').checked = false; } 
    };
    window.saveAnnouncement = async () => { 
        showLoading(); 
        try { 
            const d = { title: $('#a_title').value, content: $('#a_content').value, category: $('#a_cat').value, author: $('#a_author').value, isPinned: $('#a_pin').checked, timestamp: firebase.database.ServerValue.TIMESTAMP }; 
            if(editingAnnId) await db.ref(`announcements/${editingAnnId}`).update(d); else await db.ref('announcements').push(d); 
            closeModal('modalAnn'); showToast("Announcement Published"); 
        } finally { hideLoading(); } 
    };
    window.deleteAnn = (k) => { if(confirm("Delete?")) db.ref(`announcements/${k}`).remove(); };
    function renderUsers() { 
        const s = ($('#userSearchInput').value || $('#globalSearch').value).toLowerCase(); 
        const df = $('#userFilterDept').value; const sf = $('#userFilterStatus').value; 
        const d = [...new Set(users.map(u => u.departemen).filter(Boolean))]; 
        if($('#userFilterDept').children.length === 1) d.forEach(dep => $('#userFilterDept').innerHTML += `<option value="${dep}">${dep}</option>`); 
        $('#userStatTotal').textContent = users.length; 
        $('#userStatPending').textContent = users.filter(u=>u.status==='pending').length; 
        $('#userStatApproved').textContent = users.filter(u=>u.status==='approved').length; 
        const f = users.filter(u => { 
            if(u.uid === ADMIN_UID) return false; 
            const ms = (u.nama||'').toLowerCase().includes(s) || (u.email||'').toLowerCase().includes(s); 
            const md = !df || u.departemen === df; 
            const mst = !sf || (u.status||'pending') === sf; 
            return ms && md && mst; 
        }); 
        $('#userTableBody').innerHTML = f.map(u => `
            <tr>
                <td><div style="font-weight:600;">${u.nama}</div></td>
                <td>${u.email}</td>
                <td><span style="background:var(--bg-body); padding:4px 8px; border-radius:4px; font-size:12px; border:1px solid var(--border-subtle);">${u.departemen}</span></td>
                <td><span class="badge ${u.status === 'approved' ? 'status-approved' : (u.status==='rejected'?'status-rejected':'status-pending')}">${u.status||'pending'}</span></td>
                <td style="text-align:center"><span style="font-weight:700; color:var(--primary);">${reports.filter(r => r.uid === u.uid).length}</span></td>
                <td><button class="btn btn-ghost" style="padding:6px 12px; font-size:12px;" onclick="showUserDetail('${u.uid}')">Edit</button></td>
            </tr>`).join(''); 
    }
    window.showUserDetail = (uid) => { 
        const u = users.find(x => x.uid === uid); if(!u) return; 
        editingUserId = uid; 
        const m = $('#modalUserDetail'); if (!m.classList.contains('active')) switchUserTab('profile'); 
        m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); 
        $('#ud_avatar').textContent = u.nama.charAt(0); $('#ud_name').textContent = u.nama; $('#ud_email_disp').textContent = u.email; 
        $('#ud_role_badge').textContent = u.role || 'Employee'; $('#ud_role_badge').className = `role-badge role-${(u.role||'Employee').toLowerCase()}`; 
        $('#ud_id').value = uid; $('#ud_email').value = u.email; 
        const userAssets = assets.filter(a => a.assigned_uid === uid);
        $('#ud_stat_tickets').textContent = reports.filter(r => r.uid === uid).length; $('#ud_stat_requests').textContent = requests.filter(r => r.uid === uid).length; $('#ud_stat_assets').textContent = userAssets.length;
        $('#ud_fullname').value = u.nama; $('#ud_dept').value = u.departemen; $('#ud_nik').value = u.nik || ''; $('#ud_jobtitle').value = u.jobTitle || ''; $('#ud_phone').value = u.phone || ''; 
        $('#ud_role_select').value = u.role || 'Employee'; 
        renderUserAssets(uid);
        const b = $('#btnSuspend'); 
        if(u.status === 'rejected' || u.status === 'banned') { b.innerHTML = '<i class="ri-check-line"></i> Activate Account'; b.className = 'btn btn-outline'; } 
        else { b.innerHTML = '<i class="ri-prohibited-line"></i> Suspend Account'; b.className = 'btn btn-danger'; } 
        updateActivityFeed(uid); 
    };
    window.switchUserTab = (t) => { 
        document.querySelectorAll('.modal-tab').forEach(tb => tb.classList.remove('active')); 
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden')); 
        event.target.classList.add('active'); 
        $(`#tab-${t}`).classList.remove('hidden'); 
    };
    function updateActivityFeed(uid) { 
        const ur = reports.filter(r => r.uid === uid).sort((a,b) => new Date(b.created_iso) - new Date(a.created_iso)).slice(0, 5); 
        const f = $('#userActivityFeed'); 
        if(ur.length === 0) { f.innerHTML = '<div style="text-align:center; color:var(--text-tertiary); padding:20px;">No recent activity.</div>'; return; } 
        f.innerHTML = ur.map(r => `
            <div class="activity-item">
                <div class="activity-line"><div class="activity-dot"></div></div>
                <div class="activity-content">
                    <div>Reported: <strong>${r.jenis}</strong></div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:2px;">ID: ${r.id}</div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-bottom:4px;">${new Date(r.created_iso).toLocaleString()}</div>
                </div>
            </div>`).join(''); 
    }
    function renderUserAssets(uid) {
        const userAssetList = $('#userAssetList');
        const assignedAssets = assets.filter(a => a.assigned_uid === uid);
        if(!userAssetList) return;
        userAssetList.innerHTML = assignedAssets.length ? assignedAssets.map(a => {
            const displayName = a.brand ? `${a.brand} - ${a.name}` : a.name || '-';
            const statusClass = `status-${(a.status||'').replace(/\s/g,'')}`;
            return `
                <tr>
                    <td style="padding:12px 10px;">${a.tag || '-'}</td>
                    <td style="padding:12px 10px;">${displayName}</td>
                    <td style="padding:12px 10px;">${a.type || '-'}</td>
                    <td style="padding:12px 10px;"><span class="badge ${statusClass}">${a.status || 'Unknown'}</span></td>
                </tr>`;
        }).join('') : '<tr><td colspan="4" style="padding:20px 10px; text-align:center; color:var(--text-tertiary);">Tidak ada asset IT terpasang pada user ini.</td></tr>';
    }
    window.saveUserChanges = () => { const uid = $('#ud_id').value; const d = { nama: $('#ud_fullname').value, departemen: $('#ud_dept').value, nik: $('#ud_nik').value, jobTitle: $('#ud_jobtitle').value, phone: $('#ud_phone').value }; showLoading(); db.ref(`users/${uid}`).update(d).then(() => { hideLoading(); showToast("Profile Updated"); }); };
    window.saveUserSecurity = () => { const uid = $('#ud_id').value; const r = $('#ud_role_select').value; showLoading(); db.ref(`users/${uid}`).update({ role: r }).then(() => { hideLoading(); showToast(`Role: ${r}`); showUserDetail(uid); }); };
    window.toggleUserBan = () => { const uid = $('#ud_id').value; const u = users.find(x => x.uid === uid); const ns = (u.status === 'approved' || u.status === 'active') ? 'banned' : 'approved'; if(confirm(`Change status to ${ns}?`)) { showLoading(); db.ref(`users/${uid}`).update({ status: ns }).then(() => { hideLoading(); showToast(`Status: ${ns}`); showUserDetail(uid); }); } };
    window.resetUserPassword = () => { const e = $('#ud_email').value; if(confirm(`Reset pass for ${e}?`)) { auth.sendPasswordResetEmail(e).then(() => showToast("Email sent!")).catch(er => alert(er.message)); } };
    $('#showCreateUserPopupBtn').onclick = () => { const m = $('#modalCreateUser'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); };
    window.submitNewUser = async () => { 
        const e = $('#cu_email').value, p = $('#cu_pass').value, n = $('#cu_name').value, d = $('#cu_dept').value; 
        if(!e || !p || !n) return alert("Fill all fields"); 
        showLoading(); 
        try { 
            const sa = firebase.initializeApp(firebaseConfig, "Secondary"); 
            const uc = await sa.auth().createUserWithEmailAndPassword(e, p); 
            await db.ref(`users/${uc.user.uid}`).set({ uid: uc.user.uid, nama: n, email: e, departemen: d, status: 'approved' }); 
            await sa.delete(); 
            closeModal('modalCreateUser'); showToast("User Created"); 
        } catch(er) { alert(er.message); } finally { hideLoading(); } 
    };
    function renderRequests() { 
        const s = ($('#reqSearch').value || $('#globalSearch').value).toLowerCase(); 
        const sf = $('#reqFilterStatus').value; const df = $('#reqFilterDept').value; 
        $('#reqStatPending').textContent = requests.filter(r=>(r.status||'Pending')==='Pending').length; 
        $('#reqStatApproved').textContent = requests.filter(r=>r.status==='Approved').length; 
        $('#reqStatRejected').textContent = requests.filter(r=>r.status==='Rejected').length; 
        const d = [...new Set(requests.map(r => r.departemen).filter(Boolean))]; 
        if($('#reqFilterDept').children.length === 1) d.forEach(dep => $('#reqFilterDept').innerHTML += `<option value="${dep}">${dep}</option>`); 
        const f = requests.filter(r => { 
            const ms = (r.nama||'').toLowerCase().includes(s) || (r.detail||'').toLowerCase().includes(s); 
            const mst = !sf || (r.status||'Pending') === sf; 
            const md = !df || r.departemen === df; 
            return ms && mst && md; 
        }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); 
        $('#reqTableBody').innerHTML = f.map(r => `
            <tr>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td><div style="font-weight:600;">${r.nama}</div></td>
                <td>${r.departemen}</td>
                <td>${r.kategori}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.detail}</td>
                <td><span class="badge ${r.prioritas==='High'?'cat-High':'cat-Normal'}">${r.prioritas}</span></td>
                <td><span class="badge status-${r.status||'Pending'}">${r.status||'Pending'}</span></td>
                <td><button class="btn btn-ghost" style="padding:6px 12px;" onclick="openReqDetail('${r.id}')">Review</button></td>
            </tr>`).join(''); 
    }
    window.openReqDetail = (id) => { 
        const r = requests.find(x => x.id === id); if(!r) return; 
        editingId = id; const m = $('#modalReqDetail'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); 
        $('#rd_user').textContent = r.nama; $('#rd_detail').textContent = `${r.kategori} - ${r.detail}`; $('#rd_reason').textContent = `"${r.alasan}"`; $('#rd_notes').value = r.admin_notes || ''; 
        const isHW = (r.detail||'').toLowerCase().match(/laptop|desktop|monitor/); const st = assets.filter(a => a.status === 'Available'); const sel = $('#rd_asset_select'); 
        sel.innerHTML = '<option value="">-- Choose Available Asset --</option>'; 
        if(isHW) { $('#assetAssignSection').style.display = 'block'; st.forEach(a => sel.innerHTML += `<option value="${a.id}">${a.name} [${a.tag}]</option>`); } else { $('#assetAssignSection').style.display = 'none'; } 
    };
    window.processRequest = async (s) => { 
        const id = editingId; const n = $('#rd_notes').value; const aid = $('#rd_asset_select').value; 
        if(s === 'Approved' && $('#assetAssignSection').style.display !== 'none' && !aid) return alert("Assign asset first."); 
        showLoading(); 
        try { 
            if(s === 'Approved' && aid) { const r = requests.find(x => x.id === id); await firestore.collection('assets').doc(aid).update({ status: 'In Use', assigned_uid: r.uid, last_updated: nowISO() }); } 
            await db.ref(`device_requests/${id}`).update({ status: s, admin_notes: n, processed_at: nowISO() }); 
            closeModal('modalReqDetail'); showToast(`Request ${s}`); 
        } finally { hideLoading(); } 
    };
    window.closeModal = (id) => { 
        const m = $(`#${id}`); m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); 
        if (id === 'modalUserDetail') editingUserId = null; if (id === 'modalTicket') editingId = null; 
        if (id === 'modalAnn') editingAnnId = null; if (id === 'modalReqDetail') editingId = null; 
        if (id === 'modalAsset') editingAssetId = null; if (id === 'modalVendor') editingVendorId = null; 
    };
    let chartCat, chartSLA;
    function renderCharts() { 
        const c = { Low:0, Normal:0, Critical:0 }; const sc = { Open:0, Progress:0, Closed:0 }; 
        reports.filter(r=>!r.isDeleted).forEach(r => { c[r.kategori] = (c[r.kategori]||0)+1; sc[r.status] = (sc[r.status]||0)+1; }); 
        const ctxC = $('#chartCategory').getContext('2d'); if(chartCat) chartCat.destroy(); 
        chartCat = new Chart(ctxC, { 
            type: 'doughnut', 
            data: { labels: Object.keys(c), datasets: [{ data: Object.values(c), backgroundColor: ['#0ea5e9', '#f59e0b', '#ef4444'], borderWidth: 0, hoverOffset: 10 }] }, 
            options: { maintainAspectRatio: false, cutout: '75%', plugins: { legend: {position:'right', labels: {boxWidth: 12, usePointStyle: true, font: {family: "'Inter', sans-serif"}}} } } 
        }); 
        const ctxS = $('#chartSLA').getContext('2d'); if(chartSLA) chartSLA.destroy(); 
        const g1 = ctxS.createLinearGradient(0,0,0,300); g1.addColorStop(0, '#f59e0b'); g1.addColorStop(1, '#d97706'); 
        const g2 = ctxS.createLinearGradient(0,0,0,300); g2.addColorStop(0, '#3b82f6'); g2.addColorStop(1, '#2563eb'); 
        const g3 = ctxS.createLinearGradient(0,0,0,300); g3.addColorStop(0, '#10b981'); g3.addColorStop(1, '#059669'); 
        chartSLA = new Chart(ctxS, { 
            type: 'bar', 
            data: { labels: Object.keys(sc), datasets: [{ label:'Tickets', data: Object.values(sc), backgroundColor: [g1, g2, g3], borderRadius: 6, barThickness: 40 }] }, 
            options: { maintainAspectRatio: false, scales: { y: { grid: { display: true, borderDash: [5,5], color: '#e2e8f0' }, beginAtZero: true }, x: { grid: { display: false } } }, plugins: { legend: {display:false} } } 
        }); 
    }
