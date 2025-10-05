// Конфигурация приложения
const CONFIG = {
    BACKEND_URL: 'https://your-backend.onrender.com' // ЗАМЕНИТЕ после деплоя
};

// Получаем элементы страницы
const profileCard = document.querySelector('.profile-card') as HTMLDivElement;
const loadingSection = document.getElementById('loading-section') as HTMLDivElement;
const userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
const avatarPlaceholder = document.getElementById('avatar-placeholder') as HTMLDivElement;
const userName = document.getElementById('user-name') as HTMLHeadingElement;
const userUsername = document.getElementById('user-username') as HTMLParagraphElement;
const userBio = document.getElementById('user-bio') as HTMLTextAreaElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

// Типы для TypeScript
interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

// Главная функция - запускается при загрузке страницы
async function main() {
    try {
        showLoading(true);
        
        // Инициализация Telegram Web App
        const tg = (window as any).Telegram.WebApp;
        tg.expand(); // Раскрываем на весь экран
        
        // Получаем данные пользователя из Telegram
        const tgUser: TelegramUser | undefined = tg.initDataUnsafe?.user;
        
        if (!tgUser) {
            throw new Error('Не получили данные пользователя');
        }
        
        console.log('Пользователь Telegram:', tgUser);
        
        // Отправляем данные на бэкенд
        const response = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tgUser)
        });
        
        if (!response.ok) {
            throw new Error('Ошибка бэкенда');
        }
        
        const data = await response.json();
        const user = data.user;
        
        // Показываем данные пользователя
        showUserData(user);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при загрузке');
        showLoading(false);
    }
}

// Функция показа данных пользователя
function showUserData(user: any) {
    // Аватар
    if (user.photo_url) {
        userAvatar.src = user.photo_url;
        userAvatar.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    } else {
        const firstLetter = user.first_name ? user.first_name[0].toUpperCase() : 'U';
        avatarPlaceholder.textContent = firstLetter;
        userAvatar.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
    }
    
    // Имя
    userName.textContent = `${user.first_name} ${user.last_name || ''}`.trim();
    
    // Юзернейм
    if (user.username) {
        userUsername.textContent = `@${user.username}`;
    } else {
        userUsername.textContent = '';
    }
    
    // Био
    userBio.value = user.bio || '';
}

// Функция показа/скрытия загрузки
function showLoading(show: boolean) {
    if (show) {
        loadingSection.classList.add('show');
        profileCard.style.display = 'none';
    } else {
        loadingSection.classList.remove('show');
        profileCard.style.display = 'block';
    }
}

// Обработчик кнопки сохранения
saveBtn.addEventListener('click', async () => {
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем...';
        
        const tg = (window as any).Telegram.WebApp;
        const tgUser: TelegramUser | undefined = tg.initDataUnsafe?.user;
        
        if (!tgUser) {
            throw new Error('Нет данных пользователя');
        }
        
        // Отправляем обновление на бэкенд
        const response = await fetch(`${CONFIG.BACKEND_URL}/profile/${tgUser.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bio: userBio.value
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка сохранения');
        }
        
        // Показываем уведомление
        tg.showPopup({
            title: 'Успех!',
            message: 'Данные сохранены',
            buttons: [{ type: 'ok' }]
        });
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка при сохранении');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Сохранить';
    }
});

// Запускаем приложение когда страница загрузилась
document.addEventListener('DOMContentLoaded', main);