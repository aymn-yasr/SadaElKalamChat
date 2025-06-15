// js/admin_panel_script.js
import { auth, db } from "./firebaseInit.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ثوابت المجموعات
const USERS_COLLECTION = "users";
const MESSAGES_COLLECTION = "messages";
const CHAT_ROOM_COLLECTION = "chatRooms"; // لتصفية الرسائل حسب الغرفة
const NEWS_COLLECTION = "news";
const SETTINGS_COLLECTION = "settings"; // لضبط الإعدادات العامة مثل حالة الشات

// عناصر DOM
const adminLogoutButton = document.getElementById('adminLogoutButton');
const navButtons = document.querySelectorAll('.admin-nav .nav-button');
const adminSections = document.querySelectorAll('.admin-section');

// عناصر لوحة القيادة
const totalUsersCount = document.getElementById('totalUsersCount');
const onlineUsersCount = document.getElementById('onlineUsersCount');
const totalMessagesCount = document.getElementById('totalMessagesCount');
const totalNewsCount = document.getElementById('totalNewsCount');

// عناصر إدارة المستخدمين
const userSearchInput = document.getElementById('userSearchInput');
const searchUserButton = document.getElementById('searchUserButton');
const adminUserList = document.getElementById('adminUserList');
const editUserModal = document.getElementById('editUserModal');
const closeEditUserModal = document.getElementById('closeEditUserModal');
const editUserForm = document.getElementById('editUserForm');
const editUsername = document.getElementById('editUsername');
const editUserType = document.getElementById('editUserType');
const editUserStatus = document.getElementById('editUserStatus');
const editUserBio = document.getElementById('editUserBio');

let editingUserUid = null; // لتخزين UID المستخدم الذي يتم تعديله

// عناصر إدارة الرسائل
const messageRoomFilter = document.getElementById('messageRoomFilter');
const messageSearchInput = document.getElementById('messageSearchInput');
const searchMessagesButton = document.getElementById('searchMessagesButton');
const adminMessageList = document.getElementById('adminMessageList');

// عناصر إدارة الأخبار
const addNewNewsButton = document.getElementById('addNewNewsButton');
const adminNewsList = document.getElementById('adminNewsList');
const editNewsModal = document.getElementById('editNewsModal');
const closeEditNewsModal = document.getElementById('closeEditNewsModal');
const editNewsContent = document.getElementById('editNewsContent');
const saveNewsChangesButton = document.getElementById('saveNewsChangesButton');
const cancelNewsEditModalButton = document.getElementById('cancelNewsEditModalButton');

let editingNewsId = null; // لتخزين ID الخبر الذي يتم تعديله

// عناصر الإعدادات العامة
const chatStatusToggle = document.getElementById('chatStatusToggle');
const chatStatusLabel = document.getElementById('chatStatusLabel');
const saveGeneralSettingsButton = document.getElementById('saveGeneralSettingsButton');


// ----------------------------------------------------
// التحقق من صلاحية المستخدم (الأمن)
// ----------------------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // المستخدم مسجل الدخول، الآن تحقق من صلاحياته
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // تحديد الرتب المسموح لها بالوصول إلى لوحة التحكم
            const allowedRanks = ['المالك', 'اونر اداري', 'اونر', 'سوبر اداري', 'سوبر ادمن', 'ادمن'];

            if (allowedRanks.includes(userData.userType)) {
                console.log("المستخدم لديه صلاحيات المسؤول: ", userData.userType);
                initializeAdminPanel();
            } else {
                alert("ليس لديك صلاحيات للوصول إلى لوحة التحكم.");
                window.location.href = 'chat.html'; // إعادة التوجيه لصفحة الشات
            }
        } else {
            alert("لم يتم العثور على بيانات المستخدم.");
            window.location.href = 'chat.html'; // إعادة التوجيه لصفحة تسجيل الدخول
        }
    } else {
        // المستخدم غير مسجل الدخول
        alert("يرجى تسجيل الدخول للوصول إلى لوحة التحكم.");
        window.location.href = 'chat.html'; // إعادة التوجيه لصفحة تسجيل الدخول
    }
});

