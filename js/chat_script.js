// js/chat_script.js
// استيراد الدوال التي تحتاجها من Firebase SDKs
import { auth, db } from "./firebaseInit.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ثوابت لأسماء مجموعات Firestore
const CHAT_ROOM_COLLECTION = "chatRooms";
const MESSAGES_COLLECTION = "messages";
const USERS_COLLECTION = "users";
const NEWS_COLLECTION = "news"; // إضافة مجموعة الأخبار
const PRIVATE_MESSAGES_COLLECTION = "private_messages"; // إضافة مجموعة الدردشات الخاصة

// ثوابت Cloudinary - تم استبدال القيم بالخاصة بك
const CLOUDINARY_CLOUD_NAME = 'dxmoyb8zb';
const CLOUDINARY_UPLOAD_PRESET = 'my_chat_profile_pictures';

// نقطة نهاية API للرفع غير الموقّع (تعتمد على CLOUDINARY_CLOUD_NAME)
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const LOGIN_PAGE_URL = 'index.html'; // صفحة تسجيل الدخول/الرئيسية
const ADMIN_PANEL_PAGE_URL = 'admin_panel.html'; // صفحة لوحة الإدارة (يجب أن تنشئها)
const NOTIFICATIONS_PAGE_URL = 'notifications.html'; // صفحة الإشعارات (يجب أن تنشئها)
const FRIENDS_PAGE_URL = 'friends.html'; // صفحة الأصدقاء (يجب أن تنشئها)
const SETTINGS_PAGE_URL = 'settings.html'; // صفحة الإعدادات (يجب أن تنشئها)
const ROOMS_PAGE_URL = 'rooms.html'; // صفحة الغرف (يجب أن تنشئها)

// نظام الرتب والصلاحيات
const RANK_IMAGE_MAP = {
  "المالك": "rank_images/owner.png",
  "اونر اداري": "rank_images/owner_admin.png",
  "اونر": "rank_images/owner2.png",
  "سوبر اداري": "rank_images/super_admin.png",
  "سوبر ادمن": "rank_images/super_admn.png",
  "ادمن": "rank_images/admin.png",
  "عضو": "rank_images/member.png",
  "زائر": "rank_images/guest.png",
};

const RANK_ORDER = [
  "المالك",
  "اونر اداري",
  "اونر",
  "سوبر إداري",
  "سوبر ادمن",
  "ادمن",
  "عضو",
  "زائر"
];

const RANK_PERMISSIONS = {
  "المالك": {
    canSendMessage: true,
        canViewMessages: true,
        canKickBan: true,
        canDeleteAnyMessage: true,
        canManageRooms: true,
        canAccessAdminPanel: true,
        canMuteUsers: true,
        canManageNews: true, // إضافة صلاحية إدارة الأخبار
        canStartPrivateChat: true, // صلاحية جديدة
    },
  "اونر اداري": {
    canSendMessage: true,
        canViewMessages: true,
        canKickBan: true,
        canDeleteAnyMessage: true,
        canManageRooms: true,
        canMuteUsers: true,
        canManageNews: true, // إضافة صلاحية إدارة الأخبار
        canStartPrivateChat: true, // صلاحية جديدة
    },
  "اونر": {
    canSendMessage: true,
    canViewMessages: true,
    canKick: true,
    canBan: true,
    canMute: true,
    canClearMessages: false,
    canChangeUsernames: false,
    canWarn: false,
    canStartPrivateChat: true,
    canChangeOwnProfile: true
  },
  "سوبر إداري": {
canSendMessage: true,
        canViewMessages: true,
        canKickBan: true,
        canDeleteAnyMessage: true,
        canManageRooms: true,
        canMuteUsers: true,
        canManageNews: true, // إضافة صلاحية إدارة الأخبار
        canStartPrivateChat: true, // صلاحية جديدة
  },
  "سوبر ادمن": {
    canSendMessage: true,
    canViewMessages: true,
    canKick: true,
    canBan: false,
    canMute: true,
    canClearMessages: false,
    canChangeUsernames: false,
    canWarn: false,
    canStartPrivateChat: true,
    canChangeOwnProfile: true
  },
  "ادمن": {
    canSendMessage: true,
    canViewMessages: true,
    canKick: false,
    canBan: false,
    canMute: false,
    canClearMessages: false,
    canChangeUsernames: false,
    canWarn: true,
    canStartPrivateChat: true,
    canChangeOwnProfile: true
  },
  "عضو": {
    canSendMessage: true,
    canViewMessages: true,
    canKick: false,
    canBan: false,
    canMute: false,
    canClearMessages: false,
    canChangeUsernames: false,
    canWarn: false,
    canStartPrivateChat: false,
    canChangeOwnProfile: true
  },
  "زائر": {
    canSendMessage: true,
    canViewMessages: true,
    canKick: false,
    canBan: false,
    canMute: false,
    canClearMessages: false,
    canChangeUsernames: false,
    canWarn: false,
    canStartPrivateChat: false,
    canChangeOwnProfile: false
  }
};

// عناصر DOM الرئيسية
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const chatMessages = document.getElementById('chatMessages');

// أزرار الهيدر
const myProfileBtn = document.getElementById('myProfileBtn');
const onlineUsersButton = document.getElementById('onlineUsersButton');
const friendsButton = document.getElementById('friendsButton');
const privateChatButton = document.getElementById('privateChatButton');
const soundButton = document.getElementById('soundButton');
const notificationsButton = document.getElementById('notificationsButton');
const menuButton = document.getElementById('menuButton');

    // Get new elements from HTML
    const profileNameInput = document.getElementById('profileNameInput');
    const profileStatusInput = document.getElementById('profileStatusInput');
    const editProfileAvatarDisplay = document.getElementById('editProfileAvatarDisplay');
    const saveProfileDataBtn = document.getElementById('saveProfileDataBtn');
    const userNameDisplay = document.querySelector('.top-navbar .user-name'); // Display in navbar
    const userAvatarDisplay = document.querySelector('.top-navbar .user-avatar'); // Display in navbar
    const profileMenuAvatarDisplay = document.querySelector('.profile-menu .profile-avatar'); // Display in profile dropdown
    const profileMenuNameDisplay = document.querySelector('.profile-menu .profile-name'); // Display in profile dropdown

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
const editProfileOptionsBtn = document.getElementById('editProfileOptionsBtn');
const editProfileOptionsModal = document.getElementById('editProfileOptionsModal');
const leaveRoomButton = document.getElementById('leaveRoomButton');
const logoutModalButton = document.getElementById('logoutModalButton');

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

const privateConversationModal = document.getElementById('privateConversationModal');
const closePrivateConversationModal = document.getElementById('closePrivateConversationModal');
const privateChatPartnerAvatar = document.getElementById('privateChatPartnerAvatar');
const privateChatPartnerName = document.getElementById('privateChatPartnerName');
const privateChatMessages = document.getElementById('privateChatMessages');
const privateMessageInput = document.getElementById('privateMessageInput');
const sendPrivateMessageButton = document.getElementById('sendPrivateMessageButton');
let currentPrivateChatReceiverUid = null; // لتتبع الـ UID للشخص الذي ندردش معه حاليًا

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

// عناصر مودال تعديل الحالة
const editStatusBtn = document.getElementById('editStatusBtn'); // زر 'تعديل' بجانب حقل الحالة
const editStatusModal = document.getElementById('editStatusModal'); // مودال تعديل الحالة نفسه
const closeStatusModalBtn = document.getElementById('closeStatusModalBtn'); // زر الإغلاق داخل مودال الحالة
const newStatusInput = document.getElementById('newStatusInput'); // حقل إدخال الحالة الجديدة داخل مودال الحالة
const saveNewStatusBtn = document.getElementById('saveNewStatusBtn'); // زر 'حفظ الحالة' داخل مودال الحالية
// عناصر DOM لمودال الدردشات الخاصة (الجديدة)
const privateChatsModal = document.getElementById('privateChatsModal');
const closePrivateChatsModal = document.getElementById('closePrivateChatsModal');
const privateChatsList = document.getElementById('privateChatsList');
const startNewPrivateChatButton = document.getElementById('startNewPrivateChatButton');

