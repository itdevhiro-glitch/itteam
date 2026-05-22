// ===================================================================
// === (ADMIN) KONFIGURASI ===
// ===================================================================
const ADMIN_UID = "Ogy9lUbGHbSu8wYIYx2gQsTtFDF2";
const ADMIN_EMAIL = "root@zeppelin.center";
// ===================================================================

// === KONFIGURASI FIREBASE (v8) ===
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

firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const db = firebase.database(); // <-- Inisialisasi Realtime Database (RTDB)
const auth = firebase.auth();
const fb_db = firebase.firestore(); // <-- [BARU] Inisialisasi Firestore

const usersRef = db.ref('users');
const requestsRef = db.ref('device_requests'); // Ref untuk permintaan (RTDB)
let fb_assetsCollectionRef; // <-- Variabel untuk koleksi Aset (Firestore)

/* Cache & State */
let allUsersCache = []; 
let allRequestsCache = []; 
let allAssetsCache = []; // [BARU] Cache untuk Aset dari Firestore
let currentUser = null; 
let dbListenerActive = false; 

/* Utilities */
function nowString(){ return new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }); }

function showToast(txt, t = 3000, type = 'success') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'card';
    el.style.padding = '12px 16px';
    el.style.marginBottom = '10px';
    
    if (type === 'danger') { el.style.background = 'var(--danger)'; }
    else if (type === 'warning') { el.style.background = 'var(--warning)'; }
    else { el.style.background = 'var(--primary)'; }
    
    el.style.color = '#fff';
    el.style.fontWeight = '600';
    el.textContent = txt; 
    container.appendChild(el);
    setTimeout(() => el.remove(), t);
}


/* (ADMIN) Init */
(function init(){
  const dateTimeEl = document.getElementById('dateTime');
  const footerDate = document.getElementById('footerDate');
  footerDate.textContent = new Date().toLocaleDateString('id-ID', { year: 'numeric' });
  function updateTime(){ dateTimeEl.textContent = new Date().toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  setInterval(updateTime,1000); updateTime();

  const loadingScreen = document.getElementById('loadingScreen');
  const appContent = document.querySelector('.app-content');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const authErrorDiv = document.getElementById('authError');
  const loadingSpinner = document.querySelector('.loading-spinner');
  const loadingText = document.getElementById('loadingText');

  function showAuthError() {
    loadingSpinner.style.display = 'none';
    loadingText.textContent = 'Akses Ditolak';
    authErrorDiv.style.display = 'block';
  }

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    appContent.style.display = 'none';
    loadingScreen.style.display = 'flex';
    showAuthError();
  });

  /* LISTENER OTENTIKASI (v8) */
  auth.onAuthStateChanged((user) => {
    if (user) {
      if (user.uid !== ADMIN_UID) {
        showAuthError();
        auth.signOut(); 
      } else {
        currentUser = user;
        loadingScreen.style.display = 'none'; 
        appContent.style.display = 'block'; 
        userEmailDisplay.textContent = `ADMIN (root)`;
        
        // Inisialisasi Koleksi Aset di Firestore
        fb_assetsCollectionRef = fb_db.collection('users').doc(user.uid).collection('assets_v2');
        console.log("Koneksi ke Firestore (Aset) berhasil:", `users/${user.uid}/assets_v2`);
        
        if (!dbListenerActive) {
          // Listener untuk data user (dibutuhkan untuk filter dept)
          usersRef.on('value', (snapshot) => {
              const dataObj = snapshot.val();
              allUsersCache = dataObj ? Object.keys(dataObj).map(key => ({ ...dataObj[key], uid: key })) : [];
              renderRequestsTable(); // Render ulang tabel saat data user update
              console.log('Data admin (users) dimuat.');
          }, (error) => {
              console.error("Firebase read (users) failed:", error);
          });
          
          // Listener untuk data permintaan (RTDB)
          requestsRef.on('value', (snapshot) => {
              const dataObj = snapshot.val();
              allRequestsCache = dataObj ? Object.keys(dataObj).map(key => ({ ...dataObj[key], id: key })) : [];
              renderRequestsTable();
              console.log('Data admin (requests) dimuat.');
          }, (error) => {
              console.error("Firebase read (requests) failed:", error);
          });

          // [BARU] Listener untuk data Aset (Firestore)
          // Kita butuh ini untuk mengisi dropdown stok
          fb_assetsCollectionRef.onSnapshot((snapshot) => {
              allAssetsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              console.log(`Data Aset (Stok) dimuat: ${allAssetsCache.length} item.`);
          }, (error) => {
              console.error("Firebase read (assets) failed:", error);
              showToast("Gagal memuat data stok aset!", 5000, 'danger');
          });

          dbListenerActive = true;
        }
      }
    } else {
      showAuthError();
      appContent.style.display = 'none';
      loadingScreen.style.display = 'flex';

      if (dbListenerActive) {
        usersRef.off(); 
        requestsRef.off(); 
        // Note: kita tidak bisa mematikan listener onSnapshot Firestore secara eksplisit di sini tanpa menyimpannya
        dbListenerActive = false;
        allUsersCache = []; 
        allRequestsCache = []; 
        allAssetsCache = []; // [BARU] Kosongkan cache aset
      }
    }
  });

  // Listener untuk filter
  document.getElementById('filterStatus').addEventListener('change', renderRequestsTable);
  document.getElementById('filterSearch').addEventListener('input', renderRequestsTable);
  document.getElementById('filterDept').addEventListener('change', renderRequestsTable);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
      document.getElementById('filterSearch').value = '';
      document.getElementById('filterDept').value = '';
      document.getElementById('filterStatus').value = 'Pending'; // Kembali ke default
      renderRequestsTable();
  });
  
  // Listener untuk Popup
  document.getElementById('closeDetailPopup').addEventListener('click', () => {
      document.getElementById('requestDetailPopup').style.display = 'none';
  });
  document.getElementById('actionApprove').addEventListener('click', () => handleRequestAction('Approved'));
  document.getElementById('actionReject').addEventListener('click', () => handleRequestAction('Rejected'));
})();