// ----------------------------------------------------
// تهيئة لوحة التحكم
// ----------------------------------------------------
async function initializeAdminPanel() {
    setupEventListeners();
    await fetchDashboardStats();
    await fetchAndDisplayUsers();
    await fetchAndDisplayRoomsForFilter(); // جلب الغرف لتصفية الرسائل
    await fetchAndDisplayMessages();
    await fetchAndDisplayNews();
    await fetchGeneralSettings(); // جلب الإعدادات العامة
    showSection('dashboard'); // عرض لوحة القيادة كقسم افتراضي
}

// ----------------------------------------------------
// الوظائف العامة
// ----------------------------------------------------
function setupEventListeners() {
    adminLogoutButton.addEventListener('click', handleLogout);

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            showSection(sectionId);
        });
    });

    // إدارة المستخدمين
    searchUserButton.addEventListener('click', fetchAndDisplayUsers);
    adminUserList.addEventListener('click', handleUserActions); // للاستماع لأزرار التعديل والحظر/إلغاء الحظر

    // مودال تعديل المستخدم
    closeEditUserModal.addEventListener('click', () => editUserModal.style.display = 'none');
    editUserModal.addEventListener('click', (e) => {
        if (e.target === editUserModal) {
            editUserModal.style.display = 'none';
        }
    });
    editUserForm.addEventListener('submit', handleSaveUserChanges);

    // إدارة الرسائل
    messageRoomFilter.addEventListener('change', fetchAndDisplayMessages);
    searchMessagesButton.addEventListener('click', fetchAndDisplayMessages);
    adminMessageList.addEventListener('click', handleMessageActions); // للاستماع لأزرار حذف الرسالة

    // إدارة الأخبار
    addNewNewsButton.addEventListener('click', handleAddNewNews);
    adminNewsList.addEventListener('click', handleNewsActions); // للاستماع لأزرار تعديل وحذف الخبر

    // مودال تعديل/إضافة الأخبار
    closeEditNewsModal.addEventListener('click', () => editNewsModal.style.display = 'none');
    cancelNewsEditModalButton.addEventListener('click', () => editNewsModal.style.display = 'none');
    editNewsModal.addEventListener('click', (e) => {
        if (e.target === editNewsModal) {
            editNewsModal.style.display = 'none';
        }
    });
    saveNewsChangesButton.addEventListener('click', handleSaveNewsChanges);

    // الإعدادات العامة
    saveGeneralSettingsButton.addEventListener('click', handleSaveGeneralSettings);
    chatStatusToggle.addEventListener('change', () => {
        chatStatusLabel.textContent = chatStatusToggle.checked ? 'الدردشة مفعلة' : 'الدردشة معطلة';
    });
}

function showSection(sectionId) {
    adminSections.forEach(section => {
        section.classList.remove('active');
    });
    navButtons.forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`.nav-button[data-section="${sectionId}"]`).classList.add('active');
}

async function handleLogout() {
    try {
        await signOut(auth);
        alert("تم تسجيل الخروج بنجاح.");
        window.location.href = 'chat.html'; // أو صفحة تسجيل الدخول
    } catch (error) {
        console.error("خطأ في تسجيل الخروج:", error);
        alert("حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.");
    }
}

// ----------------------------------------------------
// لوحة القيادة
// ----------------------------------------------------
async function fetchDashboardStats() {
    try {
        // إجمالي المستخدمين
        const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
        totalUsersCount.textContent = usersSnapshot.size;

        // المستخدمون المتصلون (يجب أن يكون لديك حقل `isOnline` أو `lastSeen` في مستند المستخدم)
        const onlineUsersQuery = query(collection(db, USERS_COLLECTION), /* where("isOnline", "==", true) */); // تحتاج إلى تحديث حالة الاتصال في تطبيق الشات
        const onlineUsersSnapshot = await getDocs(onlineUsersQuery);
        // مؤقتًا، يمكننا افتراض أن جميع المستخدمين في Firestore هم متصلون إذا لم يكن هناك حقل isOnline
        // أو يمكنك بناء منطق أكثر تعقيدًا يعتمد على lastSeen
        onlineUsersCount.textContent = onlineUsersSnapshot.size; // تحتاج إلى تحديث هذا ليصبح دقيقًا

        // إجمالي الرسائل
        let totalMessages = 0;
        const chatRoomsSnapshot = await getDocs(collection(db, CHAT_ROOM_COLLECTION));
        for (const roomDoc of chatRoomsSnapshot.docs) {
            const messagesSnapshot = await getDocs(collection(db, CHAT_ROOM_COLLECTION, roomDoc.id, MESSAGES_COLLECTION));
            totalMessages += messagesSnapshot.size;
        }
        totalMessagesCount.textContent = totalMessages;


        // الأخبار المنشورة
        const newsSnapshot = await getDocs(collection(db, NEWS_COLLECTION));
        totalNewsCount.textContent = newsSnapshot.size;

    } catch (error) {
        console.error("خطأ في جلب إحصائيات لوحة القيادة:", error);
        alert("فشل في جلب الإحصائيات.");
    }
}