const editProfileNameDisplay = document.getElementById('editProfileNameDisplay'
);

const editprofileAvatarDisplay = document.getElementById('editprofileAvatarDisplay');

// ... (متغيراتك الحالية مثل editProfileOptionsModal) ...

const changeAvatarBtn = document.getElementById('changeAvatarBtn');       // زر تغيير الصورة (أيقونة القلم)
const deleteAvatarBtn = document.getElementById('deleteAvatarBtn');       // زر حذف الصورة (أيقونة سلة المهملات)
const profileImageInput = document.getElementById('profileImageInput');   // حقل اختيار الملف الم

// ... (المتغيرات الموجودة لديك مثل privateMessageInput, sendPrivateMessageButton, إلخ)

// جلب عناصر مربع معلومات المستخدم المنبثق
const userInfoPopover = document.getElementById('userInfoPopover');
const closePopoverButton = userInfoPopover.querySelector('.close-popover-button');
const popoverUserAvatar = document.getElementById('popoverUserAvatar');
const popoverUserName = document.getElementById('popoverUserName');
const startPrivateChatBtn = document.getElementById('startPrivateChatBtn');
const viewProfileBtn = document.getElementById('viewProfileBtn');

let activeUserCardData = null; // لتخزين بيانات المستخدم النشط في البطاقة

// متغيرات حالة المستخدم
let currentUserData = null;
let currentRoomId = "general_chat_room";
let soundEnabled = true; // حالة الصوت الافتراضية
let allUsersCached = []; // لتخزين قائمة المستخدمين مرة واحدة

// متغير لتتبع ما إذا كنا في وضع التعديل للأخبار
let editingNewsId = null;

// متغير لتتبع الدردشة الخاصة المفتوحة حاليا (إذا تم فتحها داخل المودال)
let currentOpenPrivateChatPartner = null; // سيحتوي على بيانات الشريك

