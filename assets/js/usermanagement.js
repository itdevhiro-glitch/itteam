// ===================================================================
// === (ADMIN) KONFIGURASI ===
// ===================================================================
const ADMIN_UID = "Ogy9lUbGHbSu8wYIYx2gQsTtFDF2";
const ADMIN_EMAIL = "root@zeppelin.center";
// ===================================================================

// === KONFIGURASI FIREBASE ===
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

// [PERUBAHAN] Inisialisasi app utama
const mainApp = firebase.initializeApp(firebaseConfig);
const analytics = mainApp.analytics();
const db = mainApp.database();
const auth = mainApp.auth();
const reportsRef = db.ref('reports'); 
const usersRef = db.ref('users');

/* Cache & State */
let allReportsCache = []; 
let allUsersCache = []; 
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
    
    if (type === 'danger') {
        el.style.background = 'var(--danger)';
    } else if (type === 'warning') {
        el.style.background = 'var(--warning)';
    } else {
        el.style.background = 'var(--primary)'; // Default
    }
    
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

  /* [PERUBAHAN] Kontrol Otentikasi */
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

  // Handle Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    // Saat logout, tampilkan layar error
    appContent.style.display = 'none';
    loadingScreen.style.display = 'flex';
    showAuthError();
  });

  /* [PERUBAHAN] LISTENER OTENTIKASI */
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is logged in, check if they are ADMIN
      if (user.uid !== ADMIN_UID) {
        // Not admin. Show error screen and log them out.
        showAuthError();
        auth.signOut(); 
      } else {
        // IS ADMIN. Show content.
        currentUser = user;
        loadingScreen.style.display = 'none'; 
        appContent.style.display = 'block'; 
        userEmailDisplay.textContent = `ADMIN (root)`;
        
        if (!dbListenerActive) {
          // Listener Laporan (diperlukan untuk hitung tiket)
          reportsRef.on('value', (snapshot) => {
            const dataObj = snapshot.val();
            allReportsCache = dataObj ? Object.keys(dataObj).map(key => ({ ...dataObj[key], id: key })) : [];
            renderUserManagementTable();
            console.log('Data admin (reports) dimuat dari Firebase.');
          }, (error) => {
            console.error("Firebase read (reports) failed:", error);
          });

          // Listener untuk data user
          usersRef.on('value', (snapshot) => {
              const dataObj = snapshot.val();
              allUsersCache = dataObj ? Object.keys(dataObj).map(key => ({ ...dataObj[key], uid: key })) : [];
              renderUserManagementTable();
              console.log('Data admin (users) dimuat dari Firebase.');
          }, (error) => {
              console.error("Firebase read (users) failed:", error);
          });

          dbListenerActive = true;
        }
      }
    } else {
      // User is not logged in. Show error screen.
      showAuthError();
      appContent.style.display = 'none';
      loadingScreen.style.display = 'flex';

      if (dbListenerActive) {
        reportsRef.off(); 
        usersRef.off(); 
        dbListenerActive = false;
        allReportsCache = []; 
        allUsersCache = []; 
      }
    }
  });

  // Listener untuk filter
  document.getElementById('userFilterStatus')?.addEventListener('change', renderUserManagementTable);
  document.getElementById('userSearchInput')?.addEventListener('input', renderUserManagementTable);
  document.getElementById('userFilterDept')?.addEventListener('change', renderUserManagementTable);
  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
      document.getElementById('userSearchInput').value = '';
      document.getElementById('userFilterDept').value = '';
      document.getElementById('userFilterStatus').value = '';
      renderUserManagementTable();
  });
  
  // [BARU] Listener untuk popup Create User
  document.getElementById('showCreateUserPopupBtn').addEventListener('click', () => {
      document.getElementById('createUserPopup').style.display = 'flex';
  });
  document.getElementById('closeCreateUserPopup').addEventListener('click', () => {
      document.getElementById('createUserPopup').style.display = 'none';
      document.getElementById('createUserForm').reset();
      document.getElementById('createUserError').style.display = 'none';
  });
  document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);

  // [BARU] Listener untuk popup Update User
  document.getElementById('closeUserDetail').addEventListener('click', () => {
      document.getElementById('userDetailPopup').style.display = 'none';
  });
  document.getElementById('updateUserForm').addEventListener('submit', handleSubmitUpdateUser);
  
  // [BARU] Listener untuk tombol aksi di dalam popup update
  document.getElementById('popupApproveBtn').addEventListener('click', handlePopupAction);
  document.getElementById('popupRejectBtn').addEventListener('click', handlePopupAction);
  document.getElementById('popupPendingBtn').addEventListener('click', handlePopupAction);

})();


