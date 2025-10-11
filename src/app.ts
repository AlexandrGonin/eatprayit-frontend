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
    userCoinsHeader: document.getElementById('user-coins-header') as HTMLDivElement,
    
    mainScreen: getElement('main-screen'),
    profileScreen: getElement('profile-screen'),
    editProfileScreen: getElement('edit-profile-screen'),
    eventDetailScreen: getElement('event-detail-screen'),
    filtersScreen: getElement('filters-screen'),
    loadingSection: getElement('loading-section'),
    
    filterBtn: document.getElementById('filter-btn') as HTMLButtonElement,
    backToMainBtn: document.getElementById('back-to-main-btn') as HTMLButtonElement,
    backToMainFromProfile: document.getElementById('back-to-main-from-profile') as HTMLButtonElement,
    backToProfileBtn: document.getElementById('back-to-profile-btn') as HTMLButtonElement,
    backToMainFromFilters: document.getElementById('back-to-main-from-filters') as HTMLButtonElement,
    saveProfileBtn: document.getElementById('save-profile-btn') as HTMLButtonElement,
    applyFilters: document.getElementById('apply-filters') as HTMLButtonElement,
    resetFilters: document.getElementById('reset-filters') as HTMLButtonElement,
    
    userAvatarEdit: document.getElementById('user-avatar-edit') as HTMLImageElement,
    avatarPlaceholderEdit: document.getElementById('avatar-placeholder-edit') as HTMLDivElement,
    editPosition: document.getElementById('edit-position') as HTMLInputElement,
    editBio: document.getElementById('edit-bio') as HTMLTextAreaElement,
    editTelegram: document.getElementById('edit-telegram') as HTMLInputElement,
    editLinkedin: document.getElementById('edit-linkedin') as HTMLInputElement,
    editVk: document.getElementById('edit-vk') as HTMLInputElement,
    editInstagram: document.getElementById('edit-instagram') as HTMLInputElement,
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
    loadingMore: document.getElementById('loading-more') as HTMLDivElement,
    eventDetailContent: document.getElementById('event-detail-content') as HTMLDivElement,
    
    eventTypes: document.getElementById('event-types') as HTMLDivElement
};

let currentUser: User | null = null;
let currentEvents: Event[] = [];
let allEventTypes: string[] = [];
let selectedEventTypes: string[] = [];
let currentPage = 0;
const EVENTS_PER_PAGE = 20;
let isLoading = false;
let hasMoreEvents = true;

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
            throw new Error('Не удалось получить данные пользователя из Telegram.');
        }

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
            throw new Error(`Ошибка сервера: ${accessCheck.status}`);
        }
        
        const accessData = await accessCheck.json();
        
        if (!accessData.hasAccess) {
            throw new Error('Пользователь не найден. Зарегистрируйтесь через Telegram бота.');
        }

        const authResponse = await fetch(`${CONFIG.BACKEND_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telegramUser)
        });
        
        if (!authResponse.ok) {
            throw new Error('Ошибка авторизации');
        }
        
        const authData = await authResponse.json();
        currentUser = authData.user;
        
        renderHeader(currentUser);
        setupEventListeners();
        
        await loadEventTypes();
        await loadEvents(true);
        
        showLoading(false);
        showScreen('main');
        
    } catch (error) {
        console.error('💥 Ошибка инициализации:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки приложения';
        showError(errorMessage);
        showLoading(false);
    }
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
    elements.userCoinsHeader.innerHTML = `🪙 ${user.coins || 0}`;
}

async function loadEventTypes(): Promise<void> {
    try {
        if (!currentUser) return;
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/events/types/${currentUser.telegram_id}`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки типов событий');
        }
        
        const data = await response.json();
        allEventTypes = data.types || [];
        renderEventTypes();
        
    } catch (error) {
        console.error('Ошибка загрузки типов событий:', error);
        showError('Не удалось загрузить типы мероприятий');
    }
}

function renderEventTypes(): void {
    const eventTypesContainer = elements.eventTypes;
    
    if (!allEventTypes || allEventTypes.length === 0) {
        eventTypesContainer.innerHTML = '<p class="no-links">Типы мероприятий не найдены</p>';
        return;
    }
    
    const typesHTML = allEventTypes.map(type => `
        <label class="event-type-checkbox">
            <input type="checkbox" value="${escapeHtml(type)}" ${selectedEventTypes.includes(type) ? 'checked' : ''}>
            <span class="event-type-label">${escapeHtml(type)}</span>
        </label>
    `).join('');
    
    eventTypesContainer.innerHTML = typesHTML;
}