let unsubscribePrivateMessages = null; //
// دالة مساعدة لعرض رسائل النظام (تم التعديل لعرض system_join فقط في الشات، والبقية في الكونسول)
function displaySystemMessage(message, type = 'system_info') {
    // فقط اعرض رسائل الانضمام في الشات، وسجل البقية في الكونسول
    if (type === 'system_join') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'system-message', type); // أضف 'system-message' لتمييزها
        // **إصلاح: التأكد من وجود message قبل عرضه**
        messageElement.innerHTML = `<div class="message-content"><p class="message-text">${message || 'رسالة نظام'}</p></div>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        console.log(`رسالة نظام (غير معروضة في الشات): ${message} [النوع: ${type}]`);
    }
}

// دالة لجلب بيانات المستخدم الحالي من Firestore
async function fetchCurrentUserData(uid) {
    try {
        const userDocRef = doc(db, USERS_COLLECTION, uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data(); // جلب جميع بيانات الوثيقة أولاً

            currentUserData = {
                uid: uid,
                username: userData.username || `مستخدم_${uid.substring(0, 5)}`, // اسم المستخدم الافتراضي
                userType: userData.userType || 'عضو', // رتبة افتراضية
                photoURL: userData.photoURL || "default_images/user.png", // صورة افتراضية
                // **الإضافة الجديدة هنا:**
                name: userData.name || userData.username || `مستخدم_${uid.substring(0, 5)}`, // الاسم الفعلي، أو اسم المستخدم، أو افتراضي
                status: userData.status || 'متصل', // الحالة الافتراضية
                // يمكنك إضافة حقول أخرى هنا إذا كانت موجودة في Firestore
            };
            sessionStorage.setItem('currentUserRank', currentUserData.userType);
        } else {
            console.warn("لم يتم العثور على بيانات المستخدم في Firestore:", uid);
            // تعيين بيانات افتراضية للمستخدم غير الموجود مع name و status
            currentUserData = {
                uid: uid,
                username: `مستخدم_${uid.substring(0, 5)}`,
                photoURL: "default_images/user.png",
                userType: "عضو",
                name: `مستخدم_${uid.substring(0, 5)}`, // تعيين الاسم الافتراضي
                status: "متصل" // تعيين الحالة الافتراضية
            };
            sessionStorage.setItem('currentUserRank', "عضو");
            // محاولة إنشاء مستند للمستخدم الجديد إذا لم يكن موجودًا
            await setDoc(userDocRef, currentUserData, { merge: true });
            console.log("تم إنشاء مستند افتراضي للمستخدم الجديد.");
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات المستخدم:", error);
        currentUserData = {
            uid: uid,
            username: "خطأ في التحميل",
            photoURL: "default_images/user.png",
            userType: "زائر",
            name: "خطأ في التحميل", // تعيين الاسم في حالة الخطأ
            status: "غير معروف" // تعيين الحالة في حالة الخطأ
        };
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

// دالة إرسال رسالة نظام للدردشة
async function sendChatSystemMessage(messageText, senderUid, senderUsername, senderPhotoURL, type, userType) {
    try {
        console.log("داخل sendChatSystemMessage: إرسال رسالة بنوع:", type); // تتبع إضافي
        await addDoc(collection(doc(db, CHAT_ROOM_COLLECTION, currentRoomId), MESSAGES_COLLECTION), {
            senderUid: senderUid,
            senderUsername: senderUsername || 'مستخدم غير معروف',
            senderPhotoURL: senderPhotoURL || 'default_images/user.png',
            text: messageText,
            timestamp: serverTimestamp(),
            type: type,
            userType: userType || 'عضو'
        });
        console.log("تم إرسال رسالة النظام إلى Firestore بنجاح."); // تأكيد الإرسال
    } catch (error) {
        console.error("خطأ في إرسال رسالة النظام إلى Firestore:", error); // خطأ أكثر تفصيلاً
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
            messageInput.value = mentionText + " "; // **التعديل هنا: إضافة مسافة**
        } else {
            // تجنب إضافة المنشن إذا كان موجوداً بالفعل كآخر كلمة
            const words = currentMessage.split(' ');
            const lastWord = words[words.length - 1];
            if (lastWord === mentionText) {
                return;
            }
            // إذا لم يكن آخر كلمة ولكن المنشن موجود بالفعل، لا تضيفه
            if (currentMessage.includes(mentionText)) {
                 messageInput.value = currentMessage + ` ${mentionText} `; // أضف مسافة ومنشن جديد ومسافة بعده
            } else {
                messageInput.value += ` ${mentionText} `; // **التعديل هنا: إضافة مسافة بعد المنشن**
            }
        }
        messageInput.focus();
        // نقل المؤشر إلى نهاية النص لتسهيل الكتابة بعد المنشن
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
    }
}

// دالة لعرض مربع معلومات المستخدم المنبثق
function showUserInfoPopover(event, userData) {
    // قم بتخزين بيانات المستخدم الذي تم النقر عليه
    activeUserCardData = userData;

    // تحديث محتوى المربع المنبثق
    popoverUserAvatar.src = userData.avatar || 'default_images/user.png';
    popoverUserName.textContent = userData.username || 'اسم غير معروف';

    // تحديد موقع المربع المنبثق
    // يمكنك تعديل هذا ليناسب التموضع الذي تفضله
    const clickX = event.clientX;
    const clickY = event.clientY;

    // حساب الأبعاد
    const popoverWidth = userInfoPopover.offsetWidth;
    const popoverHeight = userInfoPopover.offsetHeight;

    // محاولة وضعه بجانب مكان النقر
    let topPos = clickY + 10; // 10px أسفل نقطة النقر
    let leftPos = clickX - (popoverWidth / 2); // محاولة التوسيط أفقياً

    // التأكد من عدم خروج المربع عن حدود الشاشة
    if (leftPos < 0) leftPos = 10;
    if (leftPos + popoverWidth > window.innerWidth) leftPos = window.innerWidth - popoverWidth - 10;
    if (topPos + popoverHeight > window.innerHeight) topPos = clickY - popoverHeight - 10; // إذا خرج من الأسفل، ضعه فوق نقطة النقر

    userInfoPopover.style.top = `${topPos}px`;
    userInfoPopover.style.left = `${leftPos}px`;

    // إظهار المربع المنبثق
    userInfoPopover.classList.add('show');
}

// دالة لإخفاء مربع معلومات المستخدم المنبثق
function hideUserInfoPopover() {
    userInfoPopover.classList.remove('show');
    activeUserCardData = null; // مسح البيانات عند الإخفاء
}

// إغلاق المربع المنبثق عند النقر على زر الإغلاق
if (closePopoverButton) {
    closePopoverButton.addEventListener('click', hideUserInfoPopover);
}

// إغلاق المربع المنبثق عند النقر خارج المربع
document.addEventListener('click', (event) => {
    // إذا لم يكن النقر داخل المربع المنبثق نفسه ولم يكن على صورة المستخدم
    if (userInfoPopover.classList.contains('show') &&
        !userInfoPopover.contains(event.target) &&
        !event.target.closest('.chat-message .user-avatar, .user-list-item img')) { // أضف الكلاسات التي يمكن النقر عليها لفتح البطاقة
        hideUserInfoPopover();
    }
});

// دالة لإرسال رسالة نصية (مع إضافة المنشن)
async function sendMessage() {
    // 1. التحقق من صلاحية المستخدم لإرسال الرسائل
    if (!hasPermission('canSendMessage')) {
        displaySystemMessage("ليس لديك صلاحية لإرسال الرسائل.", 'system_error');
        return; // إيقاف التنفيذ إذا لم يكن لديه الصلاحية
    }

    // 2. جلب نص الرسالة وإزالة المسافات البيضاء الزائدة من البداية والنهاية
    const messageText = messageInput.value.trim();

    // 3. التحقق مما إذا كانت الرسالة فارغة بعد التنظيف أو إذا لم يكن هناك بيانات للمستخدم الحالي
    if (messageText === '' || !currentUserData) {
        return; // لا تفعل شيئًا إذا كانت الرسالة فارغة أو المستخدم غير معروف
    }

    // 4. === معالجة أمر `/تنظيف` ===
    if (messageText === '/تنظيف') {
        // التحقق من صلاحية المستخدم (مالك الشات أو مدير) لتنفيذ أمر التنظيف
        if (hasPermission('canAccessAdminPanel')) {
            // استدعاء دالة تنظيف الغرفة مباشرة دون تأكيد
            await clearChatRoom(currentRoomId);
            messageInput.value = ''; // مسح مربع الإدخال بعد تنفيذ الأمر
            return; // إيقاف تنفيذ الدالة لمنع إرسال "/تنظيف" كرسالة عادية
        } else {
            // إبلاغ المستخدم إذا لم يكن لديه صلاحية التنظيف
            displaySystemMessage("ليس لديك صلاحية لتنظيف الغرفة.", 'system_error');
            messageInput.value = ''; // مسح مربع الإدخال حتى لا تظهر الرسالة ككلام عادي
            return; // إيقاف تنفيذ الدالة
        }
    }
    // === نهاية معالجة أمر `/تنظيف` ===


    // 5. === معالجة المنشنات في الرسالة العادية ===
    let mentionedUserUids = []; // مصفوفة لتخزين UID للمستخدمين الممنشنين
    const allUsers = await fetchAllUsers(); // جلب جميع المستخدمين للتحقق من المنشنات (تستخدم الكاش)

    // التعبير المنتظم للبحث عن المنشنات: @ يليها أحرف عربية/إنجليزية/أرقام/شرطة سفلية
    const mentionRegex = /@([a-zA-Z0-9_\u0600-\u06FF]+)/g;
    let match; // متغير لتخزين نتائج المطابقة

    // تكرار للبحث عن جميع المنشنات في نص الرسالة
    while ((match = mentionRegex.exec(messageText)) !== null) {
        const mentionedUsernameInMessage = match[1].trim(); // اسم المستخدم الممنشن (الجزء بعد @)
        // البحث عن المستخدم الممنشن في قائمة جميع المستخدمين
        const user = allUsers.find(u => u.username === mentionedUsernameInMessage);
        // إذا تم العثور على المستخدم ولم يكن هو المستخدم الحالي (لتجنب منشن الذات)
        if (user && user.uid !== currentUserData.uid) {
            mentionedUserUids.push(user.uid); // إضافة UID للمستخدم الممنشن
        }
    }
    // إزالة أي UIDs مكررة (في حال تم منشن نفس الشخص عدة مرات)
    mentionedUserUids = [...new Set(mentionedUserUids)];


    // 6. === إرسال الرسالة إلى Firestore ===
    try {
        await addDoc(collection(doc(db, CHAT_ROOM_COLLECTION, currentRoomId), MESSAGES_COLLECTION), {
            senderUid: currentUserData.uid, // UID المرسل
            senderUsername: currentUserData.username || 'مستخدم غير معروف', // اسم المستخدم المرسل
            senderPhotoURL: currentUserData.photoURL || 'default_images/user.png', // صورة الملف الشخصي للمرسل
            text: messageText, // نص الرسالة الأصلي
            timestamp: serverTimestamp(), // ختم الوقت من الخادم
            type: 'user_message', // نوع الرسالة (رسالة مستخدم)
            userType: currentUserData.userType || 'عضو', // رتبة المستخدم المرسل
            // تخزين UIDs المستخدمين الممنشنين، إذا لم يكن هناك منشنات يكون null
            mentionedUids: mentionedUserUids.length > 0 ? mentionedUserUids : null
        });

        messageInput.value = ''; // مسح حقل الإدخال بعد الإرسال الناجح

        // 7. (اختياري) تسجيل أو معالجة المنشنات بعد الإرسال
        if (mentionedUserUids.length > 0) {
            console.log(`تم منشن المستخدمين ذوي الـ UIDs: ${mentionedUserUids.join(', ')}`);
            // هنا يمكنك إضافة منطق لإرسال إشعارات دفع (Push Notifications) لهؤلاء المستخدمين
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

// وظيفة لفتح مودال تعديل الحالة
if (editStatusBtn) {
    editStatusBtn.addEventListener('click', () => {
        // ملء حقل الإدخال بالحالة الحالية للمستخدم قبل فتح المودال
        if (currentUserData && currentUserData.status) {
            newStatusInput.value = currentUserData.status;
        } else {
            newStatusInput.value = '';
        }
        editStatusModal.style.display = 'flex'; // اجعله مرئياً باستخدام flex لمركزته
        newStatusInput.focus(); // تركيز المؤشر على حقل الإدخال
    });
}

// وظيفة لإغلاق مودال تعديل الحالة بزر X
if (closeStatusModalBtn) {
    closeStatusModalBtn.addEventListener('click', () => {
        editStatusModal.style.display = 'none';
    });
}

// وظيفة لإغلاق مودال تعديل الحالة عند النقر خارج المحتوى
window.addEventListener('click', (event) => {
    if (event.target == editStatusModal) {
        editStatusModal.style.display = 'none';
    }
});

// وظيفة لحفظ الحالة الجديدة
if (saveNewStatusBtn) {
    saveNewStatusBtn.addEventListener('click', async () => {
        const newStatus = newStatusInput.value.trim();

        if (currentUserData && currentUserData.uid) {
            const userDocRef = doc(db, USERS_COLLECTION, currentUserData.uid);
            try {
                await updateDoc(userDocRef, {
                    status: newStatus
                });
                currentUserData.status = newStatus; // تحديث البيانات المحلية
                updateAllUserInfoDisplays(); // تحديث جميع أماكن عرض معلومات المستخدم
                profileStatusInput.value = newStatus; // تحديث حقل الحالة في المودال الرئيسي

                // **** أضف هذا السطر هنا ليختفي المودال ****
                editStatusModal.style.display = 'none';

                alert("تم تحديث الحالة بنجاح!"); // رسالة تأكيد
            } catch (error) {
                console.error("خطأ في تحديث الحالة:", error);
            }
        } else {
            alert("لا توجد بيانات مستخدم لتحديث الحالة.");
        }
    });
}

// تأكد أن populateProfileModal() تقوم بملء حقل الحالة الرئيسي (profileStatusInput)
// هذا مهم لتحديث الحقل في المودال الرئيسي عند فتح مودال التعديل الشخصي
const populateProfileModal = () => {
    if (currentUserData) {
        if (profileNameInput) profileNameInput.value = currentUserData.name || currentUserData.username || '';
        // تأكد أن هذا السطر موجود ويتم تحديثه
        if (profileStatusInput) profileStatusInput.value = currentUserData.status || '';

        // ... بقية تحديثات العرض في المودال (الصورة، الاسم، الحالة في العرض) ...
        if (editProfileAvatarDisplay) editProfileAvatarDisplay.src = currentUserData.photoURL || 'default_images/user.png';
        if (editProfileNameDisplay) editProfileNameDisplay.textContent = currentUserData.name || currentUserData.username || 'مستخدم';
        if (editProfileStatusDisplay) editProfileStatusDisplay.textContent = currentUserData.status || 'متصل';
    }
};

// Function to update all displayed user info
    const updateAllUserInfoDisplays = () => {
        if (userNameDisplay) userNameDisplay.textContent = currentUserData.name;
        if (userAvatarDisplay) userAvatarDisplay.src = currentUserData.avatar;
        if (profileMenuAvatarDisplay) profileMenuAvatarDisplay.src = currentUserData.avatar;
        if (profileMenuNameDisplay) profileMenuNameDisplay.textContent = currentUserData.name;
    };
    
// دالة لعرض رسالة الدردشة في الواجهة (تم التعديل: لا تعرض رسائل النظام باستثناء system_join )
function displayChatMessage(message) {
    // لا تعرض رسائل النظام باستثناء system_join
    if (message.type && message.type.startsWith('system_') && message.type !== 'system_join') {
        // سجلها في الكونسول بدلاً من عرضها في الشات
        console.log(`رسالة نظام (غير معروضة في الشات): ${message.text || 'رسالة فارغة'} [النوع: ${message.type}, ID: ${message.id}]`);
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.id = message.id;
    // أضف فئة 'system-message' لرسائل النظام
    messageElement.classList.add('chat-message', message.type && message.type.startsWith('system_') ? 'system-message' : 'user-message');

    if (message.type === 'system_join') { // فقط رسائل الانضمام يتم عرضها هنا
        messageElement.innerHTML = `
            <div class="message-content">
                <p class="message-text">${message.text || 'رسالة نظام'}</p>
            </div>
        `;
    } else { // رسائل المستخدم العادية
        let adminButtons = '';
        const isOwnMessage = currentUserData && currentUserData.uid === message.senderUid;

        // زر الحذف: للمشرفين والمدراء والمالك، ولصاحب الرسالة نفسه
        if (hasPermission('canDeleteAnyMessage') || isOwnMessage) {
            adminButtons += `<button class="delete-message-button" data-message-id="${message.id}" data-sender-uid="${message.senderUid}" title="حذف الرسالة"><i class="fas fa-trash"></i></button>`;
        }

        // أزرار الإدارة الأخرى: تظهر فقط إذا لم تكن الرسالة من نفس المستخدم الذي يدير
        if (!isOwnMessage) {
            if (hasPermission('canKickBan')) {
                adminButtons += `<button class="kick-user-button" data-uid="${message.senderUid}" data-username="${message.senderUsername}" title="طرد المستخدم"><i class="fas fa-times-circle"></i></button>`;
                adminButtons += `<button class="ban-user-button" data-uid="${message.senderUid}" data-username="${message.senderUsername}" title="حظر المستخدم"><i class="fas fa-ban"></i></button>`;
            }
            if (hasPermission('canMuteUsers')) {
                adminButtons += `<button class="mute-user-button" data-uid="${message.senderUid}" data-username="${message.senderUsername}" title="إسكات المستخدم"><i class="fas fa-volume-mute"></i></button>`;
            }
        }

        // تم الإبقاء على مسارات الصور من RANK_IMAGE_MAP
        const rankImageSrc = RANK_IMAGE_MAP[message.userType] || RANK_IMAGE_MAP['عضو'];

        let displayedText = message.text;
        // التحقق مما إذا كانت الرسالة تتضمن منشن للمستخدم الحالي
        if (message.mentionedUids && currentUserData && message.mentionedUids.includes(currentUserData.uid)) {
            const currentUserUsername = currentUserData.username;
            const escapedUsername = currentUserUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`@${escapedUsername}\\b`, 'g');
            displayedText = displayedText.replace(regex, `<span class="highlight-mention">@${currentUserUsername}</span>`);
        }
           
        // معالجة المنشنات في النص الأصلي لتغيير مظهرها (لأي مستخدم آخر)
        const mentionRegexDisplay = /@([a-zA-Z0-9_\u0600-\u06FF]+)/g;
        displayedText = displayedText.replace(mentionRegexDisplay, (match, usernameInMessage, boundary) => {
            const user = allUsersCached.find(u => u.username === usernameInMessage.trim());
            if (user) {
                if (currentUserData && user.uid === currentUserData.uid) {
                    return `<span class="highlight-mention">@${user.username}</span>${boundary === '$' ? '' : ' '}`;
                } else {
                    return `<span class="other-mention">@${user.username}</span>${boundary === '$' ? '' : ' '}`;
                }
            }
            return match;
        });
        
        const senderUsername = message.senderUsername || 'مستخدم غير معروف';
        const senderPhotoURL = message.senderPhotoURL || 'default_images/user.png';
        const messageTime = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
        const userType = message.userType || 'عضو';


        messageElement.innerHTML = `
            <img src="${senderPhotoURL}" alt="صورة المستخدم" class="user-avatar">
            <div class="message-content">
                <div class="user-info">
                    <span class="username mentionable-username" data-uid="${message.senderUid}" data-username="${senderUsername}">${senderUsername}</span>
                    ${userType ? `<img src="${RANK_IMAGE_MAP[userType] || RANK_IMAGE_MAP['عضو']}" alt="${userType}" class="rank-icon">` : ''}
                    <span class="message-time">${messageTime}</span>
                    <div class="message-actions">${adminButtons}</div>
                </div>
                <p class="message-text">${displayedText || 'رسالة فارغة'}</p>
            </div>
        `;

        // **** الجزء الجديد الذي يجب إضافته ****
        const userAvatarElement = messageElement.querySelector('.user-avatar');
        if (userAvatarElement) {
            userAvatarElement.style.cursor = 'pointer'; // لجعلها قابلة للنقر بصرياً
            userAvatarElement.title = 'عرض معلومات المستخدم'; // نص يظهر عند تمرير الفأرة

            userAvatarElement.addEventListener('click', (event) => {
                event.stopPropagation(); // يمنع انتشار الحدث ليغلق أي شيء آخر قد يفتحه
                // بيانات المستخدم التي سيتم تمريرها إلى showUserInfoPopover
                const userDataForPopover = {
                    uid: message.senderUid,
                    username: senderUsername,
                    avatar: senderPhotoURL
                };

                // استدعاء الدالة التي تفتح المربع المنبثق
                // تأكد أن showUserInfoPopover موجودة في نفس النطاق ويمكن الوصول إليها
                showUserInfoPopover(event, userDataForPopover);
            });
        }
        // **** نهاية الجزء الجديد ****
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // إضافة مستمع حدث للنقر على اسم المرسل للمنشن فقط
    if (!message.type || !message.type.startsWith('system_')) {
        const senderNameSpan = messageElement.querySelector('.mentionable-username');
        if (senderNameSpan) {
            senderNameSpan.style.cursor = 'pointer';
            senderNameSpan.title = 'انقر للإشارة إلى هذا المستخدم';
            senderNameSpan.addEventListener('click', () => {
                const usernameToInteract = senderNameSpan.dataset.username;
                const uidToInteract = senderNameSpan.dataset.uid;

                // إذا كان المستخدم الحالي، افتح ملفه الشخصي (بدلاً من منشن نفسه)
                if (currentUserData && uidToInteract === currentUserData.uid) {
                    // افتح مودال ملفه الشخصي الخاص
                    // تأكد من وجود دالة openProfileModal()
                    if (typeof openProfileModal === 'function') {
                        openProfileModal();
                    } else {
                        console.warn("الدالة openProfileModal غير معرفة.");
                        alert("لا يمكن عرض ملفك الشخصي. الدالة غير موجودة.");
                    }
                } else if (usernameToInteract) {
                    mentionUserInInput(usernameToInteract);
                }
            });
        }
    }
}

// دالة لحذف الرسائل
async function deleteMessage(messageId, senderUid) {
    // يمكن لصاحب الرسالة حذف رسالته، والمدراء/المالك يمكنهم حذف أي رسالة
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
// دالة لتنظيف جميع رسائل الغرفة
async function clearChatRoom(roomId) {
    try {
        // 1. الحصول على مرجع لمجموعة الرسائل في الغرفة المحددة
        const messagesRef = collection(doc(db, CHAT_ROOM_COLLECTION, roomId), MESSAGES_COLLECTION);
        // 2. إنشاء استعلام لجلب جميع الرسائل
        const q = query(messagesRef);
        // 3. تنفيذ الاستعلام للحصول على لقطة (snapshot) للرسائل
        const querySnapshot = await getDocs(q);

        // 4. التحقق مما إذا كانت الغرفة فارغة بالفعل
        if (querySnapshot.empty) {
            displaySystemMessage("الغرفة فارغة بالفعل، لا توجد رسائل لحذفها.", 'system_info');
            return; // إنهاء الدالة إذا لم تكن هناك رسائل
        }

        // 5. إنشاء مصفوفة لتخزين وعود (Promises) عمليات الحذف
        const deletePromises = [];
        // 6. المرور على كل مستند (رسالة) في اللقطة وإضافة وعد الحذف إلى المصفوفة
        querySnapshot.forEach((docSnap) => {
            deletePromises.push(deleteDoc(doc(db, CHAT_ROOM_COLLECTION, roomId, MESSAGES_COLLECTION, docSnap.id)));
        });

        // 7. انتظار انتهاء جميع عمليات الحذف المتوازية
        await Promise.all(deletePromises);

        // 8. إرسال رسالة نظام لإبلاغ الجميع بأن الغرفة قد تم تنظيفها
        // === التعديل هنا: لضمان ظهور اسم المستخدم الصحيح ===
        // نتحقق من وجود currentUserData و username داخله، وإلا نستخدم 'مسؤول غير معروف'
        const cleanerUsername = currentUserData && currentUserData.username ? currentUserData.username : 'مسؤول غير معروف';
        const cleanMessageText = `تم تنظيف الغرفة من قبل ${cleanerUsername}.`;

        // نستخدم بيانات المستخدم الحالي (أو بيانات افتراضية إذا لم تكن متاحة) كمرسل لرسالة النظام
        await sendChatSystemMessage(
            cleanMessageText,
            currentUserData ? currentUserData.uid : 'system_cleaner_uid', // UID افتراضي إذا لم يكن متاحًا
            currentUserData ? currentUserData.username : 'النظام', // اسم المستخدم لرسالة النظام
            currentUserData ? currentUserData.photoURL : 'default_images/user.png', // صورة افتراضية لرسالة النظام
            'system_info', // نوع الرسالة
            currentUserData ? currentUserData.userType : 'نظام' // رتبة المستخدم لرسالة النظام
        );

        // 9. مسح الرسائل من واجهة المستخدم فورًا (بدون انتظار إعادة التحميل)
        chatMessages.innerHTML = '';
        // هذه الرسالة ستظهر فقط للمستخدم الذي قام بالتنظيف
        displaySystemMessage("تم تنظيف الغرفة بنجاح.", 'system_info');

    } catch (error) {
        console.error("خطأ في تنظيف الغرفة:", error);
        displaySystemMessage("فشل تنظيف الغرفة. الرجاء المحاولة مرة أخرى.", 'system_error');
    }
}

// الاستماع لرسائل الدردشة في الغرفة الحالية
function listenForMessages() {
    // التحقق مما إذا كان هناك مستمع سابق لإلغائه لتجنب تكرار الاستماع
    // إذا كنت تستخدم unsubscribeMessages كمتغير عام، تأكد من تعريفه في النطاق الأعلى
    if (typeof unsubscribeMessages !== 'undefined' && unsubscribeMessages) {
        unsubscribeMessages();
    }

    const messagesRef = collection(doc(db, CHAT_ROOM_COLLECTION, currentRoomId), MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    // تخزين وظيفة إلغاء الاشتراك في متغير عام (إذا كنت تستخدمها)
    // هذا يسمح بإلغاء الاشتراك عند تغيير الغرفة مثلاً
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        let shouldScrollToBottom = false; // متغير لتحديد ما إذا كان يجب التمرير

        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                displayChatMessage({ ...change.doc.data(), id: change.doc.id });
                // لا تشغل الصوت لرسائل النظام، فقط لرسائل المستخدمين
                if (change.doc.data().type === 'user_message' && change.doc.data().senderUid !== (currentUserData ? currentUserData.uid : null)) {
                    playNewMessageSound();
                }
                shouldScrollToBottom = true; // تم إضافة رسالة، لذا يجب التمرير
            }
            if (change.type === "removed") {
                const messageToRemove = document.getElementById(change.doc.id);
                if (messageToRemove) {
                    messageToRemove.remove();
                }
                // في حالة حذف رسالة، قد لا نحتاج للتمرير إلا إذا كان الحذف في الأسفل
                // ولكن للتبسيط، نركز على "added" للتمرير إلى الأسفل.
            }
            // إذا كان لديك 'modified' type، أضفها هنا
        });

        // === إضافة منطق التمرير إلى الأسفل هنا ===
        // نستخدم setTimeout بـ 0 مللي ثانية لضمان أن المتصفح قد قام بتحديث DOM بالكامل
        // وحساب scrollHeight بشكل صحيح بعد إضافة الرسائل.
        if (shouldScrollToBottom) {
            setTimeout(() => {
                const chatMessagesDiv = document.getElementById('chatMessages'); // تأكد من ID العنصر الذي يعرض الرسائل
                if (chatMessagesDiv) {
                    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
                    console.log("تم التمرير إلى أسفل الدردشة."); // رسالة للمطور للتأكيد
                }
            }, 0); 
        }

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
                // لا نرسل رسالة نظام للمغادرة هنا
                // await sendChatSystemMessage(`تم طرد ${targetUsername}.`, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_kick', currentUserData.userType);
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
                // لا نرسل رسالة نظام للمغادرة هنا
                // await sendChatSystemMessage(`تم حظر ${targetUsername}.`, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_ban', currentUserData.userType);
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
                // لا نرسل رسالة نظام للمغادرة هنا
                // await sendChatSystemMessage(`تم إسكات ${targetUsername} لمدة ${duration} دقيقة.`, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_mute', currentUserData.userType);
            } else {
                displaySystemMessage("مدة إسكات غير صالحة.", 'system_error');
            }
        }
    });
}

// وظيفة زر "بدء محادثة خاصة"
if (startPrivateChatBtn) {
    startPrivateChatBtn.addEventListener('click', () => {
        if (activeUserCardData) {
            // تحقق إذا كان المستخدم الحالي يحاول محادثة نفسه
            if (activeUserCardData.uid === currentUserData.uid) { // افترض أن currentUserData.uid متاح
                alert("لا يمكنك بدء محادثة خاصة مع نفسك.");
                return;
            }

            // استدعاء الدالة التي تفتح مودال الدردشة الخاصة (Private Conversation Modal)
            // ستحتاج إلى التأكد من أن هذه الدالة موجودة وقابلة للوصول
            // لنفترض أن اسمها openPrivateConversationModal
            // وتمرير بيانات المستخدم إليها
            if (typeof openPrivateConversationModal === 'function') {
                openPrivateConversationModal(activeUserCardData.uid, activeUserCardData.username, activeUserCardData.avatar);
                hideUserInfoPopover(); // إخفاء البطاقة بعد فتح المحادثة
            } else {
                console.error("الدالة openPrivateConversationModal غير معرفة.");
                alert("حدث خطأ: لا يمكن بدء المحادثة الخاصة.");
            }
        }
    });
}

// وظيفة زر "عرض الملف الشخصي" (هذا يحتاج إلى تنفيذ صفحة/مودال للملف الشخصي)
if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', () => {
        if (activeUserCardData) {
            alert(`سيتم عرض الملف الشخصي لـ: ${activeUserCardData.username}`);
            // هنا يمكنك فتح مودال لعرض الملف الشخصي أو الانتقال إلى صفحة الملف الشخصي
            // مثلاً: showProfileModal(activeUserCardData.uid);
            hideUserInfoPopover(); // إخفاء البطاقة
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

    // إخفاء/إظهار زر لوحة التحكم بناءً على الصلاحية
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
if (myProfileBtn) {
    myProfileBtn.addEventListener('click', () => {
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

    if (changeAvatarBtn && profileImageInput) {
    // عند النقر على زر "تغيير الصورة" (أيقونة القلم)، يتم تحفيز النقر على حقل إدخال الملف المخفي
    changeAvatarBtn.addEventListener('click', () => {
        profileImageInput.click();
    });

    // عند اختيار ملف، يتم تحميله إلى Cloudinary
    profileImageInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!currentUserData || !currentUserData.uid) {
            alert("يرجى تسجيل الدخول لتغيير الصورة.");
            return;
        }

        const userUid = currentUserData.uid;

        // إنشاء FormData لإرسال الملف والـ upload preset إلى Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'فشل تحميل الصورة إلى Cloudinary');
            }

            const data = await response.json();
            const newPhotoURL = data.secure_url; // رابط الصورة الآمن من Cloudinary

            // تحديث photoURL في Firestore
            const userDocRef = doc(db, USERS_COLLECTION, userUid);
            await updateDoc(userDocRef, {
                photoURL: newPhotoURL
            });

            // تحديث البيانات في الذاكرة والواجهة
            currentUserData.photoURL = newPhotoURL;
            updateAllUserInfoDisplays(); // تحديث عرض الصورة في جميع أنحاء التطبيق
            if (editProfileAvatarDisplay) editProfileAvatarDisplay.src = newPhotoURL; // تحديث الصورة في المودال

            profileImageInput.value = ''; // مسح اختيار الملف

        } catch (error) {
            console.error("خطأ في تغيير الصورة (Cloudinary):", error);
            alert("فشل تغيير الصورة: " + error.message);
        }
    });
}

if (deleteAvatarBtn) { // لاحظ أننا نستخدم deleteAvatarBtn هنا
    deleteAvatarBtn.addEventListener('click', async () => {
        if (!currentUserData || !currentUserData.uid) {
            alert("يرجى تسجيل الدخول لحذف الصورة.");
            return;
        }

        const userUid = currentUserData.uid;
        const defaultAvatarURL = "default_images/user.png"; // تأكد أن هذا المسار صحيح

        try {
            // تحديث photoURL في Firestore إلى الصورة الافتراضية
            const userDocRef = doc(db, USERS_COLLECTION, userUid);
            await updateDoc(userDocRef, {
                photoURL: defaultAvatarURL
            });

            // تحديث البيانات في الذاكرة والواجهة
            currentUserData.photoURL = defaultAvatarURL;
            updateAllUserInfoDisplays(); // تحديث عرض الصورة في جميع أنحاء التطبيق
            if (editProfileAvatarDisplay) editProfileAvatarDisplay.src = defaultAvatarURL; // تحديث الصورة في المودال

        } catch (error) {
            console.error("خطأ في حذف الصورة:", error);
            alert("فشل حذف الصورة: " + error.message);
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

if (editProfileOptionsBtn) {
    editProfileOptionsBtn.addEventListener('click', () => {
        editProfileOptionsModal.style.display = 'block';
        // **السطر الجديد الذي يجب إضافته هنا:**
        populateProfileModal(); // استدعاء الدالة لملء المودال ببيانات المستخدم الحالية
    });
}

if (leaveRoomButton) {
    leaveRoomButton.addEventListener('click', async () => {
        if (confirm("هل أنت متأكد أنك تريد مغادرة هذه الغرفة؟")) {
            // إزالة رسالة المغادرة
            // if (currentUserData && currentUserData.uid) {
            //     const leaveMessageText = `غادر ${currentUserData.username || 'مستخدم'} (${currentUserData.userType || 'عضو'}) الغرفة.`;
            //     await sendChatSystemMessage(leaveMessageText, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_leave', currentUserData.userType);
            //     sessionStorage.removeItem(`hasJoinedChatSession_${currentUserData.uid}`);
            // }
            displaySystemMessage("لقد غادرت الغرفة. يمكنك الانضمام لغرفة أخرى أو الخروج.", 'system_info');
            profileModal.style.display = 'none';
        }
    });
}

if (logoutModalButton) {
    logoutModalButton.addEventListener('click', async () => {
        if (confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟")) {
            try {
                await signOut(auth);
                // قم بمسح localStorage أيضًا لضمان تسجيل الخروج الكامل
                localStorage.removeItem('loggedIn');
                localStorage.removeItem('userUid');
                localStorage.removeItem('userUsername');
                localStorage.removeItem('userPhotoURL');
                localStorage.removeItem('userType');
                localStorage.removeItem('chatSoundEnabled'); // امسح إعداد الصوت أيضًا إذا كان خاصًا بالجلسة

                sessionStorage.clear(); // مسح الجلسة الحالية (لإزالة hasJoinedChatSession)

                window.location.href = LOGIN_PAGE_URL;
            } catch (error) {
                console.error("خطأ في تسجيل الخروج من المودال:", error);
                displaySystemMessage("فشل تسجيل الخروج. الرجاء المحاولة مرة أخرى.");
            }
        }
    });
}

// ===========================================
// وظائف ومودالات المستخدمين المسجلين (تم التعديل)
// ===========================================

// دالة لجلب وعرض المستخدمين المسجلين بترتيب الرتب
async function fetchAndDisplayRegisteredUsers() {
    try {
        allUsersCached = await fetchAllUsers(); // تحديث الكاش

        registeredUsersList.innerHTML = ''; // مسح القائمة السابقة

        if (allUsersCached.length === 0) {
            registeredUsersList.innerHTML = '<li class="no-users">لا يوجد مستخدمون مسجلون حاليًا.</li>';
            registeredUsersModal.style.display = 'flex';
            return;
        }

        // تجميع المستخدمين حسب الرتبة
        const usersByRank = {};
        RANK_ORDER.forEach(rank => {
            usersByRank[rank] = [];
        });

        allUsersCached.forEach(user => {
            const userRank = user.userType || 'عضو'; // افتراضيا "عضو" إذا لم تكن الرتبة موجودة
            if (usersByRank[userRank]) {
                usersByRank[userRank].push(user);
            } else {
                // إذا كانت هناك رتبة غير معرفة في RANK_ORDER، أضفها إلى "عضو" أو قم بإنشاء فئة جديدة
                usersByRank['عضو'].push(user); // أو usersByRank[userRank] = [user]; إذا أردت فصلها
            }
        });

        // عرض المستخدمين مرتبين حسب الرتبة
        RANK_ORDER.forEach(rank => {
            const usersInRank = usersByRank[rank];
            if (usersInRank && usersInRank.length > 0) {
                const rankGroupElement = document.createElement('div');
                rankGroupElement.classList.add('rank-group');

                rankGroupElement.innerHTML = `
    <div class="rank-group-header rank-${rank.replace(/\s/g, '-')}">
        <span>${rank}</span>
        <span class="rank-group-count">${usersInRank.length}</span>
    </div>