// ----------------------------------------------------
// إدارة المستخدمين
// ----------------------------------------------------
async function fetchAndDisplayUsers() {
    adminUserList.innerHTML = '<li class="no-users-found">جارٍ تحميل المستخدمين...</li>';
    try {
        let usersQuery = collection(db, USERS_COLLECTION);
        const searchTerm = userSearchInput.value.toLowerCase().trim();

        if (searchTerm) {
            // Firebase Firestore لا يدعم البحث "like" بشكل مباشر.
            // لعمل بحث فعال، تحتاج إلى استخدام حلول مثل Algolia Search أو Elastic Search،
            // أو جلب جميع المستخدمين ثم التصفية في الواجهة الأمامية (غير فعال مع عدد كبير).
            // حاليًا، سنقوم بجلب الكل ثم التصفية يدوياً لتبسيط المثال.
            // أو يمكنك عمل بحث مباشر على حقل معين إذا كان مطابقًا تمامًا (UID أو username).
        }

        const usersSnapshot = await getDocs(usersQuery);
        let users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (searchTerm) {
            users = users.filter(user =>
                user.username.toLowerCase().includes(searchTerm) ||
                user.uid.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
            );
        }

        displayUsers(users);

    } catch (error) {
        console.error("خطأ في جلب المستخدمين:", error);
        adminUserList.innerHTML = '<li class="no-users-found">فشل في تحميل المستخدمين.</li>';
    }
}

function displayUsers(users) {
    adminUserList.innerHTML = '';
    if (users.length === 0) {
        adminUserList.innerHTML = '<li class="no-users-found">لا يوجد مستخدمون مطابقون.</li>';
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.className = 'user-item admin-user-item'; // استخدام الستايل المشترك وتعديلات لوحة التحكم
        userItem.dataset.uid = user.id;

        userItem.innerHTML = `
            <div class="user-details">
                <img src="${user.photoURL || 'default_images/user.png'}" alt="${user.username}" class="user-item-avatar">
                <div class="username-rank">
                    <span class="user-item-username">${user.username || 'مستخدم غير معروف'}</span>
                    <span class="user-item-email" style="font-size:0.8em; color:#777;">${user.email || 'لا يوجد بريد'}</span>
                </div>
                <span class="user-type rank-${user.userType}">${user.userType || 'عضو'}</span>
                <span class="user-status" style="margin-left: 10px; color:${user.status === 'محظور' ? 'red' : 'green'};">${user.status || 'متاح'}</span>
            </div>
            <div class="user-actions">
                <button class="action-button edit-user" data-uid="${user.id}"><i class="fas fa-edit"></i> تعديل</button>
                <button class="action-button ${user.status === 'محظور' ? 'unblock-user' : 'block-user'}" data-uid="${user.id}">
                    <i class="fas ${user.status === 'محظور' ? 'fa-unlock' : 'fa-ban'}"></i>
                    ${user.status === 'محظور' ? 'إلغاء الحظر' : 'حظر'}
                </button>
                <button class="action-button delete-user" data-uid="${user.id}"><i class="fas fa-trash-alt"></i> حذف</button>
            </div>
        `;
        adminUserList.appendChild(userItem);
    });
}

