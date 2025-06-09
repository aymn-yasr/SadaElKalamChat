// js/chat_script.js
// استيراد الدوال التي تحتاجها من Firebase SDKs
import { auth, db } from "./firebaseInit.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ثوابت لأسماء مجموعات Firestore
const CHAT_ROOM_COLLECTION = "chatRooms";
const MESSAGES_COLLECTION = "messages";
const USERS_COLLECTION = "users";
const NEWS_COLLECTION = "news"; // إضافة مجموعة الأخبار

const LOGIN_PAGE_URL = 'index.html'; // صفحة تسجيل الدخول/الرئيسية
const ADMIN_PANEL_PAGE_URL = 'admin_panel.html'; // صفحة لوحة الإدارة (يجب أن تنشئها)
const PRIVATE_CHAT_PAGE_URL = 'private_chat.html'; // صفحة الدردشات الخاصة (يجب أن تنشئها)
const NOTIFICATIONS_PAGE_URL = 'notifications.html'; // صفحة الإشعارات (يجب أن تنشئها)
const FRIENDS_PAGE_URL = 'friends.html'; // صفحة الأصدقاء (يجب أن تنشئها)
const SETTINGS_PAGE_URL = 'settings.html'; // صفحة الإعدادات (يجب أن تنشئها)
const ROOMS_PAGE_URL = 'rooms.html'; // صفحة الغرف (يجب أن تنشئها)

// تعريفات لمسارات صور الرتب
const RANK_IMAGE_MAP = {
    "مالك الشات": "rank_images/owner.png",
    "مدير": "rank_images/admin.png",
    "مشرف": "rank_images/moderator.png",
    "عضو": "rank_images/member.png",
    "زائر": "rank_images/guest.png",
};

// تعريف الصلاحيات لكل رتبة
const RANK_PERMISSIONS = {
    "مالك الشات": {
        canSendMessage: true,
        canViewMessages: true,
        canKickBan: true,
        canDeleteAnyMessage: true,
        canManageRooms: true,
        canAccessAdminPanel: true,
        canMuteUsers: true,
        canManageNews: true // إضافة صلاحية إدارة الأخبار
    },
    "مدير": {
        canSendMessage: true,
        canViewMessages: true,
        canKickBan: true,
        canDeleteAnyMessage: true,
        canManageRooms: false,
        canAccessAdminPanel: true,
        canMuteUsers: true,
        canManageNews: true // إضافة صلاحية إدارة الأخبار
    },
    "مشرف": {
        canSendMessage: true,
        canViewMessages: true,
        canKickBan: false,
        canDeleteAnyMessage: true,
        canManageRooms: false,
        canAccessAdminPanel: false,
        canMuteUsers: true,
        canManageNews: false // المشرف لا يدير الأخبار إلا إذا أردت ذلك
    },
    "عضو": {
        canSendMessage: true,
        canViewMessages: true,
        canKickBan: false,
        canDeleteAnyMessage: false,
        canManageRooms: false,
        canAccessAdminPanel: false,
        canMuteUsers: false,
        canManageNews: false
    },
    "زائر": {
        canSendMessage: false,
        canViewMessages: true,
        canKickBan: false,
        canDeleteAnyMessage: false,
        canManageRooms: false,
        canAccessAdminPanel: false,
        canMuteUsers: false,
        canManageNews: false
    },
};

// عناصر DOM الرئيسية
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const chatMessages = document.getElementById('chatMessages');

// أزرار الهيدر
const profileButton = document.getElementById('profileButton');
const onlineUsersButton = document.getElementById('onlineUsersButton');
const friendsButton = document.getElementById('friendsButton');
const privateChatButton = document.getElementById('privateChatButton');
const soundButton = document.getElementById('soundButton');
const notificationsButton = document.getElementById('notificationsButton');
const menuButton = document.getElementById('menuButton');

// عناصر DOM لمودال الملف الشخصي
const profileModal = document.getElementById('profileModal');
const closeProfileModalButton = document.getElementById('closeProfileModal');
const modalProfileImage = document.getElementById('modalProfileImage');
const modalProfileUsername = document.getElementById('modalProfileUsername');
const modalProfileRank = document.getElementById('modalProfileRank');

// أزرار مودال الملف الشخصي
const adminPanelButtonModal = document.getElementById('adminPanelButtonModal');
const walletButton = document.getElementById('walletButton');
const levelInfoButton = document.getElementById('levelInfoButton');
const editProfileButtonModal = document.getElementById('editProfileButtonModal');
const leaveRoomButton = document.getElementById('leaveRoomButton');
const logoutModalButton = document.getElementById('logoutModalButton');

// أزرار التنقل السفلية
const homeButton = document.getElementById('homeButton');
const roomsButton = document.getElementById('roomsButton');
const plusButton = document.getElementById('plusButton');
const bottomNotificationButton = document.getElementById('bottomNotificationButton');
const settingsButton = document.getElementById('settingsButton');

// عناصر DOM لمودال المستخدمين المسجلين
const registeredUsersModal = document.getElementById('registeredUsersModal');
const closeRegisteredUsersModalButton = document.getElementById('closeRegisteredUsersModal');
const registeredUsersList = document.getElementById('registeredUsersList');

// عناصر DOM للشريط الجانبي
const sideMenu = document.getElementById('sideMenu');
const chatContainer = document.querySelector('.chat-container');