`;
                const usersListInGroup = document.createElement('ul');
                usersListInGroup.classList.add('rank-group-users-list'); // فئة جديدة للقائمة داخل المجموعة

                usersInRank.forEach(userData => {
                    const userElement = document.createElement('li');
                    userElement.classList.add('user-item');

                    const rankImageSrc = RANK_IMAGE_MAP[userData.userType] || RANK_IMAGE_MAP['عضو'];

                    userElement.innerHTML = `
                        <img src="${userData.photoURL || 'default_images/user.png'}" alt="صورة المستخدم" class="user-item-avatar">
                        <div class="user-item-info">
                            <span class="user-item-username">${userData.username || 'مستخدم غير معروف'}</span>
                            <span class="user-item-rank">
                                ${userData.userType ? `<img src="${rankImageSrc}" alt="${userData.userType}" class="rank-icon-small">` : ''}
                                ${userData.userType || 'عضو'}
                            </span>
                        </div>
                        <button class="view-profile-button" data-uid="${userData.uid}" title="عرض الملف الشخصي"><i class="fas fa-eye"></i></button>
                    `;
                    usersListInGroup.appendChild(userElement);
                });
                rankGroupElement.appendChild(usersListInGroup);
                registeredUsersList.appendChild(rankGroupElement);
            }
        });


        registeredUsersList.querySelectorAll('.view-profile-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const uid = e.currentTarget.dataset.uid;
                const username = e.currentTarget.closest('.user-item').querySelector('.user-item-username').textContent;
                // قم بعمل أي شيء تريده عند عرض ملف شخصي (مثلاً، افتح مودال جديد بمعلومات المستخدم)
                alert(`عرض الملف الشخصي للمستخدم: ${username} (UID: ${uid})`);
                // هنا يمكنك إضافة منطق لفتح مودال تفصيلي للملف الشخصي
            });
        });

        registeredUsersModal.style.display = 'flex';
    }
     catch (error) {
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
                <p class="news-content">${newsItem.content || 'لا يوجد محتوى لهذا الخبر.'}</p> `;
            newsList.appendChild(newsElement);
        });

        // إضافة مستمعي الأحداث لأزرار التعديل والحذف الجديدة
        newsList.querySelectorAll('.edit-news-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                // ابحث عن الخبر في querySnapshot (أو اجلبه مرة أخرى)
                const newsToEdit = querySnapshot.docs.find(doc => doc.id === id)?.data();
                if (newsToEdit) {
                    openNewsInputModal(id, newsToEdit.content || ''); // تأكد من تمرير سلسلة نصية
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
// وظائف ومودالات الدردشات الخاصة (المضافة حديثًا)
// ===========================================

// دالة لإنشاء أو الحصول على chatRoomId فريد بين مستخدمين
function getPrivateChatRoomId(uid1, uid2) {
    // لضمان أن يكون الـ ID متطابقًا بغض النظر عن ترتيب الـ UIDs
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

async function sendPrivateMessage() {
    const messageText = privateMessageInput.value.trim();

    if (messageText === '' || !currentUserData || !currentPrivateChatReceiverUid) {
        console.warn("لا يمكن إرسال الرسالة: النص فارغ، أو بيانات المستخدم غير موجودة، أو الشريك غير محدد.");
        return;
    }

    // بناء chatRoomId بشكل موحد للطرفين
    const chatRoomId = getPrivateChatRoomId(currentUserData.uid, currentPrivateChatReceiverUid);

    // كائن الرسالة المؤقتة للعرض الفوري
    const tempMessage = {
        senderUid: currentUserData.uid,
        receiverUid: currentPrivateChatReceiverUid,
        text: messageText,
         // للعرض الفوري
        type: 'private_message',
    };

    try {
        // أضف الرسالة إلى Firebase في المسار الموحّد
        await addDoc(collection(db, PRIVATE_MESSAGES_COLLECTION, chatRoomId, MESSAGES_COLLECTION), {
            senderUid: currentUserData.uid,
            receiverUid: currentPrivateChatReceiverUid,
            text: messageText,
            timestamp: serverTimestamp(),
            type: 'private_message',
        });

        // عرض الرسالة مباشرة (اختياري، غالباً onSnapshot سيعرضها تلقائياً)
        displayPrivateChatMessage(tempMessage, true);

        privateMessageInput.value = '';
    } catch (error) {
        console.error("خطأ في إرسال الرسالة الخاصة:", error);
        alert("فشل إرسال الرسالة: " + error.message);
    }
}

// تأكد أن هذه الأحداث موجودة ومربوطة بالعناصر الصحيحة
if (sendPrivateMessageButton) {
    sendPrivateMessageButton.addEventListener('click', sendPrivateMessage);
}
if (privateMessageInput) {
    privateMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendPrivateMessage();
        }
    });
}
    
