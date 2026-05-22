import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { 
            getDatabase, 
            ref, 
            onValue, 
            set, 
            push,
            query,
            orderByChild,
            limitToLast
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

        // === FIREBASE CONFIG ===
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
        const ADMIN_ROOT_UID_KEY = 'Ogy9lUbGHbSu8wYIYx2gQsTtFDF2'; 

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app); 

        let loggedInUser = null;
        let activeChat = { id: null, type: null, name: null };
        let usersData = {}; 
        let chatUnsubscribe = null;
        let unreadCounts = {}; 
        let currentLastRead = {}; 

        // UI Elements
        const logoutBtn = document.getElementById('logout-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        
        const welcomeScreen = document.getElementById('welcome-screen');
        const chatContent = document.getElementById('chat-content');
        const chatMessagesEl = document.getElementById('chat-messages');
        const activeChatNameEl = document.getElementById('active-chat-name');
        const activeChatAvatarEl = document.getElementById('active-chat-avatar');
        
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        
        const groupChatListEl = document.getElementById('group-chat-list');
        const privateChatListEl = document.getElementById('private-chat-list');

        // --- Helper Functions ---
        function showToast(message, isSuccess = true) {
            const toast = document.getElementById('toast-notification');
            const icon = toast.querySelector('i');
            const text = toast.querySelector('span');
            
            text.textContent = message;
            icon.className = isSuccess ? 'ri-checkbox-circle-line' : 'ri-error-warning-line';
            toast.className = `toast show ${isSuccess ? 'success' : 'error'}`;
            
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
        }

        window.autoExpand = function(field) {
            field.style.height = 'inherit';
            const computed = window.getComputedStyle(field);
            const height = field.scrollHeight;
            field.style.height = Math.min(height, 120) + 'px';
            field.style.overflowY = height > 120 ? 'auto' : 'hidden';
            
            // Enable/Disable send button logic
            sendButton.disabled = !field.value.trim();
        };

        function getInitials(name, email) {
            if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            if (email) return email.substring(0, 2).toUpperCase();
            return '??';
        }

        function toggleSidebar() {
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('show');
                setTimeout(() => sidebarOverlay.style.display = 'none', 300);
            } else {
                sidebarOverlay.style.display = 'block';
                // force reflow
                sidebarOverlay.offsetHeight; 
                sidebarOverlay.classList.add('show');
                sidebar.classList.add('open');
            }
        }

        // --- Auth Logic ---
        logoutBtn.addEventListener('click', () => {
            if (confirm("Sign out of Zeppelin Chat?")) {
                if (chatUnsubscribe) chatUnsubscribe();
                signOut(auth).then(() => window.location.href = 'index.html');
            }
        });

        onAuthStateChanged(auth, (user) => {
            if (user && user.uid === ADMIN_ROOT_UID_KEY) {
                loggedInUser = user;
                fetchUsersAndSetupLists();
                monitorAllChatsForUnread(); 
            } else {
                window.location.href = 'index.html'; 
            }
        });

        // --- Data Loading ---
        function fetchUsersAndSetupLists() {
            onValue(ref(db, 'users'), (snapshot) => {
                usersData = {};
                const usersArray = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        let u = child.val();
                        u.uid = u.uid || child.key;
                        if (u.status === 'approved' && u.uid !== loggedInUser.uid) {
                            usersData[u.uid] = u;
                            usersArray.push(u);
                        }
                    });
                }
                renderGroupChatList();
                renderPrivateChatList(usersArray);
            });
        }

        function renderGroupChatList() {
            groupChatListEl.innerHTML = '';
            const chatId = `group_all_employees`;
            // Using FontAwesome for the globe icon inside the avatar to match logic if needed, but styling wrapper
            groupChatListEl.innerHTML += createChatItemHTML('group', chatId, 'All Employees', 'General announcement channel', '<i class="fa-solid fa-globe"></i>', 'group-avatar');
        }

        function renderPrivateChatList(users) {
            privateChatListEl.innerHTML = '';
            if (users.length === 0) {
                privateChatListEl.innerHTML = '<div style="padding:10px; text-align:center; font-size:13px; color:#64748b;">No active users found.</div>';
                return;
            }
            users.sort((a, b) => (a.nama || a.email).localeCompare(b.nama || a.email));
            users.forEach(user => {
                const name = user.nama || user.email;
                const info = user.departemen || 'Employee';
                const initials = getInitials(user.nama, user.email);
                privateChatListEl.innerHTML += createChatItemHTML('private', user.uid, name, info, initials, '');
            });
            updateAllChatBadges();
        }

        function createChatItemHTML(type, id, name, subtext, avatarContent, avatarClass) {
            // Check if avatarContent is HTML (icon) or text (initials)
            const isHtml = avatarContent.includes('<');
            const content = isHtml ? avatarContent : avatarContent;
            
            return `
                <div class="chat-item" data-id="${id}" data-type="${type}">
                    <div class="chat-avatar ${avatarClass}">
                        ${content}
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">${escapeHTML(name)}</div>
                        <div class="chat-preview">${escapeHTML(subtext)}</div>
                    </div>
                    <div class="unread-badge" id="badge-${CSS.escape(id)}" style="display:none;">0</div>
                </div>
            `;
        }

        // --- Chat Interaction ---
        document.getElementById('chat-list-container').addEventListener('click', (e) => {
            const item = e.target.closest('.chat-item');
            if (item) {
                const id = item.getAttribute('data-id');
                const type = item.getAttribute('data-type');
                const nameEl = item.querySelector('.chat-name');
                if (nameEl) switchChat(id, type, nameEl.textContent);
            }
        });

        // Sidebar Toggles
        sidebarToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        
        // Input Listeners
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function getChatPath(chatId, chatType) {
            if (chatType === 'group') return `chats/group_chats/${chatId.replace('group_', '')}`;
            const combinedId = [loggedInUser.uid, chatId].sort().join('_');
            return `chats/private_chats/${combinedId}`;
        }

        function switchChat(id, type, name) {
            if (activeChat.id === id) {
                // Just close sidebar on mobile if same chat clicked
                if (window.innerWidth <= 900) toggleSidebar();
                return;
            }
            
            if (chatUnsubscribe) chatUnsubscribe();
            activeChat = { id, type, name };
            
            // Highlight active item
            document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
            const activeItem = document.querySelector(`.chat-item[data-id="${CSS.escape(id)}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
                // Reset badge immediately
                const badge = document.getElementById(`badge-${CSS.escape(id)}`);
                if(badge) badge.style.display = 'none';
                unreadCounts[id] = 0;
            }

            // Show UI
            welcomeScreen.style.display = 'none';
            chatContent.style.display = 'flex';
            
            // Header Info
            activeChatNameEl.textContent = name;
            activeChatAvatarEl.innerHTML = activeItem ? activeItem.querySelector('.chat-avatar').innerHTML : getInitials(name, '');
            activeChatAvatarEl.className = `header-avatar ${type === 'group' ? 'group-avatar' : ''}`;
            
            // Prepare Input
            messageInput.value = '';
            messageInput.focus();
            autoExpand(messageInput);

            // Load Messages
            const path = getChatPath(id, type);
            chatMessagesEl.innerHTML = '';
            updateLastReadTimestamp(id);

            const q = query(ref(db, path), orderByChild('timestamp'), limitToLast(50));
            
            chatUnsubscribe = onValue(q, (snapshot) => {
                const fragment = document.createDocumentFragment();
                let count = 0;
                snapshot.forEach((child) => {
                    const msg = child.val();
                    fragment.appendChild(renderMessage(msg, type));
                    count++;
                });
                
                chatMessagesEl.innerHTML = '';
                if(count === 0) {
                     chatMessagesEl.innerHTML = `
                        <div style="text-align:center; padding:40px; opacity:0.6;">
                            <i class="ri-chat-1-line" style="font-size:32px; display:block; margin-bottom:10px;"></i>
                            <p>No messages yet. Start the conversation!</p>
                        </div>`;
                } else {
                    chatMessagesEl.appendChild(fragment);
                }
                
                chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            });
            
            if (window.innerWidth <= 900) toggleSidebar();
        }

        function renderMessage(msg, chatType) {
            const isSent = msg.senderId === loggedInUser.uid;
            const div = document.createElement('div');
            div.className = `msg-row ${isSent ? 'sent' : 'received'}`;
            
            const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let senderHtml = '';
            
            if (!isSent && chatType === 'group') {
                let sName = msg.senderName;
                if (!sName && usersData[msg.senderId]) sName = usersData[msg.senderId].nama;
                senderHtml = `<span class="msg-sender-name">${escapeHTML(sName || 'Unknown')}</span>`;
            }

            div.innerHTML = `
                <div class="msg-bubble">
                    ${senderHtml}
                    ${escapeHTML(msg.text).replace(/\n/g, '<br>')}
                    <span class="msg-meta">${time}</span>
                </div>
            `;
            return div;
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || !activeChat.id) return;

            messageInput.value = '';
            autoExpand(messageInput);
            
            const msg = {
                senderId: loggedInUser.uid,
                senderName: 'Admin IT (Root)',
                text: text,
                timestamp: Date.now()
            };

            const path = getChatPath(activeChat.id, activeChat.type);
            push(ref(db, path), msg)
                .then(() => {
                    updateLastReadTimestamp(activeChat.id);
                    // play sound or small visual feedback? handled by UI update
                })
                .catch(err => showToast("Failed to send", false));
        }

        // --- Unread Logic ---
        function updateLastReadTimestamp(chatId) {
            set(ref(db, `users/${loggedInUser.uid}/lastRead/${chatId}`), Date.now());
        }

        function monitorAllChatsForUnread() {
            onValue(ref(db, `users/${loggedInUser.uid}/lastRead`), (snap) => {
                currentLastRead = snap.val() || {};
            });

            // Monitor Groups
            onValue(ref(db, 'chats/group_chats'), (snap) => {
                if(snap.exists()) {
                    snap.forEach(c => checkUnread(`group_${c.key}`, c));
                }
            });

            // Monitor Privates
            onValue(ref(db, 'chats/private_chats'), (snap) => {
                if(snap.exists()) {
                    snap.forEach(c => {
                        if(c.key.includes(loggedInUser.uid)) {
                            const targetUID = c.key.split('_').find(u => u !== loggedInUser.uid);
                            if(targetUID) checkUnread(targetUID, c);
                        }
                    });
                }
            });
        }

        function checkUnread(chatId, snapshot) {
            const lastRead = currentLastRead[chatId] || 0;
            let unread = 0;
            let lastMsg = '';
            let lastTime = 0;
            
            snapshot.forEach(mSnap => {
                const m = mSnap.val();
                if (m.timestamp > lastTime) {
                    lastTime = m.timestamp;
                    lastMsg = m.text;
                }
                if (m.senderId !== loggedInUser.uid && m.timestamp > lastRead) {
                    unread++;
                }
            });
            
            unreadCounts[chatId] = unread;
            updateChatBadge(chatId, unread);
            
            // Update preview text in sidebar
            const item = document.querySelector(`.chat-item[data-id="${CSS.escape(chatId)}"]`);
            if (item) {
                const preview = item.querySelector('.chat-preview');
                if (unread > 0) {
                    preview.style.fontWeight = '700';
                    preview.style.color = 'var(--text-primary)';
                    preview.textContent = lastMsg;
                } else {
                    preview.style.fontWeight = 'normal';
                    preview.style.color = '#94a3b8';
                    preview.textContent = lastMsg;
                }
            }
        }

        function updateChatBadge(chatId, count) {
            const badge = document.getElementById(`badge-${CSS.escape(chatId)}`);
            if (!badge) return;
            
            if (activeChat.id === chatId) {
                badge.style.display = 'none';
            } else if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        function updateAllChatBadges() {
             for (const [id, count] of Object.entries(unreadCounts)) {
                 updateChatBadge(id, count);
             }
        }