// ===================================================================
// === [DIUBAH] FUNGSI MANAJEMEN PERMINTAAN (DENGAN INTEGRASI) ===
// ===================================================================
function renderRequestsTable() {
    const content = document.getElementById('requestsContent');
    const info = document.getElementById('requestCountInfo');
    
    const filterStatus = document.getElementById('filterStatus').value;
    const filterDept = document.getElementById('filterDept').value;
    const search = (document.getElementById('filterSearch').value || '').toLowerCase();

    // Update Statistik
    let stats = { Pending: 0, Approved: 0, Rejected: 0 };
    let departments = new Set();
    
    allRequestsCache.forEach(req => {
        const status = req.status || 'Pending';
        if (stats.hasOwnProperty(status)) {
            stats[status]++;
        }
        if(req.departemen) departments.add(req.departemen);
    });
    document.getElementById('statPending').textContent = stats.Pending;
    document.getElementById('statApproved').textContent = stats.Approved;
    document.getElementById('statRejected').textContent = stats.Rejected;

    // Update Filter Departemen Dinamis
    const deptSelect = document.getElementById('filterDept');
    const currentDept = deptSelect.value;
    deptSelect.innerHTML = '<option value="">Semua Departemen</option>';
    Array.from(departments).sort().forEach(dept => {
        const option = new Option(dept, dept);
        deptSelect.add(option);
    });
    deptSelect.value = currentDept;

    // Logika Filter
    const filteredRequests = allRequestsCache.filter(req => {
        const userStatus = req.status || 'Pending'; 
        const userDept = req.departemen || 'N/A';

        const matchStatus = (filterStatus === "") ? true : (userStatus === filterStatus);
        const matchDept = (filterDept === "") ? true : (userDept === filterDept);
        const matchSearch = !search || 
                            (req.nama || '').toLowerCase().includes(search) || 
                            (req.email || '').toLowerCase().includes(search) ||
                            (req.detail || '').toLowerCase().includes(search) ||
                            (req.kategori || '').toLowerCase().includes(search);
                            
        return matchStatus && matchDept && matchSearch;
    });
    
    info.textContent = `Menampilkan ${filteredRequests.length} dari ${allRequestsCache.length} permintaan`;
    
    if (!filteredRequests.length) {
        content.innerHTML = `<p class="small" style="text-align:center; padding: 20px;">Tidak ada permintaan cocok dengan filter.</p>`;
        return;
    }
    
    // Urutkan: Pending & High di atas
    filteredRequests.sort((a, b) => {
        // Prioritaskan Pending
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        
        // Jika sama-sama Pending, prioritaskan High
        if (a.status === 'Pending' && b.status === 'Pending') {
            if (a.prioritas === 'High' && b.prioritas !== 'High') return -1;
            if (a.prioritas !== 'High' && b.prioritas === 'High') return 1;
        }
        // Jika status lain, urutkan berdasarkan tanggal terbaru
        return new Date(b.created_at) - new Date(a.created_at);
    });
    
    content.innerHTML = `
        <div class="table-wrap" style="margin-top:0;">
        <table>
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>User</th>
                    <th>Departemen</th>
                    <th>Kategori</th>
                    <th>Detail</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${filteredRequests.map(req => {
                    const statusClass = `status-${req.status || 'Pending'}`;
                    const createdDate = new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    let prioClass = `prio-${req.prioritas || 'Medium'}`;
                    let prioIcon = '';
                    if (req.prioritas === 'High') {
                        prioIcon = '<svg style="width:14px; height:14px;"><use href="#icon-prio-high" /></svg>';
                    }

                    return `
                        <tr>
                            <td data-label="Tanggal">${createdDate}</td>
                            <td data-label="User">${req.nama || 'N/A'}</td>
                            <td data-label="Departemen">${req.departemen || 'N/A'}</td> 
                            <td data-label="Kategori">${req.kategori || 'N/A'}</td>
                            <td data-label="Detail">${req.detail || 'N/A'}</td>
                            <td data-label="Prioritas" class="${prioClass}">${prioIcon} ${req.prioritas || 'N/A'}</td>
                            <td data-label="Status"><span class="status ${statusClass}">${req.status}</span></td>
                            <td data-label="Aksi" class="actions">
                                <button class="btn ghost" onclick="showRequestDetail('${req.id}')" style="padding: 6px 10px; font-size:13px;">
                                    Proses
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        </div>
    `;
}

// [DIUBAH] Tampilkan Popup dengan Logika Stok
function showRequestDetail(requestId) {
    const req = allRequestsCache.find(r => r.id === requestId);
    if (!req) {
        alert("Error: Permintaan tidak ditemukan.");
        return;
    }
    
    document.getElementById('popupRequestId').value = requestId;
    document.getElementById('popupDetailName').textContent = req.detail || 'N/A';
    
    document.getElementById('popupUserNama').textContent = req.nama || 'N/A';
    document.getElementById('popupUserDept').textContent = req.departemen || 'N/A';
    
    document.getElementById('popupDetailKategori').textContent = req.kategori || 'N/A';
    document.getElementById('popupDetailPrioritas').textContent = req.prioritas || 'N/A';
    document.getElementById('popupDetailPerangkat').textContent = req.detail || 'N/A';
    document.getElementById('popupDetailAlasan').textContent = req.alasan || '(Tidak ada alasan)';
    
    document.getElementById('adminNotes').value = req.admin_notes || '';
    
    // Tampilkan/sembunyikan tombol berdasarkan status
    document.getElementById('actionApprove').style.display = req.status === 'Approved' ? 'none' : 'inline-flex';
    document.getElementById('actionReject').style.display = req.status === 'Rejected' ? 'none' : 'inline-flex';

    // --- [BARU] Logika untuk menampilkan dropdown assignment aset ---
    const assetSection = document.getElementById('assetAssignmentSection');
    const assetDropdown = document.getElementById('assetAssignmentDropdown');
    assetDropdown.innerHTML = '<option value="">-- Pilih Aset dari Stok --</option>'; // Reset
    
    const reqDetail = (req.detail || '').toLowerCase();
    
    // Cek apakah ini permintaan Laptop, Desktop, atau Monitor
    const isAssignableRequest = reqDetail.includes('laptop') || reqDetail.includes('desktop') || reqDetail.includes('monitor');
    
    if (isAssignableRequest) {
        // Filter stok aset (Tipe L/D/M dan PIC nya kosong)
        const stock = allAssetsCache.filter(asset =>
            (asset.type === 'Laptop' || asset.type === 'Desktop' || asset.type === 'Monitor') &&
            (!asset.pic || asset.pic === '') // 'pic' kosong berarti tidak terpakai/stok
        );

        if (stock.length > 0) {
            stock.forEach(item => {
                const option = new Option(`${item.name} (Tipe: ${item.type}, S/N: ${item.serial || 'N/A'})`, item.id);
                assetDropdown.add(option);
            });
        } else {
            assetDropdown.innerHTML = '<option value="">-- STOK UNTUK ASET INI KOSONG --</option>';
        }
        assetSection.style.display = 'block'; // Tampilkan
    } else {
        assetSection.style.display = 'none'; // Sembunyikan
    }
    // --- Akhir Logika Dropdown ---

    document.getElementById('requestDetailPopup').style.display = 'flex';
}

// [DIUBAH] Aksi Popup (Approve / Reject) dengan Integrasi Stok Firestore
async function handleRequestAction(newStatus) {
    const requestId = document.getElementById('popupRequestId').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
    if (!requestId) return;

    // Dapatkan data permintaan lengkap dari cache
    const req = allRequestsCache.find(r => r.id === requestId);
    if (!req) {
        alert('Error: Data permintaan tidak ditemukan di cache.');
        return;
    }
    
    // Disable tombol
    document.getElementById('actionApprove').disabled = true;
    document.getElementById('actionReject').disabled = true;

    try {
        if (newStatus === 'Approved') {
            // Cek apakah ini request yang 'assignable' (Dropdown-nya terlihat)
            const assetSection = document.getElementById('assetAssignmentSection');
            let finalAdminNotes = adminNotes;

            if (assetSection.style.display === 'block') {
                // --- [LOGIKA BARU] Assign Aset dari Stok ---
                const selectedAssetId = document.getElementById('assetAssignmentDropdown').value;
                if (!selectedAssetId) {
                    showToast('Pilih aset dari stok untuk ditetapkan ke user!', 4000, 'danger');
                    return; // Hentikan proses
                }
                
                // 1. Update Aset di Firestore
                const assetUpdateData = {
                    pic: req.nama,                      // Tetapkan PIC ke user peminta
                    location: req.departemen,           // Tetapkan Lokasi ke dept peminta
                    lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
                };
                await fb_assetsCollectionRef.doc(selectedAssetId).update(assetUpdateData);
                
                // 2. Siapkan catatan untuk RTDB
                finalAdminNotes = `Disetujui. Aset (ID: ${selectedAssetId}) telah ditetapkan untuk ${req.nama}.\n\n${adminNotes}`;
                showToast(`Permintaan di-SETUJUI dan aset (ID: ${selectedAssetId}) telah di-assign!`);

            } else {
                // --- [LOGIKA BARU] Permintaan Biasa (Mouse, Keyboard, Upgrade, dll) ---
                // Tidak ada aksi ke database Aset, hanya setujui permintaan.
                finalAdminNotes = `Disetujui.\n\n${adminNotes}`;
                showToast(`Permintaan di-SETUJUI! (Non-stok)`);
            }
            
            // 3. Update Permintaan di RTDB (Berlaku untuk SEMUA jenis persetujuan)
            await requestsRef.child(requestId).update({
                status: newStatus,
                admin_notes: finalAdminNotes,
                processed_at: new Date().toISOString()
            });

        } else { 
            // --- Logika LAMA (jika di-REJECT) ---
            await requestsRef.child(requestId).update({
                status: newStatus, // Akan "Rejected"
                admin_notes: adminNotes,
                processed_at: new Date().toISOString()
            });
            showToast(`Permintaan di-${newStatus}!`, 3000, 'warning');
        }
        
        // Apapun hasilnya, tutup popup
        document.getElementById('requestDetailPopup').style.display = 'none';

    } catch (e) {
        console.error(`Gagal memproses permintaan (${newStatus}):`, e);
        showToast(`Gagal: ${e.message}`, 4000, 'danger');
    } finally {
        // Aktifkan kembali tombol
        document.getElementById('actionApprove').disabled = false;
        document.getElementById('actionReject').disabled = false;
    }
}

// Expose functions to global
window.showRequestDetail = showRequestDetail;