// دالة لجلب وعرض قائمة الدردشات الخاصة
async function fetchAndDisplayPrivateChats() {
    if (!currentUserData || !currentUserData.uid) {
        displaySystemMessage("لا يمكن جلب الدردشات الخاصة: المستخدم غير مسجل الدخول.", 'system_error');
        return;
    }

    privateChatsList.innerHTML = ''; // مسح القائمة الحالية
    // إزالة الفئة التي تعرض رسالة "لا توجد محادثات" إذا كانت موجودة
    const noChatsMessage = privateChatsList.querySelector('.no-private-chats');
    if (noChatsMessage) {
        noChatsMessage.remove();
    }
    // إعادة تعيين محتوى القائمة إذا كانت لا توجد محادثات
    privateChatsList.innerHTML = `
        <li class="no-private-chats">
            <p>لا توجد محادثات خاصة حاليًا.</p>
        </li>
    `;


    const userPrivateChatsRef = collection(db, USERS_COLLECTION, currentUserData.uid, "privateChats");
    const q = query(userPrivateChatsRef, orderBy('lastMessageTimestamp', 'desc')); // عرض الأحدث أولاً

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // الرسالة الافتراضية "لا توجد محادثات" موجودة بالفعل
            return;
        }
        
        // إذا كان هناك محادثات، قم بإزالة الرسالة الافتراضية
        const existingNoChatsMessage = privateChatsList.querySelector('.no-private-chats');
        if (existingNoChatsMessage) {
            existingNoChatsMessage.remove();
        }


        querySnapshot.forEach(docSnap => {
            const chatPartnerId = docSnap.id; // UID الشريك
            const chatData = docSnap.data();

            const chatItemElement = document.createElement('li');
            chatItemElement.classList.add('private-chat-item');
            chatItemElement.dataset.partnerUid = chatPartnerId;
            chatItemElement.dataset.chatPath = chatData.chatPath; // لتمرير مسار الدردشة الفعلي

            const partnerPhoto = chatData.partnerPhotoURL || 'default_images/user.png';
            const partnerName = chatData.partnerName || 'مستخدم غير معروف';
            const lastMessageText = chatData.lastMessage ? chatData.lastMessage : 'لا توجد رسائل بعد.';
            const lastMessageTime = chatData.lastMessageTimestamp ?
                new Date(chatData.lastMessageTimestamp.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

            // يمكنك إضافة منطق للرسائل غير المقروءة هنا
            // const unreadClass = chatData.unreadCount && chatData.unreadCount > 0 ? 'unread' : '';
            // const unreadCountDisplay = chatData.unreadCount && chatData.unreadCount > 0 ? `<span class="unread-count">${chatData.unreadCount}</span>` : '';

            chatItemElement.innerHTML = `
                <img src="${partnerPhoto}" alt="${partnerName}" class="user-avatar">
                <div class="private-chat-info">
                    <span class="chat-partner-name">${partnerName}</span>
                    <p class="last-message">${lastMessageText}</p>
                </div>
                <span class="private-chat-time">${lastMessageTime}</span>
            `;

            privateChatsList.appendChild(chatItemElement);
chatItemElement.addEventListener('click', async () => {
                // استدعاء دالة لفتح مودال رسائل الدردشة الخاصة هنا
                // نحتاج إلى UID الشريك واسمه وصورة ملفه الشخصي

                const partnerUid = chatPartnerId; // هذا المتغير يجب أن يكون متاحاً من الحلقة التي تنشئ chatItemElement
                const partnerName = chatData.partnerName; // أو partnerUsername، حسب تسمية بيانات الدردشة
                const partnerPhotoURL = chatData.partnerPhotoURL || 'default_images/user.png'; // يجب أن تكون متاحة في بيانات الدردشة أو يتم جلبها

                // أغلق مودال قائمة الدردشات الخاصة
                closePrivateChatsModal.click(); // يحاكي النقر على زر الإغلاق

                // افتح مودال المحادثة الخاصة مع الشريك المحدد
                await openPrivateConversationModal(partnerUid, partnerName, partnerPhotoURL);
            });
        });
    } catch (error) {
        console.error("خطأ في جلب الدردشات الخاصة:", error);
        displaySystemMessage("فشل تحميل قائمة الدردشات الخاصة.", 'system_error');
    }
}