async function loadEvents(initialLoad = false): Promise<void> {
    if (isLoading || (!initialLoad && !hasMoreEvents)) return;
    
    try {
        isLoading = true;
        
        if (initialLoad) {
            currentPage = 0;
            currentEvents = [];
            elements.eventsList.innerHTML = '';
            showLoadingMore(false);
        } else {
            showLoadingMore(true);
        }
        
        if (!currentUser) {
            throw new Error('Нет данных пользователя');
        }
        
        const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: EVENTS_PER_PAGE.toString()
        });
        
        if (selectedEventTypes.length > 0) {
            selectedEventTypes.forEach(type => {
                params.append('types', type);
            });
        }
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/events/${currentUser.telegram_id}?${params}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
            
            if (response.status === 403) {
                renderNoAccessScreen();
                return;
            }
            
            throw new Error(errorData.error || `Ошибка ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.events && data.events.length > 0) {
            if (initialLoad) {
                currentEvents = data.events;
            } else {
                currentEvents = [...currentEvents, ...data.events];
            }
            
            renderEvents(currentEvents);
            currentPage++;
            hasMoreEvents = data.events.length === EVENTS_PER_PAGE;
        } else {
            if (initialLoad) {
                renderNoEvents();
            }
            hasMoreEvents = false;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        if (initialLoad) {
            showError('Не удалось загрузить мероприятия');
        }
    } finally {
        isLoading = false;
        showLoadingMore(false);
        if (initialLoad) {
            showLoading(false);
        }
    }
}

function renderEvents(events: Event[]): void {
    const eventsList = elements.eventsList;
    const eventsListContainer = document.querySelector('.events-list-container') as HTMLElement;
    
    if (eventsListContainer) {
        eventsListContainer.style.display = 'block';
    }
    
    if (events.length === 0) {
        renderNoEvents();
        return;
    }
    
    const eventsHTML = events.map((event, index) => `
        <div class="event-card" data-event-index="${index}">
            <div class="event-content">
                <div class="event-date-badge">
                    <span class="event-date-day">${formatEventDate(event.date)}</span>
                    <span class="event-date-month">${formatEventMonth(event.date)}</span>
                </div>
                <div class="event-main">
                    <div class="event-header">
                        <h3 class="event-title">${escapeHtml(event.title)}</h3>
                        ${event.event_type ? `<span class="event-type">${escapeHtml(event.event_type)}</span>` : ''}
                    </div>
                    <p class="event-short-desc">${escapeHtml(event.short_description)}</p>
                    <div class="event-details">
                        <div class="event-detail-item time">🕒 ${event.time.slice(0, 5)}</div>
                        <div class="event-detail-item location">📍 ${escapeHtml(event.location)}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    if (currentPage === 1) {
        eventsList.innerHTML = eventsHTML;
    } else {
        eventsList.innerHTML += eventsHTML;
    }
    
    elements.noAccessMessage.style.display = 'none';
    
    setTimeout(() => {
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
            card.addEventListener('click', () => {
                const eventIndex = parseInt(card.getAttribute('data-event-index') || '0');
                showEventDetail(eventIndex);
            });
        });
    }, 100);
    
    setupInfiniteScroll();
}