// أزرار الشريط الجانبي
const refreshPageButton = document.getElementById('refreshPageButton');
const roomsListButton = document.getElementById('roomsListButton');
const friendsWallButton = document.getElementById('friendsWallButton');
const newsButton = document.getElementById('newsButton');
const shopChatButton = document.getElementById('shopChatButton');
const goldShopButton = document.getElementById('goldShopButton');
const miscChatButton = document.getElementById('miscChatButton');
const convertPointsButton = document.getElementById('convertPointsButton');

// عناصر DOM لمودال عرض الأخبار
const newsModal = document.getElementById('newsModal');
const closeNewsModal = document.getElementById('closeNewsModal');
const newsList = document.getElementById('newsList');
const addNewsItemButton = document.getElementById('addNewsItemButton');

// عناصر DOM لمودال إضافة/تعديل الأخبار
const newsInputModal = document.getElementById('newsInputModal');
const closeNewsInputModal = document.getElementById('closeNewsInputModal');
const newsInputModalTitle = document.getElementById('newsInputModalTitle');
const newsContentInput = document.getElementById('newsContentInput');
const saveNewsItemButton = document.getElementById('saveNewsItemButton');
const cancelNewsEditButton = document.getElementById('cancelNewsEditButton');

// متغيرات حالة المستخدم
let currentUserData = null;
let currentRoomId = "general_chat_room";
let soundEnabled = true; // حالة الصوت الافتراضية
let allUsersCached = []; // لتخزين قائمة المستخدمين مرة واحدة

// متغير لتتبع ما إذا كنا في وضع التعديل للأخبار
let editingNewsId = null;

// دالة مساعدة لعرض رسائل النظام
function displaySystemMessage(message, type = 'system_info') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', type);
    messageElement.innerHTML = `<div class="message-content"><p class="message-text">${message}</p></div>`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// دالة لجلب بيانات المستخدم الحالي من Firestore
async function fetchCurrentUserData(uid) {
    try {
        const userDocRef = doc(db, USERS_COLLECTION, uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            currentUserData = userDocSnap.data();
            currentUserData.uid = uid;
            sessionStorage.setItem('currentUserRank', currentUserData.userType);
        } else {
            console.warn("لم يتم العثور على بيانات المستخدم في Firestore:", uid);
            currentUserData = { uid: uid, username: "مستخدم غير معروف", photoURL: "default_images/user.png", userType: "زائر" };
            sessionStorage.setItem('currentUserRank', "زائر");
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات المستخدم:", error);
        currentUserData = { uid: uid, username: "خطأ في التحميل", photoURL: "default_images/user.png", userType: "زائر" };
        sessionStorage.setItem('currentUserRank', "زائر");
    }
}

// دالة مساعدة للتحقق من صلاحية المستخدم الحالي
function hasPermission(permissionKey) {
    if (!currentUserData || !currentUserData.userType) {
        const storedRank = sessionStorage.getItem('currentUserRank');
        if (storedRank) {
            const permissions = RANK_PERMISSIONS[storedRank];
            return permissions ? permissions[permissionKey] : false;
        }
        return false;
    }
    const permissions = RANK_PERMISSIONS[currentUserData.userType];
    return permissions ? permissions[permissionKey] : false;
}

// دالة إرسال رسالة نظام للدردشة (مثل الانضمام والمغادرة)
async function sendChatSystemMessage(messageText, senderUid, senderUsername, senderPhotoURL, type, userType) {
    try {
        await addDoc(collection(doc(db, CHAT_ROOM_COLLECTION, currentRoomId), MESSAGES_COLLECTION), {
            senderUid: senderUid,
            senderUsername: senderUsername,
            senderPhotoURL: senderPhotoURL,
            text: messageText,
            timestamp: serverTimestamp(),
            type: type,
            userType: userType
        });
    } catch (error) {
        console.error("خطأ في إرسال رسالة النظام:", error);
    }
}

// دالة جديدة لجلب جميع المستخدمين من Firestore
async function fetchAllUsers() {
    if (allUsersCached.length > 0) {
        return allUsersCached; // استخدم البيانات المخزنة مؤقتًا إذا كانت موجودة
    }
    const users = [];
    try {
        const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            users.push({ uid: doc.id, username: userData.username, photoURL: userData.photoURL, userType: userData.userType });
        });
        allUsersCached = users; // تخزين البيانات مؤقتًا
    } catch (error) {
        console.error("خطأ في جلب جميع المستخدمين:", error);
    }
    return users;
}

// دالة: لإضافة اسم المستخدم إلى مربع الإدخال عند النقر عليه
function mentionUserInInput(username) {
    if (messageInput) {
        let currentMessage = messageInput.value.trim();
        const mentionText = `@${username}`;

        // إذا كان مربع الإدخال فارغًا، أضف المنشن مباشرة
        if (currentMessage === "") {
            messageInput.value = mentionText;
        } else {
            // تحقق إذا كان آخر كلمة في النص هي نفس اسم المستخدم بدون @
            // هذا لمنع إضافة @اسم_المستخدم مرة أخرى إذا كان المستخدم يحاول تعديل منشن موجود
            const lastWord = currentMessage.split(' ').pop();
            if (lastWord !== mentionText && !currentMessage.includes(mentionText)) {
                messageInput.value += ` ${mentionText}`;
            } else if (lastWord === mentionText && currentMessage.includes(mentionText)) {
                // إذا كان المنشن موجوداً بالفعل كآخر كلمة، لا تفعل شيئاً
                return;
            }
        }
        messageInput.focus();
        // نقل المؤشر إلى نهاية النص لتسهيل الكتابة بعد المنشن
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
    }
}

