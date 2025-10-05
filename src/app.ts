// Конфигурация
const CONFIG = {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
};

// Элементы DOM
const elements = {
    // Шапка
    userAvatar: document.getElementById('user-avatar') as HTMLImageElement,
    avatarPlaceholderSmall: document.getElementById('avatar-placeholder-small') as HTMLDivElement,
    userNameHeader: document.getElementById('user-name-header') as HTMLHeadingElement,
    
    // Экраны
    mainScreen: document.getElementById('main-screen') as HTMLDivElement,
    editProfileScreen: document.getElementById('edit-profile-screen') as HTMLDivElement,
    loadingSection: document.getElementById('loading-section') as HTMLDivElement,
    
    // Редактирование профиля
    userAvatarEdit: document.getElementById('user-avatar-edit') as HTMLImageElement,
    avatarPlaceholderEdit: document.getElementById('avatar-placeholder-edit') as HTMLDivElement,
    editBio: document.getElementById('edit-bio') as HTMLTextAreaElement,
    saveProfileBtn: document.getElementById('save-profile-btn') as HTMLButtonElement,
    cancelEditBtn: document.getElementById('cancel-edit-btn') as HTMLButtonElement
};

// Текущий пользователь
let currentUser: any = null;

// Типы
interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

// Главная функция
async function initializeApp(): Promise<void> {
    try {
        showLoading(true);
        
        // Инициализация Telegram
        const tg = (window as any).Telegram.WebApp;
        tg.expand();
        
        // Получаем данные пользователя
        const telegramUser: TelegramUser | undefined = tg.initDataUnsafe?.user;
        
        if (!telegramUser) {
            throw new Error('Не удалось получить данные пользователя');
        }
        
        console.log('Telegram user:', telegramUser);
        
        // Авторизуем пользователя на бэкенде
        currentUser = await authenticateUser(telegramUser);
        
        // Показываем данные в шапке
        renderHeader(currentUser);
        
        showLoading(false);
        showScreen('main');
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка загрузки приложения');
        showLoading(false);
    }
}

// Авторизация пользователя
async function authenticateUser(telegramUser: TelegramUser): Promise<any> {
    const response = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramUser)
    });
    
    if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
    }
    
    const data = await response.json();
    return data.user;
}

// Показываем данные в шапке
function renderHeader(user: any): void {
    // Аватар в шапке
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
    
    // Имя в шапке
    elements.userNameHeader.textContent = user.first_name;
}

// Показываем экран редактирования
function showEditProfile(): void {
    if (!currentUser) return;
    
    // Заполняем форму редактирования
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
    
    elements.editBio.value = currentUser.bio || '';
    
    showScreen('edit');
}

// Переключение между экранами
function showScreen(screen: 'main' | 'edit'): void {
    if (screen === 'main') {
        elements.mainScreen.style.display = 'block';
        elements.editProfileScreen.style.display = 'none';
    } else {
        elements.mainScreen.style.display = 'none';
        elements.editProfileScreen.style.display = 'block';
    }
}

// Показать/скрыть загрузку
function showLoading(show: boolean): void {
    if (show) {
        elements.loadingSection.classList.add('show');
        elements.mainScreen.style.display = 'none';
        elements.editProfileScreen.style.display = 'none';
    } else {
        elements.loadingSection.classList.remove('show');
    }
}

// Показать ошибку
function showError(message: string): void {
    const tg = (window as any).Telegram.WebApp;
    tg.showPopup({
        title: 'Ошибка',
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

// Сохранение профиля
async function saveProfile(): Promise<void> {
    try {
        elements.saveProfileBtn.disabled = true;
        elements.saveProfileBtn.textContent = 'Сохранение...';
        
        if (!currentUser) {
            throw new Error('Нет данных пользователя');
        }
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/profile/${currentUser.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bio: elements.editBio.value
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка ${response.status}`);
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Показываем уведомление об успехе
        const tg = (window as any).Telegram.WebApp;
        tg.showPopup({
            title: 'Успех',
            message: 'Профиль обновлен',
            buttons: [{ type: 'ok' }]
        });
        
        // Возвращаемся на главный экран
        showScreen('main');
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
        elements.saveProfileBtn.disabled = false;
        elements.saveProfileBtn.textContent = 'Сохранить';
    }
}

// Назначаем обработчики событий
function setupEventListeners(): void {
    // Клик по аватару в шапке - открыть редактирование
    elements.userAvatar.addEventListener('click', showEditProfile);
    elements.avatarPlaceholderSmall.addEventListener('click', showEditProfile);
    
    // Кнопка сохранения
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    
    // Кнопка отмены
    elements.cancelEditBtn.addEventListener('click', () => {
        showScreen('main');
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
});