function setupInfiniteScroll(): void {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMoreEvents && !isLoading) {
                loadEvents(false);
            }
        });
    });
    
    const eventCards = document.querySelectorAll('.event-card');
    if (eventCards.length > 0) {
        observer.observe(eventCards[eventCards.length - 1]);
    }
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
        <div class="event-detail-hero">
            <div class="event-detail-header">
                <div class="event-detail-date-badge">
                    <span class="event-detail-day">${formatEventDate(event.date)}</span>
                    <span class="event-detail-month">${formatEventMonth(event.date)}</span>
                </div>
                <div class="event-detail-title-section">
                    <h1 class="event-detail-title">${escapeHtml(event.title)}</h1>
                    ${event.event_type ? `<span class="event-detail-type">${escapeHtml(event.event_type)}</span>` : ''}
                </div>
            </div>
            
            <div class="event-detail-info-grid">
                <div class="event-detail-info-item">
                    <span class="event-detail-info-icon">🕒</span>
                    <div class="event-detail-info-content">
                        <div class="event-detail-info-label">Время</div>
                        <div class="event-detail-info-value">${event.time.slice(0, 5)}</div>
                    </div>
                </div>
                
                <div class="event-detail-info-item">
                    <span class="event-detail-info-icon">📍</span>
                    <div class="event-detail-info-content">
                        <div class="event-detail-info-label">Место</div>
                        <div class="event-detail-info-value">${escapeHtml(event.location)}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="event-detail-content">
            <div class="event-detail-section">
                <h3 class="event-detail-section-title">Описание</h3>
                <p class="event-detail-description">${escapeHtml(event.description || event.short_description)}</p>
            </div>
        </div>
    `;
}

function renderNoAccessScreen(): void {
    const eventsListContainer = document.querySelector('.events-list-container') as HTMLElement;
    if (eventsListContainer) {
        eventsListContainer.style.display = 'none';
    }
    elements.noAccessMessage.style.display = 'block';
}

function renderNoEvents(): void {
    const eventsListContainer = document.querySelector('.events-list-container') as HTMLElement;
    if (eventsListContainer) {
        eventsListContainer.style.display = 'block';
    }
    
    elements.eventsList.innerHTML = `
        <div class="no-events-state">
            <div class="no-events-icon">📅</div>
            <h3 class="no-events-title">Нет мероприятий</h3>
            <p class="no-events-subtitle">По выбранным фильтрам мероприятия не найдены</p>
        </div>
    `;
}

function showFilters(): void {
    showScreen('filters');
}

function applyFilters(): void {
    selectedEventTypes = [];
    const checkboxes = elements.eventTypes.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach((checkbox: Element) => {
        if (checkbox instanceof HTMLInputElement) {
            selectedEventTypes.push(checkbox.value);
        }
    });
    
    console.log('Применены фильтры:', selectedEventTypes);
    showScreen('main');
    
    currentPage = 0;
    hasMoreEvents = true;
    loadEvents(true);
}

function resetFilters(): void {
    selectedEventTypes = [];
    renderEventTypes();
    showScreen('main');
    
    currentPage = 0;
    hasMoreEvents = true;
    loadEvents(true);
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
        renderHeader(currentUser);
        
        const tg = (window as any).Telegram.WebApp;
        tg.showPopup({
            title: 'Успех',
            message: 'Профиль обновлен',
            buttons: [{ type: 'ok' }]
        });
        
        showScreen('profile');
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        const errorMessage = error instanceof Error ? error.message : 'Не удалось сохранить изменения';
        showError(errorMessage);
    } finally {
        elements.saveProfileBtn.disabled = false;
        elements.saveProfileBtn.textContent = 'Сохранить профиль';
    }
}

function showScreen(screen: 'main' | 'profile' | 'edit' | 'event-detail' | 'filters'): void {
    elements.mainScreen.style.display = screen === 'main' ? 'flex' : 'none';
    elements.profileScreen.style.display = screen === 'profile' ? 'flex' : 'none';
    elements.editProfileScreen.style.display = screen === 'edit' ? 'flex' : 'none';
    elements.eventDetailScreen.style.display = screen === 'event-detail' ? 'flex' : 'none';
    elements.filtersScreen.style.display = screen === 'filters' ? 'flex' : 'none';
}

function showLoading(show: boolean): void {
    if (show) {
        elements.loadingSection.classList.add('show');
    } else {
        elements.loadingSection.classList.remove('show');
    }
}

function showLoadingMore(show: boolean): void {
    if (show) {
        elements.loadingMore.classList.add('show');
    } else {
        elements.loadingMore.classList.remove('show');
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
    elements.filterBtn.addEventListener('click', () => showFilters());
    elements.userAvatar.addEventListener('click', () => showProfile());
    elements.avatarPlaceholderSmall.addEventListener('click', () => showProfile());
    
    elements.backToMainBtn.addEventListener('click', () => showScreen('main'));
    elements.backToMainFromProfile.addEventListener('click', () => showScreen('main'));
    elements.backToProfileBtn.addEventListener('click', () => showScreen('profile'));
    elements.backToMainFromFilters.addEventListener('click', () => showScreen('main'));
    
    elements.profileAvatar.addEventListener('click', () => showEditProfile());
    elements.avatarPlaceholderLarge.addEventListener('click', () => showEditProfile());
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    
    elements.applyFilters.addEventListener('click', applyFilters);
    elements.resetFilters.addEventListener('click', resetFilters);
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

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

export {};