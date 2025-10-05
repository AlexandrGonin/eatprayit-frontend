// Конфигурация
const CONFIG = {
    BACKEND_URL: 'https://eatprayit-backend.onrender.com'
};

// Элементы DOM
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
    saveProfileBtn: document.getElementById('save-profile-btn') as HTMLButtonElement,
    cancelEditBtn: document.getElementById('cancel-edit-btn') as HTMLButtonElement
};

let currentUser: any = null;

// Главная функция
async function initializeApp(): Promise<void> {
    try {
        showLoading(true);
        
        console.log('🚀 Запуск приложения...');
        
        // Проверяем доступность бэкенда
        console.log('🔗 Проверяем бэкенд:', CONFIG.BACKEND_URL);
        
        const healthCheck = await fetch(`${CONFIG.BACKEND_URL}/health`);
        console.log('❤️ Health check:', healthCheck.status);
        
        if (!healthCheck.ok) {
            throw new Error('Бэкенд недоступен');
        }
        
        // Инициализация Telegram
        const tg = (window as any).Telegram.WebApp;
        if (!tg) {
            throw new Error('Telegram WebApp не загружен');
        }
        
        tg.expand();
        tg.ready();
        
        // Получаем данные пользователя
        const telegramUser = tg.initDataUnsafe?.user;
        console.log('👤 Данные Telegram:', telegramUser);
        
        if (!telegramUser) {
            throw new Error('Данные пользователя не получены');
        }
        
        // Авторизация на бэкенде
        console.log('🔐 Отправляем данные на бэкенд...');
        const response = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telegramUser)
        });
        
        console.log('📡 Ответ бэкенда:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка бэкенда:', errorText);
            throw new Error(`Ошибка бэкенда: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Данные пользователя:', data);
        
        currentUser = data.user;
        
        // Показываем интерфейс
        renderHeader(currentUser);
        showLoading(false);
        showScreen('main');
        
        console.log('✅ Приложение успешно запущено');
        
    } catch (error) {
        console.error('💥 Ошибка инициализации:', error);
        
        // Показываем пользователю понятную ошибку
        let errorMessage = 'Ошибка загрузки приложения';
        
        if (error instanceof Error) {
            if (error.message.includes('Бэкенд недоступен')) {
                errorMessage = 'Сервер временно недоступен. Попробуйте позже.';
            } else if (error.message.includes('Telegram WebApp')) {
                errorMessage = 'Ошибка загрузки Telegram. Открите в приложении Telegram.';
            } else if (error.message.includes('Данные пользователя')) {
                errorMessage = 'Не удалось получить данные профиля.';
            }
        }
        
        showError(errorMessage);
        showLoading(false);
    }
}

// Показываем данные в шапке
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

// Переключение экранов
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

// Показать экран редактирования
function showEditProfile(): void {
    if (!currentUser) return;
    
    // Заполняем форму
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
            throw new Error(`Ошибка сохранения: ${response.status}`);
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Показываем уведомление
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
        showError('Не удалось сохранить изменения');
    } finally {
        elements.saveProfileBtn.disabled = false;
        elements.saveProfileBtn.textContent = 'Сохранить';
    }
}

// Назначаем обработчики событий
function setupEventListeners(): void {
    elements.userAvatar.addEventListener('click', showEditProfile);
    elements.avatarPlaceholderSmall.addEventListener('click', showEditProfile);
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    elements.cancelEditBtn.addEventListener('click', () => showScreen('main'));
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен');
    setupEventListeners();
    initializeApp();
});