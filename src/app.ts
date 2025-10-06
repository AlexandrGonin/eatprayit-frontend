const CONFIG = {
    BACKEND_URL: 'https://eatprayit-backend.onrender.com'
};

const elements = {
    userAvatar: document.getElementById('user-avatar') as HTMLImageElement,
    avatarPlaceholderSmall: document.getElementById('avatar-placeholder-small') as HTMLDivElement,
    userNameHeader: document.getElementById('user-name-header') as HTMLHeadingElement,
    mainScreen: document.getElementById('main-screen') as HTMLDivElement,
    editProfileScreen: document.getElementById('edit-profile-screen') as HTMLDivElement,
    loadingSection: document.getElementById('loading-section') as HTMLDivElement,
    userAvatarEdit: document.getElementById('user-avatar-edit') as HTMLImageElement,
    avatarPlaceholderEdit: document.getElementById('avatar-placeholder-edit') as HTMLDivElement,
    editBio: document.getElementById('edit-bio') as HTMLTextAreaElement,
    editTelegram: document.getElementById('edit-telegram') as HTMLInputElement,
    editLinkedin: document.getElementById('edit-linkedin') as HTMLInputElement,
    editVk: document.getElementById('edit-vk') as HTMLInputElement,
    editInstagram: document.getElementById('edit-instagram') as HTMLInputElement,
    saveProfileBtn: document.getElementById('save-profile-btn') as HTMLButtonElement,
    cancelEditBtn: document.getElementById('cancel-edit-btn') as HTMLButtonElement,
    profileAvatar: document.getElementById('profile-avatar') as HTMLImageElement,
    avatarPlaceholderLarge: document.getElementById('avatar-placeholder-large') as HTMLDivElement,
    profileName: document.getElementById('profile-name') as HTMLHeadingElement,
    profileUsername: document.getElementById('profile-username') as HTMLParagraphElement,
    profileBio: document.getElementById('profile-bio') as HTMLParagraphElement,
    profileLinks: document.getElementById('profile-links') as HTMLDivElement
};

let currentUser: any = null;

async function initializeApp(): Promise<void> {
    try {
        showLoading(true);
        
        const tg = (window as any).Telegram.WebApp;
        tg.expand();
        
        const telegramUser = tg.initDataUnsafe?.user;
        
        if (!telegramUser) {
            throw new Error('Не удалось получить данные пользователя');
        }
        
        // Авторизация на бэкенде
        const response = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telegramUser)
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка бэкенда: ${response.status}`);
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Показываем профиль
        renderProfile(currentUser);
        showLoading(false);
        showScreen('main');
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка загрузки приложения');
        showLoading(false);
    }
}

function renderProfile(user: any): void {
    if (!user) return;
    
    // Аватар в шапке
    renderAvatar(elements.userAvatar, elements.avatarPlaceholderSmall, user);
    
    // Имя в шапке
    elements.userNameHeader.textContent = user.first_name || 'Пользователь';
    
    // Аватар в профиле
    renderAvatar(elements.profileAvatar, elements.avatarPlaceholderLarge, user);
    
    // Имя и юзернейм в профиле
    elements.profileName.textContent = `${user.first_name} ${user.last_name || ''}`.trim();
    elements.profileUsername.textContent = user.username ? `@${user.username}` : '';
    
    // Био
    elements.profileBio.textContent = user.bio || 'Пока ничего не рассказал о себе';
    
    // Ссылки
    renderLinks(user.links);
}

function renderAvatar(imgElement: HTMLImageElement, placeholder: HTMLDivElement, user: any): void {
    if (user.photo_url) {
        imgElement.src = user.photo_url;
        imgElement.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        const firstLetter = user.first_name ? user.first_name[0].toUpperCase() : 'U';
        placeholder.textContent = firstLetter;
        imgElement.style.display = 'none';
        placeholder.style.display = 'flex';
    }
}

function renderLinks(links: any): void {
    if (!links) return;
    
    const linksHTML = [];
    
    if (links.telegram) {
        linksHTML.push(`
            <a href="${formatTelegramUrl(links.telegram)}" class="profile-link" target="_blank">
                <span class="profile-link-icon">📱</span>
                <span>Telegram: ${links.telegram}</span>
            </a>
        `);
    }
    
    if (links.linkedin) {
        linksHTML.push(`
            <a href="${formatUrl(links.linkedin, 'https://')}" class="profile-link" target="_blank">
                <span class="profile-link-icon">💼</span>
                <span>LinkedIn</span>
            </a>
        `);
    }
    
    if (links.vk) {
        linksHTML.push(`
            <a href="${formatUrl(links.vk, 'https://')}" class="profile-link" target="_blank">
                <span class="profile-link-icon">👥</span>
                <span>VK</span>
            </a>
        `);
    }
    
    if (links.instagram) {
        linksHTML.push(`
            <a href="${formatUrl(links.instagram, 'https://')}" class="profile-link" target="_blank">
                <span class="profile-link-icon">📸</span>
                <span>Instagram</span>
            </a>
        `);
    }
    
    if (linksHTML.length === 0) {
        linksHTML.push('<p style="color: #666; text-align: center;">Ссылки не добавлены</p>');
    }
    
    elements.profileLinks.innerHTML = linksHTML.join('');
}

function formatTelegramUrl(username: string): string {
    if (username.startsWith('@')) {
        return `https://t.me/${username.slice(1)}`;
    }
    if (username.startsWith('http')) {
        return username;
    }
    return `https://t.me/${username}`;
}

function formatUrl(url: string, protocol: string): string {
    if (url.startsWith('http')) {
        return url;
    }
    return protocol + url;
}

function showEditProfile(): void {
    if (!currentUser) return;
    
    // Заполняем форму редактирования
    renderAvatar(elements.userAvatarEdit, elements.avatarPlaceholderEdit, currentUser);
    
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
            throw new Error('Ошибка сохранения');
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Обновляем профиль
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
        showError('Не удалось сохранить изменения');
    } finally {
        elements.saveProfileBtn.disabled = false;
        elements.saveProfileBtn.textContent = 'Сохранить';
    }
}

// Остальные функции остаются без изменений
function showScreen(screen: 'main' | 'edit'): void {
    elements.mainScreen.style.display = screen === 'main' ? 'block' : 'none';
    elements.editProfileScreen.style.display = screen === 'edit' ? 'block' : 'none';
}

function showLoading(show: boolean): void {
    elements.loadingSection.classList.toggle('show', show);
}

function showError(message: string): void {
    const tg = (window as any).Telegram.WebApp;
    tg.showPopup({
        title: 'Ошибка',
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

function setupEventListeners(): void {
    elements.userAvatar.addEventListener('click', showEditProfile);
    elements.avatarPlaceholderSmall.addEventListener('click', showEditProfile);
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    elements.cancelEditBtn.addEventListener('click', () => showScreen('main'));
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
});