// ===================================================================
// === FUNGSI MANAJEMEN USER (v4 - Update & Create) ===
// ===================================================================
function renderUserManagementTable() {
    const content = document.getElementById('userManagementContent');
    const info = document.getElementById('userCountInfo');
    
    // Cek jika elemen ada (mencegah error jika render pertama gagal)
    const filterStatusEl = document.getElementById('userFilterStatus');
    const filterDeptEl = document.getElementById('userFilterDept');
    const searchEl = document.getElementById('userSearchInput');

    if (!content || !info || !filterStatusEl || !filterDeptEl || !searchEl) {
        console.warn("Elemen UI manajemen user belum siap.");
        return; 
    }
    
    const filterStatus = filterStatusEl.value;
    const filterDept = filterDeptEl.value;
    const search = (searchEl.value || '').toLowerCase();

    // Update Statistik
    let stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
    let departments = new Set();
    allUsersCache.forEach(user => {
        if (user.uid === ADMIN_UID) return;
        const status = user.status || 'pending';
        stats.total++;
        stats[status]++;
        if(user.departemen) departments.add(user.departemen);
    });
    document.getElementById('userStatTotal').textContent = stats.total;
    document.getElementById('userStatPending').textContent = stats.pending;
    document.getElementById('userStatApproved').textContent = stats.approved;
    document.getElementById('userStatRejected').textContent = stats.rejected;

    // Update Filter Departemen Dinamis
    const deptSelect = document.getElementById('userFilterDept');
    const currentDept = deptSelect.value;
    deptSelect.innerHTML = '<option value="">Semua Departemen</option>';
    Array.from(departments).sort().forEach(dept => {
        const option = new Option(dept, dept);
        deptSelect.add(option);
    });
    deptSelect.value = currentDept;

    if (!allUsersCache.length) {
        content.innerHTML = '<p class="small" style="text-align:center; padding: 20px;">Tidak ada user terdaftar.</p>';
        if (info) info.textContent = `Menampilkan 0 user`;
        return;
    }

    // Logika Filter Kompleks
    const filteredUsers = allUsersCache.filter(user => {
        if (user.uid === ADMIN_UID) return false; 
        
        const userStatus = user.status || 'pending'; 
        const userDept = user.departemen || 'N/A';

        const matchStatus = (filterStatus === "") ? true : (userStatus === filterStatus);
        const matchDept = (filterDept === "") ? true : (userDept === filterDept);
        const matchSearch = !search || 
                            (user.nama || '').toLowerCase().includes(search) || 
                            (user.email || '').toLowerCase().includes(search);
                            
        return matchStatus && matchDept && matchSearch;
    });
    
    if (info) info.textContent = `Menampilkan ${filteredUsers.length} dari ${stats.total} user`;
    
    if (!filteredUsers.length) {
        content.innerHTML = `<p class="small" style="text-align:center; padding: 20px;">Tidak ada user cocok dengan filter.</p>`;
        return;
    }
    
    content.innerHTML = `
        <div class="table-wrap" style="margin-top:0;">
        <table style="width:100%; min-width: 900px;">
            <thead>
                <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Departemen</th>
                    <th>Status</th>
                    <th style="text-align: center;">Total Tiket</th>
                    <th style="text-align: center;">Open / Urgent</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${filteredUsers
                    .sort((a,b) => (a.nama || '').localeCompare(b.nama || '')) 
                    .map(user => {
                    
                    const userReports = allReportsCache.filter(r => r.uid === user.uid);
                    const totalTiket = userReports.length;
                    const openTiket = userReports.filter(r => r.status === 'Open' || r.status === 'Progress').length;
                    const urgentTiket = userReports.filter(r => r.urgent === true).length;
                    
                    const status = user.status || 'pending'; 
                    let statusClass = 'cat-normal'; // (Pending)
                    if (status === 'approved') statusClass = 's-closed'; 
                    if (status === 'rejected') statusClass = 'cat-critical'; 

                    // [PERUBAHAN] Aksi disederhanakan menjadi 1 tombol
                    const actions = `<button class="btn ghost" onclick="showUserDetail('${user.uid}')" style="padding: 6px 10px; font-size:13px;">Edit / Detail</button>`;
                    
                    const openUrgentText = urgentTiket > 0 
                        ? `<span class="stat-col-urgent">${openTiket} / ${urgentTiket} 🔥</span>` 
                        : `${openTiket} / 0`;

                    return `
                        <tr>
                            <td data-label="Nama">${user.nama || 'N/A'}</td>
                            <td data-label="Email">${user.email || 'N/A'}</td>
                            <td data-label="Departemen">${user.departemen || 'N/A'}</td> 
                            <td data-label="Status"><span class="status ${statusClass}">${status}</span></td>
                            <td data-label="Total Tiket" class="stat-col">${totalTiket}</td>
                            <td data-label="Open / Urgent" class="stat-col">${openUrgentText}</td>
                            <td data-label="Aksi" class="actions">${actions}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        </div>
    `;
}

// [BARU] Fungsi Aksi Admin (dari dalam popup)
async function handlePopupAction(e) {
    const uid = document.getElementById('updateUserId').value;
    if (!uid) return;
    
    let actionType = '';
    if (e.target.id === 'popupApproveBtn') actionType = 'approved';
    if (e.target.id === 'popupRejectBtn') actionType = 'rejected';
    if (e.target.id === 'popupPendingBtn') actionType = 'pending';

    if (actionType) {
        await updateUserStatus(uid, actionType);
        document.getElementById('userDetailPopup').style.display = 'none';
    }
}

// [PERUBAHAN] Fungsi update status (dipanggil dari popup)
async function updateUserStatus(uid, status) {
    if (!uid || !status) return;
    const user = allUsersCache.find(u => u.uid === uid);
    if (!user) {
        showToast('Gagal update: Data user tidak ditemukan di cache.', 3000, 'danger');
        return;
    }
    
    try {
        await usersRef.child(uid).update({ 
            status: status
            // Data lain (nama, email, dept) di-update oleh form terpisah
            // atau dipastikan ada saat user pertama kali dibuat
        });
        showToast(`User di-set ke '${status}' ✅`);
    } catch (e) {
        console.error("Gagal update status user:", e);
        showToast('Gagal update status: ' + e.message, 3000, 'danger');
    }
}

// [BARU] Fungsi handle submit form update
async function handleSubmitUpdateUser(e) {
    e.preventDefault();
    const uid = document.getElementById('updateUserId').value;
    const nama = document.getElementById('updateUserName').value;
    const departemen = document.getElementById('updateUserDept').value;
    const errorDiv = document.getElementById('updateUserError');

    if (!uid || !nama || !departemen) {
        errorDiv.textContent = 'Nama dan Departemen tidak boleh kosong.';
        errorDiv.style.display = 'block';
        return;
    }
    errorDiv.style.display = 'none';

    try {
        await usersRef.child(uid).update({
            nama: nama,
            departemen: departemen
        });
        showToast('Data user berhasil diperbarui ✅');
        document.getElementById('userDetailPopup').style.display = 'none';
    } catch (e) {
        console.error("Gagal update data user:", e);
        errorDiv.textContent = 'Gagal update: ' + e.message;
        errorDiv.style.display = 'block';
    }
}


// [BARU] Fungsi handle submit form create user
async function handleCreateUser(e) {
    e.preventDefault();
    const nama = document.getElementById('createUserName').value;
    const email = document.getElementById('createUserEmail').value;
    const departemen = document.getElementById('createUserDept').value;
    const password = document.getElementById('createUserPass').value || '123456';
    
    const errorDiv = document.getElementById('createUserError');
    const submitBtn = document.getElementById('submitCreateUser');
    const btnText = document.getElementById('createBtnText');
    const btnSpinner = document.getElementById('createBtnSpinner');

    errorDiv.style.display = 'none';
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';

    // [PENTING] Buat instance Firebase App sekunder untuk create user
    // Ini mencegah admin ter-logout saat user baru dibuat.
    const appName = "secondaryApp-" + Date.now();
    let secondaryApp;
    try {
        secondaryApp = firebase.initializeApp(firebaseConfig, appName);
        
        // 1. Buat user di Firebase Auth (menggunakan app sekunder)
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // 2. Simpan data user di Realtime Database (menggunakan app utama)
        await usersRef.child(uid).set({
            uid: uid,
            nama: nama,
            email: email,
            departemen: departemen,
            status: 'approved', // User yang dibuat admin langsung 'approved'
            created_at: new Date().toISOString(),
            passwordResetRequired: false
        });
        
        // 3. Logout dan hapus app sekunder
        await secondaryApp.auth().signOut();
        await secondaryApp.delete();
        
        showToast('User baru berhasil dibuat! ✅');
        document.getElementById('createUserPopup').style.display = 'none';
        document.getElementById('createUserForm').reset();

    } catch (e) {
        console.error("Gagal membuat user baru:", e);
        errorDiv.textContent = 'Error: ' + e.message;
        errorDiv.style.display = 'block';
        
        // Pastikan app sekunder dihapus jika terjadi error
        if (secondaryApp) {
            await secondaryApp.delete().catch(err => console.error("Gagal hapus secondary app", err));
        }
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnSpinner.style.display = 'none';
    }
}


/* [PERUBAHAN] FUNGSI DETAIL USER (untuk form update) */
function showUserDetail(uid) {
    const user = allUsersCache.find(u => u.uid === uid);
    if (!user) {
        alert("User tidak ditemukan di cache.");
        return;
    }
    
    // Set judul popup
    document.getElementById('userDetailName').textContent = user.nama || user.email;
    
    // Isi form update
    document.getElementById('updateUserId').value = uid;
    document.getElementById('updateUserName').value = user.nama || '';
    document.getElementById('updateUserEmail').value = user.email || '';
    document.getElementById('updateUserDept').value = user.departemen || '';
    
    // Reset error
    document.getElementById('updateUserError').style.display = 'none';
    
    // Atur visibilitas tombol status
    const status = user.status || 'pending';
    document.getElementById('popupApproveBtn').style.display = (status !== 'approved') ? 'block' : 'none';
    document.getElementById('popupRejectBtn').style.display = (status !== 'rejected') ? 'block' : 'none';
    document.getElementById('popupPendingBtn').style.display = (status !== 'pending') ? 'block' : 'none';

    // Render ringkasan tiket
    const ticketSummaryContent = document.getElementById('userDetailTicketSummary');
    const userReports = allReportsCache.filter(r => r.uid === uid);
    const byStatus = { Total: userReports.length, Open: 0, Progress: 0, Closed: 0 };
    
    userReports.forEach(r => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    ticketSummaryContent.innerHTML = `
        <div class="detail-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="detail-card"><div class="small">Total Tiket</div><div class="count">${byStatus.Total}</div></div>
            <div class="detail-card"><div class="small">Open</div><div class="count" style="color:var(--warning)">${byStatus.Open}</div></div>
            <div class="detail-card"><div class="small">Progress</div><div class="count" style="color:var(--primary)">${byStatus.Progress}</div></div>
            <div class="detail-card"><div class="small">Closed</div><div class="count" style="color:var(--success)">${byStatus.Closed}</div></div>
        </div>
    `;
    
    // Tampilkan popup
    document.getElementById('userDetailPopup').style.display = 'flex';
}

// Expose functions to global
window.showUserDetail = showUserDetail; 

// Fungsi lama (approveUser, rejectUser, makePending) tidak lagi diexpose
// karena sudah diganti dengan handlePopupAction dan updateUserStatus
