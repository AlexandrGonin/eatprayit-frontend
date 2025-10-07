const CONFIG = {
    BACKEND_URL: 'https://your-backend.onrender.com'
};

const elements = {
    userAvatar: document.getElementById('user-avatar') as HTMLImageElement,
    avatarPlaceholderSmall: document.getElementById('avatar-placeholder-small') as HTMLDivElement,
    userNameHeader: document.getElementById('user-name-header') as HTMLHeadingElement,
    mainScreen: document.getElementById('main-screen') as HTMLDivElement,
    profileScreen: document.getElementById('profile-screen') as HTMLDivElement,
    editProfileScreen: document.getElementById('edit-profile-screen') as HTMLDivElement,
    loadingSection: document.getElementById('loading-section') as HTMLDivElement,
    userAvatarEdit: document.getElementById('user-avatar-edit') as HTMLImageElement,
    avatarPlaceholderEdit: document.getElementById('avatar-placeholder-edit') as HTMLDivElement,
    editPosition: document.getElementById('edit-position') as HTMLInputElement,
    editBio: document.getElementById('edit-bio') as HTMLTextAreaElement,
    editTelegram: document.getElementById('edit-telegram') as HTMLInputElement,
    editLinkedin: document.getElementById('edit-linkedin') as HTMLInputElement,
    editVk: document.getElementById('edit-vk') as HTMLInputElement,
    editInstagram: document.getElementById('edit-instagram') as HTMLInputElement,
    saveProfileBtn: document.getElementById('save-profile-btn') as HTMLButtonElement,
    backToMainBtn: document.getElementById('back-to-main-btn') as HTMLButtonElement,
    backToProfileBtn: document.getElementById('back-to-profile-btn') as HTMLButtonElement,
    profileAvatar: document.getElementById('profile-avatar') as HTMLImageElement,
    avatarPlaceholderLarge: document.getElementById('avatar-placeholder-large') as HTMLDivElement,
    profileName: document.getElementById('profile-name') as HTMLHeadingElement,
    profileUsername: document.getElementById('profile-username') as HTMLParagraphElement,
    profilePosition: document.getElementById('profile-position') as HTMLParagraphElement,
    profileBio: document.getElementById('profile-bio') as HTMLParagraphElement,
    profileCoins: document.getElementById('profile-coins') as HTMLParagraphElement,
    profileLinks: document.getElementById('profile-links') as HTMLDivElement
};

let currentUser: any = null;

async function initializeApp(): Promise<void> {
    try {
        showLoading(true);
        
        const tg = (window as any).Telegram.WebApp;
        if (!tg) {
            throw new Error('Telegram WebApp не загружен');
        }
        
        tg.expand();
        tg.ready();
        
        const telegramUser = tg.initDataUnsafe?.user;
        
        if (!telegramUser) {
            throw new Error('Не удалось получить данные пользователя из Telegram');
        }

        // ПРОВЕРКА ДОСТУПА К MINI APP
        console.log('Проверяем доступ пользователя...');
        const accessCheck = await fetch(`${CONFIG.BACKEND_URL}/check-access`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: telegramUser.id
            })
        });
        
        if (!accessCheck.ok) {
            throw new Error('Доступ к приложению запрещен');
        }
        
        const accessData = await accessCheck.json();
        
        if (!accessData.hasAccess) {
            throw new Error('У вас нет доступа к Mini App. Зарегистрируйтесь через Telegram бота.');
        }

        console.log('Доступ разрешен, загружаем профиль...');
        
        // Авторизация на бэкенде
        const response = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telegramUser)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
            throw new Error(errorData.error || `Ошибка бэкенда: ${response.status}`);
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Показываем шапку
        renderHeader(currentUser);
        showLoading(false);
        showScreen('main');
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки приложения';
        showError(errorMessage);
        showLoading(false);
    }
}

function renderHeader(user: any): void {
    if (!user) return;
    
    if (user.photo_url) {
        elements.userAvatar.src = user.photo_url;
        elements.userAvatar.style.display = 'block';
        elements.avatarPlaceholderSmall.style.display = 'none';
    } else {
        const firstLetter = user.first_name ? user.first_name[0].toUpperCase() : 'U';
        elements.avatarPlaceholderSmall.textContent = firstLetter;
        elements.userAvatar.style.display = 'none';
        elements.avatarPlaceholderSmall.style.display = 'flex';
    }
    
    elements.userNameHeader.textContent = user.first_name || 'Пользователь';
}

function renderProfile(user: any): void {
    if (!user) return;
    
    if (user.photo_url) {
        elements.profileAvatar.src = user.photo_url;
        elements.profileAvatar.style.display = 'block';
        elements.avatarPlaceholderLarge.style.display = 'none';
    } else {
        const firstLetter = user.first_name ? user.first_name[0].toUpperCase() : 'U';
        elements.avatarPlaceholderLarge.textContent = firstLetter;
        elements.profileAvatar.style.display = 'none';
        elements.avatarPlaceholderLarge.style.display = 'flex';
    }
    
    elements.profileName.textContent = `${user.first_name} ${user.last_name || ''}`.trim();
    elements.profileUsername.textContent = user.username ? `@${user.username}` : '';
    elements.profilePosition.textContent = user.position || '';
    elements.profileBio.textContent = user.bio || '';
    elements.profileCoins.textContent = `Монеты: ${user.coins || 0}`;
    
    renderLinks(user.links);
}

