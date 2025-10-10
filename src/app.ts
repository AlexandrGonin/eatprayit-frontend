const CONFIG = {
    BACKEND_URL: 'https://eatprayit-backend.onrender.com'
};

interface User {
    id: number;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    bio?: string;
    position?: string;
    coins?: number;
    is_active?: boolean;
    links?: {
        telegram?: string;
        linkedin?: string;
        vk?: string;
        instagram?: string;
    };
}

interface Event {
    id: number;
    title: string;
    short_description: string;
    description?: string;
    date: string;
    time: string;
    location: string;
    event_type?: string;
}

interface EventsResponse {
    success: boolean;
    events: Event[];
    totalPages: number;
    currentPage: number;
    hasAccess: boolean;
}

// Функция для безопасного получения элементов
function getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with id '${id}' not found`);
    }
    return element;
}

const elements = {
    userAvatar: document.getElementById('user-avatar') as HTMLImageElement,
    avatarPlaceholderSmall: document.getElementById('avatar-placeholder-small') as HTMLDivElement,
    userNameHeader: document.getElementById('user-name-header') as HTMLHeadingElement,
    mainScreen: getElement('main-screen'),
    profileScreen: getElement('profile-screen'),
    editProfileScreen: getElement('edit-profile-screen'),
    eventDetailScreen: getElement('event-detail-screen'),
    loadingSection: getElement('loading-section'),
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
    backToMainFromProfileBtn: document.getElementById('back-to-main-from-profile-btn') as HTMLButtonElement,
    profileAvatar: document.getElementById('profile-avatar') as HTMLImageElement,
    avatarPlaceholderLarge: document.getElementById('avatar-placeholder-large') as HTMLDivElement,
    profileName: document.getElementById('profile-name') as HTMLHeadingElement,
    profileUsername: document.getElementById('profile-username') as HTMLParagraphElement,
    profilePosition: document.getElementById('profile-position') as HTMLParagraphElement,
    profileBio: document.getElementById('profile-bio') as HTMLParagraphElement,
    profileCoins: document.getElementById('profile-coins') as HTMLParagraphElement,
    profileLinks: document.getElementById('profile-links') as HTMLDivElement,
    eventsList: document.getElementById('events-list') as HTMLDivElement,
    noAccessMessage: document.getElementById('no-access-message') as HTMLDivElement,
    eventDetailContent: document.getElementById('event-detail-content') as HTMLDivElement,
    pagination: document.getElementById('pagination') as HTMLDivElement
};

let currentUser: User | null = null;
let currentEvents: Event[] = [];
let currentPage = 1;
let totalPages = 1;

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
            console.error('❌ Не удалось получить telegramUser:', tg.initDataUnsafe);
            throw new Error('Не удалось получить данные пользователя из Telegram. Убедитесь, что Mini App запущен внутри Telegram.');
        }

        console.log('🔍 Получен пользователь Telegram:', telegramUser);

        // ПРОВЕРКА ДОСТУПА К MINI APP
        console.log('🔐 Проверяем доступ пользователя...', telegramUser.id);
        const accessCheck = await fetch(`${CONFIG.BACKEND_URL}/check-access`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: telegramUser.id
            })
        });
        
        console.log('📡 Ответ check-access:', accessCheck.status);
        
        if (!accessCheck.ok) {
            const errorText = await accessCheck.text();
            console.error('❌ Ошибка check-access:', errorText);
            throw new Error(`Ошибка сервера: ${accessCheck.status}`);
        }
        
        const accessData = await accessCheck.json();
        console.log('📊 Данные доступа:', accessData);
        
        if (!accessData.hasAccess) {
            console.error('❌ Пользователь не найден в системе');
            throw new Error('Пользователь не найден. Зарегистрируйтесь через Telegram бота.');
        }

        console.log('✅ Доступ разрешен, загружаем профиль...');
        
        // Авторизация на бэкенде
        const authResponse = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telegramUser)
        });
        
        console.log('📡 Ответ auth/telegram:', authResponse.status);
        
        if (!authResponse.ok) {
            const errorData = await authResponse.json().catch(() => ({ error: 'Ошибка сервера' }));
            console.error('❌ Ошибка авторизации:', errorData);
            throw new Error(errorData.error || `Ошибка бэкенда: ${authResponse.status}`);
        }
        
        const authData = await authResponse.json();
        console.log('📊 Данные авторизации:', authData);
        
        currentUser = authData.user;
        
        // Показываем шапку и загружаем события
        renderHeader(currentUser);
        await loadEvents(1); // Загружаем первую страницу
        showLoading(false);
        showScreen('main');
        
    } catch (error) {
        console.error('💥 Ошибка инициализации:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки приложения';
        showError(errorMessage);
        showLoading(false);
    }
}

async function loadEvents(page: number): Promise<void> {
    try {
        if (!currentUser) return;

        const response = await fetch(`${CONFIG.BACKEND_URL}/events/${currentUser.telegram_id}?page=${page}&limit=10`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
            
            if (response.status === 403) {
                renderNoAccessScreen();
                return;
            }
            
            throw new Error(errorData.error || `Ошибка ${response.status}`);
        }
        
        const data: EventsResponse = await response.json();
        currentEvents = data.events;
        currentPage = data.currentPage;
        totalPages = data.totalPages;
        
        renderEvents(currentEvents);
        renderPagination();
        
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить события';
        showError(errorMessage);
    }
}

function renderEvents(events: Event[]): void {
    const eventsList = elements.eventsList;
    
    if (!events || events.length === 0) {
        eventsList.innerHTML = `
            <div class="no-events">
                <div class="no-events-icon">📅</div>
                <h3>Нет мероприятий</h3>
                <p>На данный момент нет запланированных мероприятий</p>
            </div>
        `;
        return;
    }
    
    const eventsHTML = events.map((event, index) => `
        <div class="event-card" data-event-index="${index}">
            <div class="event-content">
                <div class="event-main">
                    <h3 class="event-title">${escapeHtml(event.title)}</h3>
                    <p class="event-short-desc">${escapeHtml(event.short_description)}</p>
                </div>
                <div class="event-details">
                    <div class="event-date">
                        <span class="event-date-day">${formatEventDate(event.date)}</span>
                        <span class="event-date-month">${formatEventMonth(event.date)}</span>
                    </div>
                    <div class="event-time-location">
                        <div class="event-time">🕒 ${event.time.slice(0, 5)}</div>
                        <div class="event-location">📍 ${escapeHtml(event.location)}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    eventsList.innerHTML = eventsHTML;
    elements.noAccessMessage.style.display = 'none';
    eventsList.style.display = 'block';
    
    // Добавляем обработчики для карточек событий
    setTimeout(() => {
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
            card.addEventListener('click', () => {
                const eventIndex = parseInt(card.getAttribute('data-event-index') || '0');
                showEventDetail(eventIndex);
            });
        });
    }, 100);
}