// دالة لفتح مودال الدردشات الخاصة
function openPrivateChatsModal() {
    fetchAndDisplayPrivateChats();
    privateChatsModal.style.display = 'flex';
}

// دالة لإغلاق مودال الدردشات الخاصة
function closePrivateChatsModalFunc() {
    privateChatsModal.style.display = 'none';
}

// دالة فتح محادثة خاصة بين المستخدم الحالي وأي مستخدم آخر
async function openPrivateConversationModal(partnerUid, partnerUsername, partnerPhotoURL) {
    privateChatPartnerName.textContent = partnerUsername;
    privateChatPartnerAvatar.src = partnerPhotoURL || 'default_images/user.png';
    currentPrivateChatReceiverUid = partnerUid;
    privateConversationModal.style.display = 'flex';

    privateChatMessages.innerHTML = '';

    const chatRoomId = getPrivateChatRoomId(currentUserData.uid, partnerUid);

    // هنا فقط استدعي الاستماع، ولا داعي لجلب قديم لأن onSnapshot يجلب القديم والجديد
    listenForPrivateMessages(chatRoomId);

    privateMessageInput.focus();
}
// دالة
function listenForPrivateMessages(chatRoomId) {
    // أوقف الاستماع السابق إذا كان موجود
    if (unsubscribePrivateMessages) {
        unsubscribePrivateMessages();
    }

    const messagesRef = collection(db, PRIVATE_MESSAGES_COLLECTION, chatRoomId, MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    unsubscribePrivateMessages = onSnapshot(q, (snapshot) => {
        privateChatMessages.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const isSelf = msg.senderUid === currentUserData.uid;
            displayPrivateChatMessage(msg, isSelf);
        });
        // تمرير تلقائي لأسفل
        privateChatMessages.scrollTop = privateChatMessages.scrollHeight;
    }, (error) => {
        console.error("خطأ في الاستماع لرسائل الخاص:", error);
    });
}