// دالة لإرسال رسالة نصية (مع إضافة المنشن)
async function sendMessage() {
    if (!hasPermission('canSendMessage')) {
        displaySystemMessage("ليس لديك صلاحية لإرسال الرسائل.", 'system_error');
        return;
    }

    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentUserData) {
        return;
    }

    let mentionedUserUids = []; // لتخزين UID المستخدمين الممنشنين

    // جلب جميع المستخدمين للتحقق من المنشن (يتم التحقق من الكاش أولاً)
    const allUsers = await fetchAllUsers();

    // البحث عن المنشنات في الرسالة
    // نستخدم تعبير منتظم أكثر مرونة للبحث عن @اسم_المستخدم
    const mentionRegex = /@([\u0600-\u06FF\w\s.\-]+)/g; // يسمح بالأحرف العربية والإنجليزية والمسافات والنقاط والواصلات
    let match;
    const currentMessageText = messageText; // نسخة من الرسالة الأصلية للتحقق

    while ((match = mentionRegex.exec(currentMessageText)) !== null) {
        const mentionedUsernameInMessage = match[1].trim(); // اسم المستخدم بعد @
        // البحث عن المستخدم في قائمة المستخدمين المخزنة مؤقتًا
        const user = allUsers.find(u => u.username === mentionedUsernameInMessage);
        if (user && user.uid !== currentUserData.uid) { // تأكد من أنه ليس المستخدم نفسه
            mentionedUserUids.push(user.uid);
        }
    }
    // إزالة أي UIDs مكررة (إذا تم ذكر نفس الشخص عدة مرات)
    mentionedUserUids = [...new Set(mentionedUserUids)];


    try {
        await addDoc(collection(doc(db, CHAT_ROOM_COLLECTION, currentRoomId), MESSAGES_COLLECTION), {
            senderUid: currentUserData.uid,
            senderUsername: currentUserData.username,
            senderPhotoURL: currentUserData.photoURL,
            text: messageText,
            timestamp: serverTimestamp(),
            type: 'user_message',
            userType: currentUserData.userType,
            mentionedUids: mentionedUserUids.length > 0 ? mentionedUserUids : null
        });
        messageInput.value = '';

        // هنا يمكنك إضافة منطق لإرسال إشعار للمستخدمين الممنشنين
        if (mentionedUserUids.length > 0) {
            console.log(`تم منشن المستخدمين ذوي الـ UIDs: ${mentionedUserUids.join(', ')}`);
        }

    } catch (error) {
        console.error("خطأ في إرسال الرسالة:", error);
        displaySystemMessage("فشل إرسال الرسالة. الرجاء المحاولة مرة أخرى.", 'system_error');
    }
}

// دالة لتشغيل صوت الرسالة الجديدة
function playNewMessageSound() {
    if (soundEnabled) {
        const audio = new Audio('sounds/new_message.mp3'); // تأكد من وجود هذا الملف
        audio.play().catch(e => console.error("خطأ في تشغيل الصوت:", e));
    }
}