async function handleUserActions(event) {
    const target = event.target.closest('button');
    if (!target) return;

    const uid = target.dataset.uid;
    if (!uid) return;

    if (target.classList.contains('edit-user')) {
        await openEditUserModal(uid);
    } else if (target.classList.contains('block-user')) {
        if (confirm("هل أنت متأكد أنك تريد حظر هذا المستخدم؟")) {
            await updateUserStatus(uid, 'محظور');
        }
    } else if (target.classList.contains('unblock-user')) {
        if (confirm("هل أنت متأكد أنك تريد إلغاء حظر هذا المستخدم؟")) {
            await updateUserStatus(uid, 'متاح');
        }
    } else if (target.classList.contains('delete-user')) {
        if (confirm("تحذير: هل أنت متأكد أنك تريد حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه.")) {
            await deleteUserAccountAndData(uid);
        }
    }
}

async function openEditUserModal(uid) {
    editingUserUid = uid;
    try {
        const userDocRef = doc(db, USERS_COLLECTION, uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            editUsername.value = userData.username || '';
            editUserType.value = userData.userType || 'عضو';
            editUserStatus.value = userData.status || 'متاح';
            editUserBio.value = userData.bio || '';
            editUserModal.style.display = 'block';
        } else {
            alert("لم يتم العثور على بيانات المستخدم.");
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات المستخدم للتعديل:", error);
        alert("فشل في جلب بيانات المستخدم.");
    }
}

async function handleSaveUserChanges(event) {
    event.preventDefault();
    if (!editingUserUid) return;

    const newUsername = editUsername.value.trim();
    const newUserType = editUserType.value;
    const newUserStatus = editUserStatus.value;
    const newUserBio = editUserBio.value.trim();

    if (!newUsername) {
        alert("اسم المستخدم لا يمكن أن يكون فارغًا.");
        return;
    }

    try {
        const userDocRef = doc(db, USERS_COLLECTION, editingUserUid);
        await updateDoc(userDocRef, {
            username: newUsername,
            userType: newUserType,
            status: newUserStatus,
            bio: newUserBio,
            updatedAt: serverTimestamp() // لتسجيل وقت التعديل
        });
        alert("تم حفظ التغييرات بنجاح.");
        editUserModal.style.display = 'none';
        await fetchAndDisplayUsers(); // تحديث القائمة
    } catch (error) {
        console.error("خطأ في حفظ تغييرات المستخدم:", error);
        alert("فشل في حفظ التغييرات.");
    }
}

async function updateUserStatus(uid, status) {
    try {
        const userDocRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userDocRef, {
            status: status,
            updatedAt: serverTimestamp()
        });
        alert(`تم ${status === 'محظور' ? 'حظر' : 'إلغاء حظر'} المستخدم بنجاح.`);
        await fetchAndDisplayUsers();
    } catch (error) {
        console.error("خطأ في تحديث حالة المستخدم:", error);
        alert("فشل في تحديث الحالة.");
    }
}

async function deleteUserAccountAndData(uid) {
    try {
        // أولاً: حذف مستند المستخدم من Firestore
        await deleteDoc(doc(db, USERS_COLLECTION, uid));

        // ثانياً: (اختياري) حذف جميع رسائل المستخدم من جميع الغرف
        // هذا قد يكون مكلفًا ويعتمد على هيكلة قاعدة البيانات.
        // يجب أن يتم التعامل مع هذا بحذر شديد وفي قواعد أمان Firestore.
        // حالياً، لن نقوم بحذف الرسائل المرتبطة بالمستخدم بشكل تلقائي هنا
        // لأن حذفها يتطلب جلب جميع الغرف ثم جميع الرسائل في كل غرفة.
        // يمكن ترك الرسائل وتحديدها على أنها من "مستخدم محذوف".
        // إذا كنت تريد حذفها، ستحتاج إلى جلب الرسائل التي أرسلها هذا المستخدم
        // وحذفها، وهذا يتطلب استعلامات مكثفة.

        // ثالثاً: (مهم) حذف المستخدم من Firebase Authentication
        // هذه العملية لا يمكن تنفيذها مباشرة من العميل في الـ JavaScript
        // لأسباب أمنية. يجب أن تتم هذه العملية من الخادم (Node.js/Python
        // مع Firebase Admin SDK) عند حذف المستخدم.
        // لذلك، ستحتاج إلى إضافة دالة سحابية (Cloud Function) أو API
        // يقوم بحذف المستخدم من Auth عندما يتم حذف مستنده في Firestore.
        alert("تم حذف بيانات المستخدم من Firestore بنجاح.\nلإزالة المستخدم بالكامل، يجب حذفه أيضًا من Firebase Authentication (يتطلب لوحة تحكم خادم).");
        await fetchAndDisplayUsers();
    } catch (error) {
        console.error("خطأ في حذف بيانات المستخدم:", error);
        alert("فشل في حذف بيانات المستخدم. تأكد من قواعد الأمان.");
    }
}