function renderLinks(links: any): void {
    if (!links) {
        elements.profileLinks.innerHTML = '<p class="no-links">Ссылки не добавлены</p>';
        return;
    }
    
    const linksHTML = [];
    let hasLinks = false;
    
    if (links.telegram && links.telegram.trim() !== '') {
        hasLinks = true;
        const displayName = links.telegram.includes('t.me/') 
            ? links.telegram.split('t.me/')[1] 
            : 'Telegram';
        linksHTML.push(`
            <a href="${links.telegram}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span>Telegram: ${displayName}</span>
            </a>
        `);
    }
    
    if (links.linkedin && links.linkedin.trim() !== '') {
        hasLinks = true;
        linksHTML.push(`
            <a href="${links.linkedin}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span>LinkedIn</span>
            </a>
        `);
    }
    
    if (links.vk && links.vk.trim() !== '') {
        hasLinks = true;
        linksHTML.push(`
            <a href="${links.vk}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span>VK</span>
            </a>
        `);
    }
    
    if (links.instagram && links.instagram.trim() !== '') {
        hasLinks = true;
        linksHTML.push(`
            <a href="${links.instagram}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span>Instagram</span>
            </a>
        `);
    }
    
    if (!hasLinks) {
        linksHTML.push('<p class="no-links">Ссылки не добавлены</p>');
    }
    
    elements.profileLinks.innerHTML = linksHTML.join('');
}

function showProfile(): void {
    if (!currentUser) return;
    renderProfile(currentUser);
    showScreen('profile');
}

function showEditProfile(): void {
    if (!currentUser) return;
    
    if (currentUser.photo_url) {
        elements.userAvatarEdit.src = currentUser.photo_url;
        elements.userAvatarEdit.style.display = 'block';
        elements.avatarPlaceholderEdit.style.display = 'none';
    } else {
        const firstLetter = currentUser.first_name ? currentUser.first_name[0].toUpperCase() : 'U';
        elements.avatarPlaceholderEdit.textContent = firstLetter;
        elements.userAvatarEdit.style.display = 'none';
        elements.avatarPlaceholderEdit.style.display = 'flex';
    }
    
    elements.editPosition.value = currentUser.position || '';
    elements.editBio.value = currentUser.bio || '';
    elements.editTelegram.value = currentUser.links?.telegram || '';
    elements.editLinkedin.value = currentUser.links?.linkedin || '';
    elements.editVk.value = currentUser.links?.vk || '';
    elements.editInstagram.value = currentUser.links?.instagram || '';
    
    showScreen('edit');
}

async function saveProfile(): Promise<void> {
    try {
        elements.saveProfileBtn.disabled = true;
        elements.saveProfileBtn.textContent = 'Сохранение...';
        
        if (!currentUser) {
            throw new Error('Нет данных пользователя');
        }
        
        const updates = {
            position: elements.editPosition.value,
            bio: elements.editBio.value,
            telegram: elements.editTelegram.value,
            linkedin: elements.editLinkedin.value,
            vk: elements.editVk.value,
            instagram: elements.editInstagram.value
        };
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/profile/${currentUser.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
            throw new Error(errorData.error || `Ошибка ${response.status}`);
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        renderProfile(currentUser);
        
        const tg = (window as any).Telegram.WebApp;
        tg.showPopup({
            title: 'Успех',
            message: 'Профиль обновлен',
            buttons: [{ type: 'ok' }]
        });
        
        showScreen('main');
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        const errorMessage = error instanceof Error ? error.message : 'Не удалось сохранить изменения';
        showError(errorMessage);
    } finally {
        elements.saveProfileBtn.disabled = false;
        elements.saveProfileBtn.textContent = 'Сохранить профиль';
    }
}

function showScreen(screen: 'main' | 'profile' | 'edit'): void {
    elements.mainScreen.style.display = screen === 'main' ? 'block' : 'none';
    elements.profileScreen.style.display = screen === 'profile' ? 'block' : 'none';
    elements.editProfileScreen.style.display = screen === 'edit' ? 'block' : 'none';
}

function showLoading(show: boolean): void {
    if (show) {
        elements.loadingSection.classList.add('show');
        elements.mainScreen.style.display = 'none';
        elements.profileScreen.style.display = 'none';
        elements.editProfileScreen.style.display = 'none';
    } else {
        elements.loadingSection.classList.remove('show');
    }
}

function showError(message: string): void {
    const tg = (window as any).Telegram.WebApp;
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: 'Ошибка',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        alert(message);
    }
}

function setupEventListeners(): void {
    elements.userAvatar.addEventListener('click', showProfile);
    elements.avatarPlaceholderSmall.addEventListener('click', showProfile);
    elements.profileAvatar.addEventListener('click', showEditProfile);
    elements.avatarPlaceholderLarge.addEventListener('click', showEditProfile);
    elements.backToMainBtn.addEventListener('click', () => showScreen('main'));
    elements.backToProfileBtn.addEventListener('click', () => showScreen('profile'));
    elements.saveProfileBtn.addEventListener('click', saveProfile);
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
});