dayjs.extend(window.dayjs_plugin_relativeTime);
    const firebaseConfig = {
        apiKey: "AIzaSyA9wgSalrlTcveIZi2i-WND86z1i9JYHKw",
        authDomain: "it-support-53eeb.firebaseapp.com",
        databaseURL: "https://it-support-53eeb-default-rtdb.firebaseio.com",
        projectId: "it-support-53eeb",
        storageBucket: "it-support-53eeb.firebasestorage.app",
        messagingSenderId: "573924501146",
        appId: "1:573924501146:web:12f34306ed675472322123"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const auth = firebase.auth();

    let currentUser = null;
    let reports = [];
    let activeId = null;
    let curTab = 'all';
    let dashSearchTerm = '';
    let isInternalMode = false;
    let chart1 = null, chart2 = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            db.ref('users/' + user.uid).once('value').then(snap => {
                const p = snap.val();
                if (p && (p.role === 'Support' || p.role === 'Admin' || p.departemen === 'IT')) {
                    currentUser = { uid: user.uid, ...p };
                    initApp();
                } else {
                    alert("Akses Ditolak."); auth.signOut();
                }
            });
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('appLayout').classList.add('hidden');
        }
    });

    async function processLogin() {
        const id = document.getElementById('loginId').value;
        const pass = document.getElementById('loginPass').value;
        try {
            let email = id;
            if(!id.includes('@')) {
                const s = await db.ref('users').orderByChild('nik').equalTo(id).once('value');
                if(!s.exists()) throw new Error("ID tidak ditemukan");
                email = Object.values(s.val())[0].email;
            }
            await auth.signInWithEmailAndPassword(email, pass);
        } catch(e) {
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loginError').textContent = e.message;
        }
    }

    function initApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appLayout').classList.remove('hidden');
        document.getElementById('myName').textContent = currentUser.nama;
        document.getElementById('myAvatar').textContent = currentUser.nama.charAt(0);
        document.getElementById('dashDate').textContent = dayjs().format('DD MMMM YYYY');

        db.ref('reports').on('value', snap => {
            const val = snap.val();
            reports = val ? Object.keys(val).map(k => ({...val[k], id: k})) : [];
            reports.sort((a,b) => new Date(b.created_iso) - new Date(a.created_iso));
            renderTickets();
            updateDashboardData();
            if(activeId) loadTimeline(reports.find(r => r.id === activeId));
        });

        const importInput = document.getElementById('ticketExcelImport');
        if (importInput && !importInput.dataset.bound) {
            importInput.dataset.bound = '1';
            importInput.addEventListener('change', e => importTicketsExcel(e.target.files[0]));
        }
        setTimeout(renderCharts, 500);
    }

    window.switchView = (view) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById('view-' + view).classList.add('active');
        document.getElementById('nav-db').classList.remove('active');
        document.getElementById('nav-ws').classList.remove('active');
        if(view === 'workspace') document.getElementById('nav-ws').classList.add('active');
        if(view === 'dashboard') {
            document.getElementById('nav-db').classList.add('active');
            updateDashboardData();
            setTimeout(renderCharts, 200);
        }
    };

    window.setTab = (t) => {
        curTab = t;
        document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
        if(t==='all') document.getElementById('tabAll').classList.add('active');
        if(t==='mine') document.getElementById('tabMine').classList.add('active');
        if(t==='critical') document.getElementById('tabCrit').classList.add('active');
        renderTickets();
    };

    function renderTickets() {
        const list = document.getElementById('ticketList'); list.innerHTML = '';
        const search = document.getElementById('searchInput').value.toLowerCase();
        let filtered = reports.filter(r => !r.isDeleted && r.status !== 'Closed');
        if(curTab === 'mine') filtered = filtered.filter(r => r.pic === currentUser.nama);
        if(curTab === 'critical') filtered = filtered.filter(r => r.kategori === 'Critical');
        filtered = filtered.filter(r => (r.id+r.nama+r.jenis).toLowerCase().includes(search));

        filtered.forEach(r => {
            const div = document.createElement('div');
            div.className = `ticket-card ${activeId === r.id ? 'active' : ''}`;
            div.onclick = () => { activeId = r.id; renderTickets(); loadTimeline(r); };
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:4px;">
                    <span style="font-family:monospace; font-weight:700;">${r.id}</span>
                    <span>${dayjs(r.created_iso).fromNow(true)}</span>
                </div>
                <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${r.jenis}</div>
                <div style="font-size:12px; color:#64748b;">${r.nama}</div>
                <div style="margin-top:6px;"><span class="badge bg-${r.status}">${r.status}</span></div>
            `;
            list.appendChild(div);
        });
    }

    function loadTimeline(r) {
        if(!r) return;
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('activeTicket').classList.remove('hidden');
        document.getElementById('h_id').textContent = r.id;
        document.getElementById('h_subj').textContent = r.jenis;
        document.getElementById('h_user').textContent = r.nama;
        document.getElementById('h_dept').textContent = r.departemen || '-';
        document.getElementById('statusSelect').value = r.status;
        
        const btn = document.getElementById('btnTake');
        if(r.pic === currentUser.nama) { btn.style.display = 'none'; }
        else if(r.pic) { btn.textContent = `Handled by ${r.pic}`; btn.disabled = true; btn.style.display='block'; }
        else { btn.textContent = "Ambil Tiket"; btn.disabled = false; btn.style.display='block'; }

        const tl = document.getElementById('timelineArea'); tl.innerHTML = '';
        
        // Initial Request
        tl.innerHTML += `
            <div class="tl-item left">
                <div class="tl-avatar">${r.nama.charAt(0)}</div>
                <div class="tl-bubble">
                    <div style="font-size:11px; color:#94a3b8; margin-bottom:4px;">${r.nama} &bull; ${dayjs(r.created_iso).format('DD MMM HH:mm')}</div>
                    ${r.catatan || 'Tidak ada deskripsi.'}
                </div>
            </div>
        `;

        if(r.note_internal) {
            const items = r.note_internal.split('\n').filter(l => l.trim());
            items.forEach(item => {
                // Parsing Log Format: [TYPE TIME NAME]: Msg
                if(item.startsWith('[')) {
                    // Internal Log / System Update
                    tl.innerHTML += `
                        <div class="tl-item center">
                            <div class="log-box">
                                <div class="log-header">
                                    <span>SYSTEM LOG</span>
                                    <i class="ri-history-line"></i>
                                </div>
                                <div>${item}</div>
                            </div>
                        </div>`;
                } else {
                    // Public Reply (Legacy format support if needed, or structured differently)
                    // Assuming regular text is tech reply
                    tl.innerHTML += `
                        <div class="tl-item right">
                            <div class="tl-bubble">
                                <div class="tl-meta">Tech Reply</div>
                                ${item}
                            </div>
                        </div>`;
                }
            });
        }
        tl.scrollTop = tl.scrollHeight;
    }

    window.setMode = (mode) => {
        isInternalMode = (mode === 'internal');
        document.getElementById('optReply').className = isInternalMode ? 'toggle-opt' : 'toggle-opt active';
        document.getElementById('optInternal').className = isInternalMode ? 'toggle-opt active-internal' : 'toggle-opt';
        const area = document.getElementById('replyInput');
        if(isInternalMode) {
            area.placeholder = "Tulis catatan internal untuk log progress...";
            area.classList.add('internal-mode');
        } else {
            area.placeholder = "Tulis balasan publik ke user...";
            area.classList.remove('internal-mode');
        }
    };

    window.takeTicket = () => {
        const timestamp = dayjs().format('DD/MM HH:mm');
        const log = `[PROGRESS ${timestamp} ${currentUser.nama}]: Tiket diambil (In Progress).`;
        const old = reports.find(x => x.id === activeId).note_internal || "";
        db.ref('reports/' + activeId).update({ 
            pic: currentUser.nama, 
            status: 'Progress',
            note_internal: old + `\n${log}`
        });
    };

    window.submitUpdate = () => {
        const txt = document.getElementById('replyInput').value;
        const st = document.getElementById('statusSelect').value;
        const r = reports.find(x => x.id === activeId);
        let updates = { status: st, updated_iso: new Date().toISOString() };
        if(!r.pic) updates.pic = currentUser.nama;

        let logEntry = "";
        const timestamp = dayjs().format('DD/MM HH:mm');
        
        // Logic Marking Progress
        if(txt) {
            if(isInternalMode) {
                logEntry = `[INTERNAL ${timestamp} ${currentUser.nama}]: ${txt}`;
            } else {
                logEntry = `[REPLY ${timestamp} ${currentUser.nama}]: ${txt}`;
                // Di sini bisa tambahkan trigger kirim email notifikasi ke user
            }
        } else if (st !== r.status) {
             logEntry = `[STATUS ${timestamp} ${currentUser.nama}]: Status diubah menjadi ${st}.`;
        }

        if(logEntry) {
            updates.note_internal = (r.note_internal || "") + `\n${logEntry}`;
        }
        
        db.ref('reports/' + activeId).update(updates);
        document.getElementById('replyInput').value = '';
    };

    function updateDashboardData() {
        const all = reports.filter(r => !r.isDeleted);
        document.getElementById('kpiTotal').textContent = all.length;
        document.getElementById('kpiOpen').textContent = all.filter(r => r.status === 'Open' || r.status === 'Progress').length;
        document.getElementById('kpiCrit').textContent = all.filter(r => r.kategori === 'Critical' && r.status !== 'Closed').length;
        const closed = all.filter(r => r.status === 'Closed').length;
        document.getElementById('kpiRate').textContent = closed;
        renderDashTable();
    }

    window.renderDashTable = () => {
        const all = reports.filter(r => !r.isDeleted);
        const filtered = all.filter(r => (r.id+r.jenis+r.nama).toLowerCase().includes(dashSearchTerm));
        const tbody = document.getElementById('dashTableBody');
        tbody.innerHTML = '';
        filtered.slice(0, 50).forEach(r => {
            tbody.innerHTML += `
                <tr>
                    <td style="font-family:monospace; color:var(--primary); font-weight:700;">${r.id}</td>
                    <td>${dayjs(r.created_iso).format('DD/MM HH:mm')}</td>
                    <td>${r.jenis}</td>
                    <td>${r.nama}</td>
                    <td><span class="badge bg-${r.status}">${r.status}</span></td>
                    <td>${r.pic || '-'}</td>
                </tr>
            `;
        });
    };

    function renderCharts() {
        if(!reports.length) return;
        const valid = reports.filter(r => !r.isDeleted);
        const cats = {}; const stats = {Open:0, Progress:0, Closed:0};
        valid.forEach(r => {
            cats[r.jenis] = (cats[r.jenis] || 0) + 1;
            if(stats[r.status] !== undefined) stats[r.status]++;
        });

        const ctx1 = document.getElementById('chartCat').getContext('2d');
        if(chart1) chart1.destroy();
        chart1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: Object.keys(cats).slice(0, 6),
                datasets: [{ label: 'Jumlah', data: Object.values(cats).slice(0, 6), backgroundColor: '#4f46e5', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display:false} } }
        });

        const ctx2 = document.getElementById('chartStat').getContext('2d');
        if(chart2) chart2.destroy();
        chart2 = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Open', 'Progress', 'Closed'],
                datasets: [{ data: [stats.Open, stats.Progress, stats.Closed], backgroundColor: ['#f59e0b', '#0ea5e9', '#10b981'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: {position:'right'} } }
        });
    }


    const cleanExcelValue = (v) => {
        if (v === undefined || v === null) return '';
        if (typeof v !== 'string') return v;
        const t = v.trim();
        if (!t) return '';
        if (t === 'true') return true;
        if (t === 'false') return false;
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
            try { return JSON.parse(t); } catch (_) { return v; }
        }
        return v;
    };
    const normalizeExcelRow = (row) => {
        const out = {};
        Object.entries(row || {}).forEach(([k,v]) => {
            if (!k || k === 'note') return;
            const val = cleanExcelValue(v);
            if (val !== '') out[k] = val;
        });
        return out;
    };
    window.exportTicketsExcel = () => {
        if (!window.XLSX) return alert('Library Excel belum termuat. Cek koneksi internet/CDN SheetJS.');
        const rows = reports.map(row => {
            const out = {};
            Object.keys(row || {}).sort().forEach(k => {
                const v = row[k];
                out[k] = (v && typeof v === 'object') ? JSON.stringify(v) : (v ?? '');
            });
            return out;
        });
        const wb = XLSX.utils.book_new();
        const data = rows.length ? rows : [{ id: '', note: 'Belum ada tiket' }];
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = Object.keys(data[0]).map(h => ({ wch: Math.min(45, Math.max(12, h.length + 4, ...data.map(r => String(r[h] ?? '').length).slice(0,200))) }));
        ws['!autofilter'] = ws['!ref'] ? { ref: ws['!ref'] } : undefined;
        XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
        XLSX.writeFile(wb, `zeppelin_help_tickets_${new Date().toISOString().slice(0,10)}.xlsx`);
    };
    window.importTicketsExcel = async (file) => {
        if (!file) return;
        if (!window.XLSX) return alert('Library Excel belum termuat. Cek koneksi internet/CDN SheetJS.');
        if (!confirm('Upload Excel akan update/merge tiket berdasarkan kolom id. Data yang tidak ada di Excel tidak akan dihapus. Lanjut?')) return;
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const sheet = wb.SheetNames.find(n => n.toLowerCase() === 'tickets') || wb.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' }).map(normalizeExcelRow).filter(r => r.id);
            if (!rows.length) throw new Error('Tidak ada baris valid. Pastikan kolom id ada.');
            const updates = {};
            rows.forEach(row => updates[row.id] = { ...row, imported_at: new Date().toISOString() });
            await db.ref('reports').update(updates);
            alert(`Import selesai. ${rows.length} tiket berhasil diupdate/merge.`);
        } catch (e) {
            alert('Import gagal: ' + e.message);
        } finally {
            const input = document.getElementById('ticketExcelImport');
            if (input) input.value = '';
        }
    };