function renderPagination(): void {
    const pagination = elements.pagination;
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    let paginationHTML = '';
    
    // Кнопка "Назад"
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn prev-btn" data-page="${currentPage - 1}">← Назад</button>`;
    } else {
        paginationHTML += `<button class="page-btn prev-btn disabled" disabled>← Назад</button>`;
    }
    
    // Номера страниц
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-btn page-number active" data-page="${i}">${i}</button>`;
        } else {
            paginationHTML += `<button class="page-btn page-number" data-page="${i}">${i}</button>`;
        }
    }
    
    // Кнопка "Вперед"
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn next-btn" data-page="${currentPage + 1}">Вперед →</button>`;
    } else {
        paginationHTML += `<button class="page-btn next-btn disabled" disabled>Вперед →</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // Добавляем обработчики для пагинации
    setTimeout(() => {
        const pageButtons = document.querySelectorAll('.page-btn:not(.disabled)');
        pageButtons.forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.getAttribute('data-page') || '1');
                loadEvents(page);
            });
        });
    }, 100);
}

function showEventDetail(eventIndex: number): void {
    if (!currentEvents[eventIndex]) return;
    
    const event = currentEvents[eventIndex];
    renderEventDetail(event);
    showScreen('event-detail');
}

function renderEventDetail(event: Event): void {
    const eventDetailContent = elements.eventDetailContent;
    
    eventDetailContent.innerHTML = `
        <div class="event-detail-card">
            <div class="event-detail-header">
                <h1 class="event-detail-title">${escapeHtml(event.title)}</h1>
                <div class="event-detail-date-badge">
                    <div class="event-detail-date">
                        <span class="event-detail-day">${formatEventDate(event.date)}</span>
                        <span class="event-detail-month">${formatEventMonth(event.date)}</span>
                    </div>
                </div>
            </div>
            
            <div class="event-detail-info">
                <div class="event-detail-item">
                    <span class="event-detail-icon">🕒</span>
                    <div class="event-detail-text">
                        <strong>Время</strong>
                        <span>${event.time.slice(0, 5)}</span>
                    </div>
                </div>
                
                <div class="event-detail-item">
                    <span class="event-detail-icon">📍</span>
                    <div class="event-detail-text">
                        <strong>Место</strong>
                        <span>${escapeHtml(event.location)}</span>
                    </div>
                </div>
                
                ${event.event_type ? `
                <div class="event-detail-item">
                    <span class="event-detail-icon">🎯</span>
                    <div class="event-detail-text">
                        <strong>Тип мероприятия</strong>
                        <span>${escapeHtml(event.event_type)}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="event-detail-description">
                <h3>Описание</h3>
                <p>${escapeHtml(event.description || event.short_description)}</p>
            </div>
        </div>
    `;
}

function renderNoAccessScreen(): void {
    elements.eventsList.style.display = 'none';
    elements.pagination.style.display = 'none';
    elements.noAccessMessage.style.display = 'block';
}

function renderHeader(user: User | null): void {
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

function formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.getDate().toString();
}

function formatEventMonth(dateString: string): string {
    const date = new Date(dateString);
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return months[date.getMonth()];
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showProfile(): void {
    if (!currentUser) return;
    renderProfile(currentUser);
    showScreen('profile');
}

function renderProfile(user: User | null): void {
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
    elements.profilePosition.textContent = user.position || 'Должность не указана';
    elements.profileBio.textContent = user.bio || 'Пока ничего не рассказал о себе';
    elements.profileCoins.textContent = `${user.coins || 0} монет`;
    
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
                <span class="link-icon">📱</span>
                <span class="link-text">Telegram: ${displayName}</span>
            </a>
        `);
    }
    
    if (links.linkedin && links.linkedin.trim() !== '') {
        hasLinks = true;
        linksHTML.push(`
            <a href="${links.linkedin}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span class="link-icon">💼</span>
                <span class="link-text">LinkedIn</span>
            </a>
        `);
    }
    
    if (links.vk && links.vk.trim() !== '') {
        hasLinks = true;
        linksHTML.push(`
            <a href="${links.vk}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span class="link-icon">👥</span>
                <span class="link-text">VK</span>
            </a>
        `);
    }
    
    if (links.instagram && links.instagram.trim() !== '') {
        hasLinks = true;
        linksHTML.push(`
            <a href="${links.instagram}" class="profile-link" target="_blank" rel="noopener noreferrer">
                <span class="link-icon">📸</span>
                <span class="link-text">Instagram</span>
            </a>
        `);
    }
    
    if (!hasLinks) {
        linksHTML.push('<p class="no-links">Ссылки не добавлены</p>');
    }
    
    elements.profileLinks.innerHTML = linksHTML.join('');
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
            links: {
                telegram: elements.editTelegram.value,
                linkedin: elements.editLinkedin.value,
                vk: elements.editVk.value,
                instagram: elements.editInstagram.value
            }
        };
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/profile/${currentUser.telegram_id}`, {
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

function showScreen(screen: 'main' | 'profile' | 'edit' | 'event-detail'): void {
    elements.mainScreen.style.display = screen === 'main' ? 'block' : 'none';
    elements.profileScreen.style.display = screen === 'profile' ? 'block' : 'none';
    elements.editProfileScreen.style.display = screen === 'edit' ? 'block' : 'none';
    elements.eventDetailScreen.style.display = screen === 'event-detail' ? 'block' : 'none';
}

function showLoading(show: boolean): void {
    if (show) {
        elements.loadingSection.classList.add('show');
        elements.mainScreen.style.display = 'none';
        elements.profileScreen.style.display = 'none';
        elements.editProfileScreen.style.display = 'none';
        elements.eventDetailScreen.style.display = 'none';
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
    elements.backToMainFromProfileBtn.addEventListener('click', () => showScreen('main'));
    elements.saveProfileBtn.addEventListener('click', saveProfile);
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
});

export {};