// دالة لبدء محادثة خاصة جديدة

// قد تحتاج هذه الدالة لأن تكون في نطاق يمكن الوصول إليه من sendPrivateMessage
function displayPrivateChatMessage(message, isSelf = false) {
    const messagesContainer = document.getElementById('privateChatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', isSelf ? 'self-message' : 'user-message');

    // (اختياري) صورة المرسل - إذا أردت عرضها في الخاص
    // const avatarImg = document.createElement('img');
   // avatarImg.src = isSelf
      //  ? (currentUserData.photoURL || 'default_images/user.png')
        //: (message.senderPhotoURL || 'default_images/user.png');
    //avatarImg.classList.add('user-avatar');
   //  messageDiv.appendChild(avatarImg);

    // محتوى الرسالة (مع دعم الأسطر)
    const messageContent = document.createElement('p');
    messageContent.classList.add('private-message-text');
    messageContent.innerHTML = (message.text || '').replace(/\n/g, '<br>');
    messageDiv.appendChild(messageContent);

    // الوقت
    const timestampSpan = document.createElement('span');
    let timeString = "الآن";
    if (message.timestamp && typeof message.timestamp.toDate === "function") {
        const date = message.timestamp.toDate();
        timeString = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } else if (message.timestamp instanceof Date) {
        timeString = message.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    timestampSpan.textContent = timeString;
    timestampSpan.classList.add('timestamp');
    messageDiv.appendChild(timestampSpan);

    // (اختياري) عرض اسم المرسل إذا أردت ذلك:
    // if (!isSelf) {
    //     const senderName = document.createElement('span');
    //     senderName.classList.add('private-sender-name');
    //     senderName.textContent = message.senderUsername || '';
    //     messageDiv.appendChild(senderName);
    // }

    messagesContainer.appendChild(messageDiv);

    // تمرير تلقائي لأسفل
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

if (privateChatButton) {
    // بدلاً من التوجيه لصفحة أخرى، افتح المودال الجديد
    privateChatButton.addEventListener('click', () => {
        openPrivateChatsModal();
    });
}

if (privateChatsModal) {
    window.addEventListener('click', (event) => {
        if (event.target === privateChatsModal) {
            closePrivateChatsModalFunc();
        }
    });
}

if (startNewPrivateChatButton) {
    startNewPrivateChatButton.addEventListener('click', () => {
        // بدلاً من alert، افتح مودال المستخدمين المسجلين ليختار المستخدم شريكًا
        closePrivateChatsModalFunc(); // أغلق مودال الدردشات الخاصة
        fetchAndDisplayRegisteredUsers(); // افتح مودال المستخدمين المسجلين
        // TODO: قد تحتاج لتعديل fetchAndDisplayRegisteredUsers لتشمل زر "بدء خاص" بجانب كل مستخدم
    });
}

// ===========================================
// أزرار الهيدر الأخرى
// ===========================================

// تم نقل privateChatButton إلى قسم الدردشات الخاصة

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
// **تأكد من وجود هذه العناصر في HTML الخاص بك إذا كنت تستخدمها**
const homeButton = document.getElementById('homeButton');
const roomsButton = document.getElementById('roomsButton');
const plusButton = document.getElementById('plusButton');
const bottomNotificationButton = document.getElementById('bottomNotificationButton');
const settingsButton = document.getElementById('settingsButton');


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
    // استخدم onAuthStateChanged للتعامل مع حالة تسجيل الدخول من Firebase
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // المستخدم مسجل الدخول
            await fetchCurrentUserData(user.uid); // جلب بيانات المستخدم بناءً على UID من Firebase

            if (!currentUserData || !currentUserData.uid) {
                console.error("بيانات المستخدم غير مكتملة بعد الجلب. سيتم إعادة التوجيه.");
                displaySystemMessage("خطأ في جلب بيانات المستخدم. سيتم إعادة التوجيه.");
                setTimeout(() => {
                    window.location.href = LOGIN_PAGE_URL;
                }, 2000);
                return;
            }

            // تحديث صورة المستخدم في زر الملف الشخصي
            if (myProfileBtn) { 
                const profileIcon = myProfileBtn.querySelector('.profile-icon');
                if (profileIcon && currentUserData.photoURL) {
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

            // منطق رسالة الانضمام (يستخدم sessionStorage لمنع تكرار الرسالة في نفس الجلسة)
            const hasJoinedKey = `hasJoinedChatSession_${user.uid}`;
            const hasJoined = sessionStorage.getItem(hasJoinedKey);

            // **التعديل هنا: لنرسل رسالة الانضمام فقط إذا لم يكن قد انضم في هذه الجلسة**
            if (!hasJoined) {
                const joinMessageText = `انضم ${currentUserData.username || 'مستخدم'} (${currentUserData.userType || 'عضو'}) إلى الغرفة.`;
                await sendChatSystemMessage(joinMessageText, currentUserData.uid, currentUserData.username, currentUserData.photoURL, 'system_join', currentUserData.userType);
                sessionStorage.setItem(hasJoinedKey, 'true'); // وضع علامة أن المستخدم قد انضم في هذه الجلسة
            }

            await fetchAllUsers(); // جلب جميع المستخدمين مرة واحدة عند التحميل الأولي
            listenForMessages(); // بدء الاستماع للرسائل

        } else {
            // المستخدم غير مسجل الدخول، أو تم تسجيل خروجه
            displaySystemMessage("لم يتم تسجيل الدخول. يتم توجيهك.");
            setTimeout(() => {
                window.location.href = LOGIN_PAGE_URL;
            }, 2000);
        }
    });
});

// معالجة مغادرة المستخدم للصفحة (تم حذف رسائل المغادرة)
window.addEventListener('beforeunload', async () => {
});