// دالة لعرض رسالة الدردشة في الواجهة
function displayChatMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.id = message.id;
    messageElement.classList.add('chat-message', message.type.startsWith('system_') ? 'system-message' : 'user-message');

    if (message.type.startsWith('system_')) {
        messageElement.innerHTML = `
            <div class="message-content">
                <p class="message-text">${message.text}</p>
            </div>
        `;
    } else {
        let adminButtons = '';
        if (hasPermission('canDeleteAnyMessage') || (currentUserData && currentUserData.uid === message.senderUid)) {
            adminButtons += `<button class="delete-message-button" data-message-id="${message.id}" data-sender-uid="${message.senderUid}" title="حذف الرسالة"><i class="fas fa-trash"></i></button>`;
        }

        if (hasPermission('canKickBan')) {
            adminButtons += `<button class="kick-user-button" data-uid="${message.senderUid}" data-username="${message.senderUsername}" title="طرد المستخدم"><i class="fas fa-times-circle"></i></button>`;
            adminButtons += `<button class="ban-user-button" data-uid="${message.senderUid}" data-username="${message.senderUsername}" title="حظر المستخدم"><i class="fas fa-ban"></i></button>`;
        }
        if (hasPermission('canMuteUsers')) {
            adminButtons += `<button class="mute-user-button" data-uid="${message.senderUid}" data-username="${message.senderUsername}" title="إسكات المستخدم"><i class="fas fa-volume-mute"></i></button>`;
        }

        const rankImageSrc = RANK_IMAGE_MAP[message.userType] || RANK_IMAGE_MAP['عضو'];

        let displayedText = message.text;
        // التحقق مما إذا كانت الرسالة تتضمن منشن للمستخدم الحالي
        if (message.mentionedUids && currentUserData && message.mentionedUids.includes(currentUserData.uid)) {
            const currentUserUsername = currentUserData.username;
            const escapedUsername = currentUserUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b@?${escapedUsername}\\b`, 'gi');
            displayedText = message.text.replace(regex, `<span class="highlight-mention">@${currentUserUsername}</span>`);
        }
           
        // معالجة المنشنات في النص الأصلي لتغيير مظهرها
        const mentionRegexDisplay = /@([\u0600-\u06FF\w\s.\-]+)/g;
        displayedText = displayedText.replace(mentionRegexDisplay, (match, usernameInMessage) => {
            const user = allUsersCached.find(u => u.username === usernameInMessage.trim());
            if (user) {
                if (currentUserData && user.uid === currentUserData.uid) {
                    return `<span class="highlight-mention">@${user.username}</span>`;
                } else {
                    return `<span class="other-mention">@${user.username}</span>`;
                }
            }
            return match;
        });

        messageElement.innerHTML = `
            <img src="${message.senderPhotoURL || 'default_images/user.png'}" alt="صورة المستخدم" class="user-avatar">
            <div class="message-content">
                <div class="user-info">
                    <span class="username mentionable-username" data-uid="${message.senderUid}" data-username="${message.senderUsername}">${message.senderUsername || 'مستخدم غير معروف'}</span>
                    ${message.userType ? `<img src="${rankImageSrc}" alt="${message.userType}" class="rank-icon">` : ''}
                    <span class="message-time">${message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    <div class="message-actions">${adminButtons}</div>
                </div>
                <p class="message-text">${displayedText}</p>
            </div>
        `;
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // إضافة مستمع حدث للنقر على اسم المرسل للمنشن
    if (!message.type || !message.type.startsWith('system_')) {
        const senderNameSpan = messageElement.querySelector('.mentionable-username');
        if (senderNameSpan) {
            senderNameSpan.style.cursor = 'pointer';
            senderNameSpan.title = 'انقر للإشارة إلى هذا المستخدم';
            senderNameSpan.addEventListener('click', () => {
                const usernameToMention = senderNameSpan.dataset.username;
                if (usernameToMention && currentUserData && usernameToMention !== currentUserData.username) {
                    mentionUserInInput(usernameToMention);
                }
            });
        }
    }
}

// دالة لحذف الرسائل
async function deleteMessage(messageId, senderUid) {
    if (!hasPermission('canDeleteAnyMessage') && !(currentUserData && currentUserData.uid === senderUid)) {
        displaySystemMessage("ليس لديك صلاحية لحذف هذه الرسالة.", 'system_error');
        return;
    }

    if (confirm("هل أنت متأكد أنك تريد حذف هذه الرسالة؟")) {
        try {
            await deleteDoc(doc(db, CHAT_ROOM_COLLECTION, currentRoomId, MESSAGES_COLLECTION, messageId));
            displaySystemMessage("تم حذف الرسالة بنجاح.", 'system_info');
        } catch (error) {
            console.error("خطأ في حذف الرسالة:", error);
            displaySystemMessage("فشل حذف الرسالة. الرجاء المحاولة مرة أخرى.", 'system_error');
        }
    }
}

// الاستماع لرسائل الدردشة في الغرفة الحالية
function listenForMessages() {
    const messagesRef = collection(doc(db, CHAT_ROOM_COLLECTION, currentRoomId), MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                displayChatMessage({ ...change.doc.data(), id: change.doc.id });
                playNewMessageSound();
            }
            if (change.type === "removed") {
                const messageToRemove = document.getElementById(change.doc.id);
                if (messageToRemove) {
                    messageToRemove.remove();
                }
            }
        });
    }, (error) => {
        console.error("خطأ في الاستماع للرسائل:", error);
        displaySystemMessage("خطأ في تحميل الرسائل. الرجاء تحديث الصفحة.");
    });
}

// ===========================================
// معالجات أحداث الأزرار الرئيسية
// ===========================================

// زر الإرسال وحقل الرسالة
if (sendMessageButton) {
    sendMessageButton.addEventListener('click', sendMessage);
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// أزرار إدارة الرسائل (حذف، طرد، حظر، إسكات)
if (chatMessages) {
    chatMessages.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.delete-message-button');
        if (deleteButton) {
            const messageId = deleteButton.dataset.messageId;
            const senderUid = deleteButton.dataset.senderUid;
            await deleteMessage(messageId, senderUid);
        }

        const kickButton = e.target.closest('.kick-user-button');
        if (kickButton) {
            const targetUid = kickButton.dataset.uid;
            const targetUsername = kickButton.dataset.username;
            if (confirm(`هل أنت متأكد من رغبتك في طرد ${targetUsername}؟`)) {
                displaySystemMessage(`تم طرد ${targetUsername}.`, 'system_warning');
                await sendChatSystemMessage(`تم طرد ${targetUsername}.`, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_kick', currentUserData.userType);
                // هنا أضف منطق الطرد الفعلي (مثلاً، تحديث حالة المستخدم في DB أو إزالة المستخدم من الغرفة)
            }
        }

        const banButton = e.target.closest('.ban-user-button');
        if (banButton) {
            const targetUid = banButton.dataset.uid;
            const targetUsername = banButton.dataset.username;
            if (confirm(`هل أنت متأكد من رغبتك في حظر ${targetUsername}؟`)) {
                displaySystemMessage(`تم حظر ${targetUsername}.`, 'system_warning');
                await setDoc(doc(db, USERS_COLLECTION, targetUid), { isBanned: true }, { merge: true });
                await sendChatSystemMessage(`تم حظر ${targetUsername}.`, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_ban', currentUserData.userType);
            }
        }

        const muteButton = e.target.closest('.mute-user-button');
        if (muteButton) {
            const targetUid = muteButton.dataset.uid;
            const targetUsername = muteButton.dataset.username;
            const duration = prompt("أدخل مدة الإسكات بالدقائق:", "60");
            if (duration && !isNaN(parseInt(duration)) && parseInt(duration) > 0) {
                const muteUntil = new Date(Date.now() + parseInt(duration) * 60 * 1000);
                displaySystemMessage(`تم إسكات ${targetUsername} لمدة ${duration} دقيقة.`, 'system_warning');
                await setDoc(doc(db, USERS_COLLECTION, targetUid), { isMuted: true, muteUntil: muteUntil }, { merge: true });
                await sendChatSystemMessage(`تم إسكات ${targetUsername} لمدة ${duration} دقيقة.`, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_mute', currentUserData.userType);
            } else {
                displaySystemMessage("مدة إسكات غير صالحة.", 'system_error');
            }
        }
    });
}

// ===========================================
// وظائف ومودالات الملف الشخصي
// ===========================================

// دالة لفتح المودال وملء البيانات
function openProfileModal() {
    if (!currentUserData) {
        displaySystemMessage("خطأ: بيانات المستخدم غير متوفرة لفتح الملف الشخصي.", 'system_error');
        return;
    }

    modalProfileImage.src = currentUserData.photoURL || 'default_images/user.png';
    modalProfileUsername.textContent = currentUserData.username || 'مستخدم غير معروف';
    modalProfileRank.textContent = `${currentUserData.userType || 'عضو'}`;

    if (adminPanelButtonModal) {
        if (hasPermission('canAccessAdminPanel')) {
            adminPanelButtonModal.style.display = 'flex';
        } else {
            adminPanelButtonModal.style.display = 'none';
        }
    }

    profileModal.style.display = 'flex';
}

// زر الملف الشخصي (يفتح المودال الآن)
if (profileButton) {
    profileButton.addEventListener('click', () => {
        openProfileModal();
    });
}

// زر إغلاق المودال
if (closeProfileModalButton) {
    closeProfileModalButton.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });
}

// إغلاق المودال عند النقر خارج المحتوى
if (profileModal) {
    window.addEventListener('click', (event) => {
        if (event.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });
}

// أزرار المودال
if (adminPanelButtonModal) {
    adminPanelButtonModal.addEventListener('click', () => {
        if (hasPermission('canAccessAdminPanel')) {
            window.location.href = ADMIN_PANEL_PAGE_URL;
        } else {
            displaySystemMessage("ليس لديك صلاحية للوصول إلى لوحة الإدارة.", 'system_error');
        }
        profileModal.style.display = 'none';
    });
}

if (walletButton) {
    walletButton.addEventListener('click', () => {
        alert('وظيفة المحفظة قيد التطوير.');
        profileModal.style.display = 'none';
    });
}

if (levelInfoButton) {
    levelInfoButton.addEventListener('click', () => {
        alert('وظيفة معلومات المستوى قيد التطوير.');
        profileModal.style.display = 'none';
    });
}

if (editProfileButtonModal) {
    editProfileButtonModal.addEventListener('click', () => {
        alert('وظيفة تعديل الملف الشخصي قيد التطوير.');
        profileModal.style.display = 'none';
    });
}

if (leaveRoomButton) {
    leaveRoomButton.addEventListener('click', async () => {
        if (confirm("هل أنت متأكد أنك تريد مغادرة هذه الغرفة؟")) {
            if (currentUserData && currentUserData.uid) {
                const leaveMessageText = `غادر ${currentUserData.username || 'مستخدم'} (${currentUserData.userType || 'عضو'}) الغرفة.`;
                await sendChatSystemMessage(leaveMessageText, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_leave', currentUserData.userType);
                sessionStorage.removeItem(`hasJoinedChatSession_${currentUserData.uid}`);
            }
            displaySystemMessage("لقد غادرت الغرفة. يمكنك الانضمام لغرفة أخرى أو الخروج.", 'system_info');
            profileModal.style.display = 'none';
        }
    });
}

if (logoutModalButton) {
    logoutModalButton.addEventListener('click', async () => {
        if (confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟")) {
            try {
                if (currentUserData && currentUserData.uid) {
                    const leaveMessageText = `غادر ${currentUserData.username || 'مستخدم'} (${currentUserData.userType || 'عضو'}) الشات.`;
                    await sendChatSystemMessage(leaveMessageText, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_leave', currentUserData.userType);
                    sessionStorage.removeItem(`hasJoinedChatSession_${currentUserData.uid}`);
                }
                await signOut(auth);
                sessionStorage.clear();
                window.location.href = LOGIN_PAGE_URL;
            } catch (error) {
                console.error("خطأ في تسجيل الخروج من المودال:", error);
                displaySystemMessage("فشل تسجيل الخروج. الرجاء المحاولة مرة أخرى.");
            }
        }
    });
}

// ===========================================
// وظائف ومودالات المستخدمين المسجلين
// ===========================================

// دالة لجلب وعرض المستخدمين المسجلين
async function fetchAndDisplayRegisteredUsers() {
    try {
        allUsersCached = await fetchAllUsers(); // تحديث الكاش

        registeredUsersList.innerHTML = ''; // مسح القائمة السابقة

        if (allUsersCached.length === 0) {
            registeredUsersList.innerHTML = '<li class="no-users">لا يوجد مستخدمون مسجلون حاليًا.</li>';
            return;
        }

        allUsersCached.forEach((userData) => {
            const userElement = document.createElement('li');
            userElement.classList.add('user-item');

            const rankImageSrc = RANK_IMAGE_MAP[userData.userType] || RANK_IMAGE_MAP['عضو'];

            userElement.innerHTML = `
                <img src="${userData.photoURL || 'default_images/user.png'}" alt="صورة المستخدم" class="user-item-avatar">
                <div class="user-item-info">
                    <span class="user-item-username">${userData.username || 'مستخدم غير معروف'}</span>
                    ${userData.userType ? `<img src="${rankImageSrc}" alt="${userData.userType}" class="rank-icon-small">` : ''}
                    <span class="user-item-rank">${userData.userType || 'عضو'}</span>
                </div>
                <button class="view-profile-button" data-uid="${userData.uid}" title="عرض الملف الشخصي"><i class="fas fa-eye"></i></button>
            `;
            registeredUsersList.appendChild(userElement);
        });

        registeredUsersList.querySelectorAll('.view-profile-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const uid = e.currentTarget.dataset.uid;
                alert(`عرض ملف المستخدم UID: ${uid} (هذه الوظيفة قيد التطوير)`);
            });
        });

        registeredUsersModal.style.display = 'flex';
    } catch (error) {
        console.error("خطأ في جلب المستخدمين المسجلين:", error);
        displaySystemMessage("فشل تحميل قائمة المستخدمين المسجلين.", 'system_error');
    }
}

// زر المتصلون (يفتح مودال المستخدمين المسجلين الآن)
if (onlineUsersButton) {
    onlineUsersButton.addEventListener('click', () => {
        fetchAndDisplayRegisteredUsers();
    });
}

// زر إغلاق مودال المستخدمين المسجلين
if (closeRegisteredUsersModalButton) {
    closeRegisteredUsersModalButton.addEventListener('click', () => {
        registeredUsersModal.style.display = 'none';
    });
}

// إغلاق مودال المستخدمين المسجلين عند النقر خارجه
if (registeredUsersModal) {
    window.addEventListener('click', (event) => {
        if (event.target === registeredUsersModal) {
            registeredUsersModal.style.display = 'none';
        }
    });
}

// ===========================================
// وظائف ومودالات الأخبار
// ===========================================

// دالة لجلب وعرض الأخبار
async function fetchAndDisplayNews() {
    try {
        newsList.innerHTML = ''; // مسح الأخبار السابقة
        const newsRef = collection(db, NEWS_COLLECTION);
        const q = query(newsRef, orderBy('timestamp', 'desc')); // عرض الأحدث أولاً
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            newsList.innerHTML = '<p class="no-news">لا توجد أخبار حاليًا.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const newsItem = docSnap.data();
            const newsId = docSnap.id;
            const newsElement = document.createElement('div');
            newsElement.classList.add('news-item');

            const newsDate = newsItem.timestamp ? new Date(newsItem.timestamp.toDate()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

            let adminNewsButtons = '';
            if (hasPermission('canManageNews')) {
                adminNewsButtons = `
                    <button class="edit-news-button" data-id="${newsId}" title="تعديل الخبر"><i class="fas fa-edit"></i></button>
                    <button class="delete-news-button" data-id="${newsId}" title="حذف الخبر"><i class="fas fa-trash"></i></button>
                `;
            }

            newsElement.innerHTML = `
                <div class="news-header">
                    <span class="news-date">${newsDate}</span>
                    <div class="news-actions">${adminNewsButtons}</div>
                </div>
                <p class="news-content">${newsItem.content}</p>
            `;
            newsList.appendChild(newsElement);
        });

        // إضافة مستمعي الأحداث لأزرار التعديل والحذف الجديدة
        newsList.querySelectorAll('.edit-news-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                // ابحث عن الخبر في querySnapshot (أو اجلبه مرة أخرى)
                const newsToEdit = querySnapshot.docs.find(doc => doc.id === id)?.data();
                if (newsToEdit) {
                    openNewsInputModal(id, newsToEdit.content);
                }
            });
        });

        newsList.querySelectorAll('.delete-news-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                deleteNewsItem(id);
            });
        });

    } catch (error) {
        console.error("خطأ في جلب وعرض الأخبار:", error);
        displaySystemMessage("فشل تحميل الأخبار.", 'system_error');
    }
}

// دالة لفتح مودال عرض الأخبار
function openNewsModal() {
    fetchAndDisplayNews();
    // إظهار/إخفاء زر "إضافة خبر جديد" للمدراء
    if (addNewsItemButton) {
        if (hasPermission('canManageNews')) {
            addNewsItemButton.style.display = 'block'; // 'flex' if it uses flexbox for alignment
        } else {
            addNewsItemButton.style.display = 'none';
        }
    }
    newsModal.style.display = 'flex';
}

// دالة لفتح مودال إضافة/تعديل الأخبار
function openNewsInputModal(id = null, content = '') {
    editingNewsId = id; // لتحديد ما إذا كنا نعدل أو نضيف
    newsInputModalTitle.textContent = id ? 'تعديل الخبر' : 'إضافة خبر جديد';
    newsContentInput.value = content;
    newsModal.style.display = 'none'; // إخفاء مودال عرض الأخبار عند فتح مودال الإدخال
    newsInputModal.style.display = 'flex';
}

// دالة لحفظ الخبر (إضافة أو تعديل)
async function saveNewsItem() {
    if (!hasPermission('canManageNews')) {
        displaySystemMessage("ليس لديك صلاحية لإضافة/تعديل الأخبار.", 'system_error');
        return;
    }

    const content = newsContentInput.value.trim();
    if (content === '') {
        displaySystemMessage("الرجاء كتابة محتوى الخبر.", 'system_error');
        return;
    }

    try {
        if (editingNewsId) {
            // تعديل خبر موجود
            await updateDoc(doc(db, NEWS_COLLECTION, editingNewsId), {
                content: content,
                timestamp: serverTimestamp(), // تحديث وقت التعديل
                editorUid: currentUserData.uid,
                editorUsername: currentUserData.username
            });
            displaySystemMessage("تم تعديل الخبر بنجاح.", 'system_info');
        } else {
            // إضافة خبر جديد
            await addDoc(collection(db, NEWS_COLLECTION), {
                content: content,
                timestamp: serverTimestamp(),
                authorUid: currentUserData.uid,
                authorUsername: currentUserData.username
            });
            displaySystemMessage("تم إضافة الخبر بنجاح.", 'system_info');
        }
        closeNewsInputModalFunc();
        openNewsModal(); // إعادة فتح مودال عرض الأخبار لتحديث القائمة
    } catch (error) {
        console.error("خطأ في حفظ الخبر:", error);
        displaySystemMessage("فشل حفظ الخبر. الرجاء المحاولة مرة أخرى.", 'system_error');
    }
}

// دالة لحذف خبر
async function deleteNewsItem(id) {
    if (!hasPermission('canManageNews')) {
        displaySystemMessage("ليس لديك صلاحية لحذف الأخبار.", 'system_error');
        return;
    }
    if (confirm("هل أنت متأكد أنك تريد حذف هذا الخبر؟")) {
        try {
            await deleteDoc(doc(db, NEWS_COLLECTION, id));
            displaySystemMessage("تم حذف الخبر بنجاح.", 'system_info');
            fetchAndDisplayNews(); // تحديث قائمة الأخبار
        } catch (error) {
            console.error("خطأ في حذف الخبر:", error);
            displaySystemMessage("فشل حذف الخبر. الرجاء المحاولة مرة أخرى.", 'system_error');
        }
    }
}

// دالة لإغلاق مودال إضافة/تعديل الأخبار
function closeNewsInputModalFunc() {
    newsInputModal.style.display = 'none';
    newsContentInput.value = '';
    editingNewsId = null; // إعادة تعيين وضع التعديل
}


// معالجات أحداث مودال الأخبار
if (newsButton) {
    newsButton.addEventListener('click', () => {
        openNewsModal();
        sideMenu.classList.remove('active'); // إغلاق القائمة الجانبية
    });
}

if (closeNewsModal) {
    closeNewsModal.addEventListener('click', () => {
        newsModal.style.display = 'none';
    });
}

if (newsModal) {
    window.addEventListener('click', (event) => {
        if (event.target === newsModal) {
            newsModal.style.display = 'none';
        }
    });
}

if (addNewsItemButton) {
    addNewsItemButton.addEventListener('click', () => {
        openNewsInputModal();
    });
}

// معالجات أحداث مودال إضافة/تعديل الأخبار
if (closeNewsInputModal) {
    closeNewsInputModal.addEventListener('click', closeNewsInputModalFunc);
}

if (cancelNewsEditButton) {
    cancelNewsEditButton.addEventListener('click', () => {
        closeNewsInputModalFunc();
        openNewsModal(); // العودة لمودال عرض الأخبار
    });
}

if (saveNewsItemButton) {
    saveNewsItemButton.addEventListener('click', saveNewsItem);
}

if (newsInputModal) {
    window.addEventListener('click', (event) => {
        if (event.target === newsInputModal) {
            closeNewsInputModalFunc();
            openNewsModal(); // العودة لمودال عرض الأخبار
        }
    });
}


// ===========================================
// أزرار الهيدر الأخرى
// ===========================================

if (privateChatButton) {
    privateChatButton.addEventListener('click', () => {
        window.location.href = PRIVATE_CHAT_PAGE_URL;
    });
}

if (friendsButton) {
    friendsButton.addEventListener('click', () => {
        window.location.href = FRIENDS_PAGE_URL;
    });
}

if (notificationsButton) {
    notificationsButton.addEventListener('click', () => {
        window.location.href = NOTIFICATIONS_PAGE_URL;
    });
}

if (soundButton) {
    soundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        const icon = soundButton.querySelector('i');
        if (soundEnabled) {
            icon.classList.remove('fa-volume-mute');
            icon.classList.add('fa-volume-up');
            displaySystemMessage("تم تفعيل أصوات التنبيه.", 'system_info');
        } else {
            icon.classList.remove('fa-volume-up');
            icon.classList.add('fa-volume-mute');
            displaySystemMessage("تم كتم أصوات التنبيه.", 'system_info');
        }
        localStorage.setItem('chatSoundEnabled', soundEnabled);
    });
    const storedSoundState = localStorage.getItem('chatSoundEnabled');
    if (storedSoundState !== null) {
        soundEnabled = (storedSoundState === 'true');
        const icon = soundButton.querySelector('i');
        if (icon) {
            if (soundEnabled) {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
            } else {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute');
            }
        }
    }
}

// ===========================================
// وظائف الشريط الجانبي
// ===========================================

if (menuButton) {
    menuButton.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        chatContainer.classList.toggle('menu-open');
    });
}

// دالة لإغلاق الشريط الجانبي عند النقر خارجها
window.addEventListener('click', (event) => {
    if (sideMenu && sideMenu.classList.contains('active') &&
        !sideMenu.contains(event.target) &&
        !menuButton.contains(event.target)) {
        sideMenu.classList.remove('active');
        chatContainer.classList.remove('menu-open');
    }
});

// معالجات الأحداث لأزرار الشريط الجانبي
if (refreshPageButton) {
    refreshPageButton.addEventListener('click', () => {
        location.reload();
    });
}

if (roomsListButton) {
    roomsListButton.addEventListener('click', () => {
        window.location.href = ROOMS_PAGE_URL;
        sideMenu.classList.remove('active');
    });
}

if (friendsWallButton) {
    friendsWallButton.addEventListener('click', () => {
        alert('وظيفة حائط الأصدقاء قيد التطوير.');
        sideMenu.classList.remove('active');
    });
}


if (shopChatButton) {
    shopChatButton.addEventListener('click', () => {
        alert('وظيفة متجر الشات قيد التطوير.');
        sideMenu.classList.remove('active');
    });
}

if (goldShopButton) {
    goldShopButton.addEventListener('click', () => {
        alert('وظيفة متجر الذهب قيد التطوير.');
        sideMenu.classList.remove('active');
    });
}

if (miscChatButton) {
    miscChatButton.addEventListener('click', () => {
        alert('وظيفة منوعات الشات قيد التطوير.');
        sideMenu.classList.remove('active');
    });
}

if (convertPointsButton) {
    convertPointsButton.addEventListener('click', () => {
        alert('وظيفة تحويل النقاط لذهب قيد التطوير.');
        sideMenu.classList.remove('active');
    });
}

// ===========================================
// أزرار التنقل السفلية
// ===========================================

if (homeButton) {
    homeButton.addEventListener('click', () => {
        window.location.href = LOGIN_PAGE_URL;
    });
}

if (roomsButton) {
    roomsButton.addEventListener('click', () => {
        window.location.href = ROOMS_PAGE_URL;
    });
}

if (plusButton) {
    plusButton.addEventListener('click', () => {
        alert('وظيفة الإضافة السريعة قيد التطوير. (يمكن استخدامها لإنشاء غرفة، بدء خاص، إلخ.)');
    });
}

if (bottomNotificationButton) {
    bottomNotificationButton.addEventListener('click', () => {
        window.location.href = NOTIFICATIONS_PAGE_URL;
    });
}

if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        window.location.href = SETTINGS_PAGE_URL;
    });
}

// ===========================================
// الإعداد الأولي عند تحميل الصفحة
// ===========================================

document.addEventListener("DOMContentLoaded", async () => {
    const loggedIn = sessionStorage.getItem('loggedIn');
    const userUid = sessionStorage.getItem('userUid');

    if (loggedIn === 'true' && userUid) {
        await fetchCurrentUserData(userUid);

        if (!currentUserData || !currentUserData.uid) {
            console.error("بيانات المستخدم غير مكتملة بعد الجلب.");
            displaySystemMessage("خطأ في جلب بيانات المستخدم. سيتم إعادة التوجيه.");
            setTimeout(() => {
                window.location.href = LOGIN_PAGE_URL;
            }, 2000);
            return;
        }

        // تحديث صورة المستخدم في زر الملف الشخصي
        if (profileButton && currentUserData.photoURL) {
            const profileIcon = profileButton.querySelector('.profile-icon');
            if (profileIcon) {
                profileIcon.src = currentUserData.photoURL;
            }
        }

        // إخفاء/إظهار حقل الإدخال وزر الإرسال للزوار
        if (messageInput && sendMessageButton) {
            if (!hasPermission('canSendMessage')) {
                messageInput.disabled = true;
                messageInput.placeholder = "ليس لديك صلاحية لإرسال الرسائل.";
                sendMessageButton.style.display = 'none';
            } else {
                messageInput.disabled = false;
                messageInput.placeholder = "اكتب رسالتك هنا...";
                sendMessageButton.style.display = 'flex';
            }
        }

        const hasJoinedKey = `hasJoinedChatSession_${userUid}`;
        const hasJoined = sessionStorage.getItem(hasJoinedKey);

        if (!hasJoined) {
            const joinMessageText = `انضم ${currentUserData.username || 'مستخدم'} (${currentUserData.userType || 'عضو'}) إلى الغرفة.`;
            await sendChatSystemMessage(joinMessageText, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_join', currentUserData.userType);
            sessionStorage.setItem(hasJoinedKey, 'true');
        }

        await fetchAllUsers(); // جلب جميع المستخدمين مرة واحدة عند التحميل الأولي

        listenForMessages();
    } else {
        displaySystemMessage("لم يتم تسجيل الدخول. يتم توجيهك.");
        setTimeout(() => {
            window.location.href = LOGIN_PAGE_URL;
        }, 2000);
    }
});

// معالجة مغادرة المستخدم للصفحة لتحديث حالة الاتصال
window.addEventListener('beforeunload', async () => {
    if (currentUserData && currentUserData.uid) {
        const hasJoinedKey = `hasJoinedChatSession_${currentUserData.uid}`;
        const hasJoined = sessionStorage.getItem(hasJoinedKey);
        if (hasJoined) {
            const leaveMessageText = `غادر ${currentUserData.username || 'مستخدم'} (${currentUserData.userType || 'عضو'}) الغرفة.`;
            // لا تنتظر هنا، لأن beforeunload لا يدعم الـ async بشكل كامل في جميع المتصفحات
            sendChatSystemMessage(leaveMessageText, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_leave', currentUserData.userType);
            sessionStorage.removeItem(hasJoinedKey);
        }
    }
});