// ----------------------------------------------------
// إدارة الرسائل
// ----------------------------------------------------

async function fetchAndDisplayRoomsForFilter() {
    try {
        const roomsSnapshot = await getDocs(collection(db, CHAT_ROOM_COLLECTION));
        messageRoomFilter.innerHTML = '<option value="all">جميع الغرف</option>'; // إعادة تعيين الخيارات
        roomsSnapshot.forEach(roomDoc => {
            const roomData = roomDoc.data();
            const option = document.createElement('option');
            option.value = roomDoc.id;
            option.textContent = roomData.name || `الغرفة: ${roomDoc.id}`;
            messageRoomFilter.appendChild(option);
        });
    } catch (error) {
        console.error("خطأ في جلب الغرف:", error);
    }
}

async function fetchAndDisplayMessages() {
    adminMessageList.innerHTML = '<li class="no-messages-found">جارٍ تحميل الرسائل...</li>';
    try {
        const selectedRoomId = messageRoomFilter.value;
        const searchTerm = messageSearchInput.value.toLowerCase().trim();
        let messages = [];

        if (selectedRoomId === 'all') {
            // جلب الرسائل من جميع الغرف
            const chatRoomsSnapshot = await getDocs(collection(db, CHAT_ROOM_COLLECTION));
            for (const roomDoc of chatRoomsSnapshot.docs) {
                const messagesSnapshot = await getDocs(query(
                    collection(db, CHAT_ROOM_COLLECTION, roomDoc.id, MESSAGES_COLLECTION),
                    orderBy('timestamp', 'desc') // جلب أحدث الرسائل أولاً
                ));
                messagesSnapshot.forEach(msgDoc => {
                    messages.push({ id: msgDoc.id, roomId: roomDoc.id, roomName: roomDoc.data().name, ...msgDoc.data() });
                });
            }
        } else {
            // جلب الرسائل من غرفة محددة
            const messagesSnapshot = await getDocs(query(
                collection(db, CHAT_ROOM_COLLECTION, selectedRoomId, MESSAGES_COLLECTION),
                orderBy('timestamp', 'desc')
            ));
            const roomDoc = await getDoc(doc(db, CHAT_ROOM_COLLECTION, selectedRoomId));
            const roomName = roomDoc.exists() ? roomDoc.data().name : 'غرفة غير معروفة';
            messagesSnapshot.forEach(msgDoc => {
                messages.push({ id: msgDoc.id, roomId: selectedRoomId, roomName: roomName, ...msgDoc.data() });
            });
        }

        // تصفية الرسائل بناءً على مصطلح البحث
        if (searchTerm) {
            messages = messages.filter(msg =>
                msg.text.toLowerCase().includes(searchTerm) ||
                msg.senderName.toLowerCase().includes(searchTerm) ||
                (msg.roomName && msg.roomName.toLowerCase().includes(searchTerm))
            );
        }

        // فرز الرسائل مرة أخرى حسب التاريخ بعد التجميع (إذا كانت من غرف متعددة)
        messages.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));


        displayMessages(messages);

    } catch (error) {
        console.error("خطأ في جلب الرسائل:", error);
        adminMessageList.innerHTML = '<li class="no-messages-found">فشل في تحميل الرسائل.</li>';
    }
}

function displayMessages(messages) {
    adminMessageList.innerHTML = '';
    if (messages.length === 0) {
        adminMessageList.innerHTML = '<li class="no-messages-found">لا توجد رسائل مطابقة.</li>';
        return;
    }

    messages.forEach(message => {
        const messageItem = document.createElement('li');
        messageItem.className = 'message-item admin-message-item';
        messageItem.dataset.messageId = message.id;
        messageItem.dataset.roomId = message.roomId; // مهم لحذف الرسالة

        const timestampDate = message.timestamp ? message.timestamp.toDate() : new Date();
        const formattedTime = timestampDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = timestampDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

        messageItem.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.senderName || 'مستخدم غير معروف'}</span>
                <span class="message-info">
                    <span class="message-room-name">(${message.roomName || 'غرفة عامة'})</span>
                    <span class="message-time">${formattedDate} - ${formattedTime}</span>
                </span>
            </div>
            <div class="message-text">
                ${message.text || 'رسالة فارغة'}
            </div>
            <div class="message-actions">
                <button class="action-button delete-message" data-message-id="${message.id}" data-room-id="${message.roomId}"><i class="fas fa-trash-alt"></i> حذف</button>
            </div>
        `;
        adminMessageList.appendChild(messageItem);
    });
}

async function handleMessageActions(event) {
    const target = event.target.closest('button');
    if (!target) return;

    if (target.classList.contains('delete-message')) {
        const messageId = target.dataset.messageId;
        const roomId = target.dataset.roomId;
        if (confirm("هل أنت متأكد أنك تريد حذف هذه الرسالة؟")) {
            await deleteChatMessage(roomId, messageId);
        }
    }
}

async function deleteChatMessage(roomId, messageId) {
    try {
        const messageDocRef = doc(db, CHAT_ROOM_COLLECTION, roomId, MESSAGES_COLLECTION, messageId);
        await deleteDoc(messageDocRef);
        alert("تم حذف الرسالة بنجاح.");
        await fetchAndDisplayMessages(); // تحديث القائمة
    } catch (error) {
        console.error("خطأ في حذف الرسالة:", error);
        alert("فشل في حذف الرسالة. تأكد من قواعد الأمان.");
    }
}

// ----------------------------------------------------
// إدارة الأخبار
// ----------------------------------------------------
async function fetchAndDisplayNews() {
    adminNewsList.innerHTML = '<li class="no-news-found">جارٍ تحميل الأخبار...</li>';
    try {
        const newsSnapshot = await getDocs(query(collection(db, NEWS_COLLECTION), orderBy('createdAt', 'desc')));
        const newsItems = newsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayNews(newsItems);
    } catch (error) {
        console.error("خطأ في جلب الأخبار:", error);
        adminNewsList.innerHTML = '<li class="no-news-found">فشل في تحميل الأخبار.</li>';
    }
}

function displayNews(newsItems) {
    adminNewsList.innerHTML = '';
    if (newsItems.length === 0) {
        adminNewsList.innerHTML = '<li class="no-news-found">لا توجد أخبار لعرضها.</li>';
        return;
    }

    newsItems.forEach(news => {
        const newsItem = document.createElement('li');
        newsItem.className = 'news-item admin-news-item';
        newsItem.dataset.newsId = news.id;

        const createdAtDate = news.createdAt ? news.createdAt.toDate() : new Date();
        const formattedDate = createdAtDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
        const formattedTime = createdAtDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        newsItem.innerHTML = `
            <div class="news-content-preview">
                <strong>[${formattedDate} ${formattedTime}]</strong> ${news.content}
            </div>
            <div class="news-actions">
                <button class="action-button edit-news" data-news-id="${news.id}"><i class="fas fa-edit"></i> تعديل</button>
                <button class="action-button delete-news" data-news-id="${news.id}"><i class="fas fa-trash-alt"></i> حذف</button>
            </div>
        `;
        adminNewsList.appendChild(newsItem);
    });
}

async function handleNewsActions(event) {
    const target = event.target.closest('button');
    if (!target) return;

    const newsId = target.dataset.newsId;
    if (!newsId && !target.classList.contains('add-button')) return;

    if (target.classList.contains('edit-news')) {
        await openEditNewsModal(newsId);
    } else if (target.classList.contains('delete-news')) {
        if (confirm("هل أنت متأكد أنك تريد حذف هذا الخبر؟")) {
            await deleteNewsItem(newsId);
        }
    }
}

function handleAddNewNews() {
    editingNewsId = null; // للإشارة إلى أننا نضيف خبرًا جديدًا
    editNewsContent.value = '';
    editNewsModal.style.display = 'block';
}

async function openEditNewsModal(newsId) {
    editingNewsId = newsId;
    try {
        const newsDocRef = doc(db, NEWS_COLLECTION, newsId);
        const newsDocSnap = await getDoc(newsDocRef);

        if (newsDocSnap.exists()) {
            const newsData = newsDocSnap.data();
            editNewsContent.value = newsData.content || '';
            editNewsModal.style.display = 'block';
        } else {
            alert("لم يتم العثور على الخبر.");
        }
    } catch (error) {
        console.error("خطأ في جلب الخبر للتعديل:", error);
        alert("فشل في جلب بيانات الخبر.");
    }
}

async function handleSaveNewsChanges() {
    const newsContent = editNewsContent.value.trim();
    if (!newsContent) {
        alert("محتوى الخبر لا يمكن أن يكون فارغًا.");
        return;
    }

    try {
        if (editingNewsId) {
            // تحديث خبر موجود
            const newsDocRef = doc(db, NEWS_COLLECTION, editingNewsId);
            await updateDoc(newsDocRef, {
                content: newsContent,
                updatedAt: serverTimestamp()
            });
            alert("تم تحديث الخبر بنجاح.");
        } else {
            // إضافة خبر جديد
            await addDoc(collection(db, NEWS_COLLECTION), {
                content: newsContent,
                createdAt: serverTimestamp(),
                authorId: auth.currentUser.uid, // من قام بإضافة الخبر
                authorName: auth.currentUser.displayName || auth.currentUser.email
            });
            alert("تم إضافة الخبر بنجاح.");
        }
        editNewsModal.style.display = 'none';
        await fetchAndDisplayNews(); // تحديث القائمة
    } catch (error) {
        console.error("خطأ في حفظ الخبر:", error);
        alert("فشل في حفظ الخبر. تأكد من قواعد الأمان.");
    }
}

async function deleteNewsItem(newsId) {
    try {
        await deleteDoc(doc(db, NEWS_COLLECTION, newsId));
        alert("تم حذف الخبر بنجاح.");
        await fetchAndDisplayNews();
    } catch (error) {
        console.error("خطأ في حذف الخبر:", error);
        alert("فشل في حذف الخبر. تأكد من قواعد الأمان.");
    }
}

// ----------------------------------------------------
// الإعدادات العامة
// ----------------------------------------------------
async function fetchGeneralSettings() {
    try {
        const settingsDocRef = doc(db, SETTINGS_COLLECTION, 'chat_status'); // وثيقة واحدة لحالة الشات
        const settingsDocSnap = await getDoc(settingsDocRef);

        if (settingsDocSnap.exists()) {
            const settingsData = settingsDocSnap.data();
            chatStatusToggle.checked = settingsData.isChatEnabled || false;
            chatStatusLabel.textContent = chatStatusToggle.checked ? 'الدردشة مفعلة' : 'الدردشة معطلة';
        } else {
            // إذا لم تكن الإعدادات موجودة، افترض أنها مفعلة افتراضياً
            chatStatusToggle.checked = true;
            chatStatusLabel.textContent = 'الدردشة مفعلة';
            // يمكنك إنشاء الوثيقة الافتراضية إذا لم تكن موجودة
            await setDoc(settingsDocRef, { isChatEnabled: true, createdAt: serverTimestamp() }, { merge: true });
        }
    } catch (error) {
        console.error("خطأ في جلب الإعدادات العامة:", error);
        alert("فشل في جلب الإعدادات العامة.");
    }
}

async function handleSaveGeneralSettings() {
    try {
        const isChatEnabled = chatStatusToggle.checked;
        const settingsDocRef = doc(db, SETTINGS_COLLECTION, 'chat_status');
        await setDoc(settingsDocRef, {
            isChatEnabled: isChatEnabled,
            updatedAt: serverTimestamp()
        }, { merge: true }); // استخدم merge: true لتحديث فقط الحقول الموجودة
        alert("تم حفظ الإعدادات العامة بنجاح.");
    } catch (error) {
        console.error("خطأ في حفظ الإعدادات العامة:", error);
        alert("فشل في حفظ الإعدادات العامة.");
    }
}