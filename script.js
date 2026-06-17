// Supabase 설정
const SUPABASE_URL = 'https://ngbksxbfggfgixtxzqci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYmtzeGJmZ2dmZ2l4dHh6cWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Njc1NjgsImV4cCI6MjA5NzI0MzU2OH0.7zZGhBLPb6aWGNqPlhSWkcKhtXOJiSbCHnj3O8ed-EI';

console.log('Supabase 초기화 시작...');
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase 클라이언트 생성 완료:', supabaseClient);

class TodoApp {
    constructor() {
        this.todos = [];
        this.userName = '';
        this.currentUser = null;
        this.selectedPriority = 'medium';
        this.draggedItem = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            this.setupAuthListener();
            await this.checkAuthSession();
            this.setupEventListeners();
            this.setupDragAndDropZones();
            this.render();
            this.isInitialized = true;
        } catch (error) {
            console.error('초기화 실패:', error);
            this.setupEventListeners();
            this.setupDragAndDropZones();
            this.render();
            this.isInitialized = true;
        }
    }

    setupAuthListener() {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event, session);

            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.userName = session.user.email;
                await this.loadTodosFromSupabase();
                this.updateUIForAuthState(true);
                this.render();
                this.hideAuthModal();
                this.showNotification(`환영합니다! 🎉`);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userName = '';
                this.todos = [];
                this.updateUIForAuthState(false);
                this.render();
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Token refreshed');
            }
        });
    }

    async checkAuthSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            this.currentUser = session.user;
            this.userName = session.user.email;
            await this.loadTodosFromSupabase();
            this.updateUIForAuthState(true);
        } else {
            this.updateUIForAuthState(false);
        }
    }

    updateUIForAuthState(isAuthenticated) {
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const greeting = document.getElementById('userGreeting');

        if (isAuthenticated) {
            authSection.style.display = 'none';
            userSection.style.display = 'flex';
            greeting.textContent = `안녕하세요! ${this.userName} 👋`;
            greeting.classList.add('active');
        } else {
            authSection.style.display = 'block';
            userSection.style.display = 'none';
            greeting.classList.remove('active');
        }
    }

    showAuthModal() {
        console.log('showAuthModal 호출됨');
        const modal = document.getElementById('authModal');
        const emailInput = document.getElementById('emailInput');
        const authForm = document.getElementById('authForm');
        const authSuccess = document.getElementById('authSuccess');
        const authError = document.getElementById('authError');

        console.log('Modal element:', modal);
        console.log('Email input:', emailInput);

        authForm.style.display = 'block';
        authSuccess.style.display = 'none';
        authError.style.display = 'none';
        emailInput.value = '';

        modal.style.display = 'flex';
        setTimeout(() => emailInput.focus(), 100);
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        modal.style.display = 'none';
    }

    async sendMagicLink() {
        const emailInput = document.getElementById('emailInput');
        const email = emailInput.value.trim();
        const authForm = document.getElementById('authForm');
        const authSuccess = document.getElementById('authSuccess');
        const authError = document.getElementById('authError');
        const successMessage = document.getElementById('successMessage');

        if (!email) {
            this.showAuthError('이메일 주소를 입력해주세요.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showAuthError('유효한 이메일 주소를 입력해주세요.');
            return;
        }

        try {
            const { error } = await supabaseClient.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: window.location.href
                }
            });

            if (error) {
                console.error('Magic link error:', error);
                this.showAuthError(this.getErrorMessage(error));
            } else {
                authForm.style.display = 'none';
                authError.style.display = 'none';
                authSuccess.style.display = 'block';
                successMessage.textContent = `${email}로 로그인 링크를 전송했습니다. 이메일을 확인해주세요.`;
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            this.showAuthError('예상치 못한 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    showAuthError(message) {
        const authError = document.getElementById('authError');
        const errorMessage = document.getElementById('errorMessage');

        errorMessage.textContent = message;
        authError.style.display = 'flex';
    }

    getErrorMessage(error) {
        if (error.message.includes('rate limit')) {
            return '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message.includes('invalid email')) {
            return '유효하지 않은 이메일 주소입니다.';
        } else {
            return `로그인 실패: ${error.message}`;
        }
    }

    async signOut() {
        if (!confirm('로그아웃 하시겠습니까?')) return;

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                console.error('Logout error:', error);
                this.showNotification('로그아웃에 실패했습니다.');
            } else {
                this.showNotification('로그아웃되었습니다. 👋');
            }
        } catch (error) {
            console.error('Unexpected logout error:', error);
            this.showNotification('로그아웃에 실패했습니다.');
        }
    }

    async signInWithGoogle() {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.href
                }
            });

            if (error) {
                console.error('Google login error:', error);
                this.showAuthError('Google 로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('Unexpected Google login error:', error);
            this.showAuthError('Google 로그인 중 오류가 발생했습니다.');
        }
    }

    async signInWithGithub() {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.href
                }
            });

            if (error) {
                console.error('GitHub login error:', error);
                this.showAuthError('GitHub 로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('Unexpected GitHub login error:', error);
            this.showAuthError('GitHub 로그인 중 오류가 발생했습니다.');
        }
    }

    setupEventListeners() {
        console.log('setupEventListeners 호출됨');
        const showAuthModalBtn = document.getElementById('showAuthModalBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const modalOverlay = document.getElementById('modalOverlay');
        const sendMagicLinkBtn = document.getElementById('sendMagicLinkBtn');
        const emailInput = document.getElementById('emailInput');
        const logoutBtn = document.getElementById('logoutBtn');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const githubLoginBtn = document.getElementById('githubLoginBtn');

        console.log('showAuthModalBtn:', showAuthModalBtn);
        console.log('googleLoginBtn:', googleLoginBtn);
        console.log('githubLoginBtn:', githubLoginBtn);

        if (showAuthModalBtn) {
            showAuthModalBtn.addEventListener('click', () => {
                console.log('로그인 버튼 클릭됨!');
                this.showAuthModal();
            });
        } else {
            console.error('showAuthModalBtn을 찾을 수 없습니다!');
        }
        closeModalBtn.addEventListener('click', () => this.hideAuthModal());
        modalOverlay.addEventListener('click', () => this.hideAuthModal());
        sendMagicLinkBtn.addEventListener('click', () => this.sendMagicLink());
        logoutBtn.addEventListener('click', () => this.signOut());
        googleLoginBtn.addEventListener('click', () => this.signInWithGoogle());
        githubLoginBtn.addEventListener('click', () => this.signInWithGithub());

        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMagicLink();
            }
        });

        const todoInput = document.getElementById('todoInput');
        const addTodoBtn = document.getElementById('addTodoBtn');
        const priorityBtns = document.querySelectorAll('.priority-btn');

        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });

        addTodoBtn.addEventListener('click', () => this.addTodo());

        priorityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                priorityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPriority = btn.dataset.priority;
            });
        });
    }

    async loadTodosFromSupabase() {
        if (!this.currentUser) {
            this.todos = [];
            return;
        }

        const { data, error } = await supabaseClient
            .from('todos')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .order('position', { ascending: true });

        if (data) {
            this.todos = data.map(todo => ({
                id: todo.id,
                text: todo.text,
                completed: todo.completed,
                priority: todo.priority,
                position: todo.position,
                createdAt: todo.created_at
            }));
        } else if (error) {
            console.error('할일 목록 로드 실패:', error);
            this.todos = [];
        }
    }

    setupDragAndDropZones() {
        const lists = document.querySelectorAll('.todo-list');
        lists.forEach(list => {
            list.addEventListener('dragover', (e) => this.handleDragOver(e));
            list.addEventListener('drop', (e) => this.handleDrop(e));
            list.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            list.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    updateGreeting() {
        // Now handled by updateUIForAuthState()
    }

    async addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();

        if (!text) {
            this.showNotification('할일을 입력해주세요!');
            return;
        }

        if (!this.currentUser) {
            this.showNotification('먼저 로그인해주세요!');
            this.showAuthModal();
            return;
        }

        const currentPriorityTodos = this.getTodosByPriority(this.selectedPriority);
        const maxPosition = currentPriorityTodos.length > 0
            ? Math.max(...currentPriorityTodos.map(t => t.position || 0))
            : 0;

        const { data, error } = await supabaseClient
            .from('todos')
            .insert({
                user_id: this.currentUser.id,
                text: text,
                completed: false,
                priority: this.selectedPriority,
                position: maxPosition + 1
            })
            .select()
            .single();

        if (data) {
            this.todos.push({
                id: data.id,
                text: data.text,
                completed: data.completed,
                priority: data.priority,
                position: data.position,
                createdAt: data.created_at
            });
            input.value = '';
            this.render();
            this.showNotification('할일이 추가되었습니다! ✅');
        } else {
            console.error('할일 추가 실패:', error);
            this.showNotification('할일 추가에 실패했습니다.');
        }
    }

    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newCompleted = !todo.completed;

        const { error } = await supabaseClient
            .from('todos')
            .update({ completed: newCompleted })
            .eq('id', id);

        if (!error) {
            todo.completed = newCompleted;
            this.render();
        } else {
            console.error('할일 토글 실패:', error);
        }
    }

    async deleteTodo(id) {
        if (!confirm('이 할일을 삭제하시겠습니까?')) return;

        const { error } = await supabaseClient
            .from('todos')
            .delete()
            .eq('id', id);

        if (!error) {
            this.todos = this.todos.filter(t => t.id !== id);
            this.render();
            this.showNotification('할일이 삭제되었습니다! 🗑️');
        } else {
            console.error('할일 삭제 실패:', error);
            this.showNotification('할일 삭제에 실패했습니다.');
        }
    }

    getTodosByPriority(priority) {
        return this.todos.filter(t => t.priority === priority);
    }

    render() {
        this.renderTodoList('high');
        this.renderTodoList('medium');
        this.renderTodoList('low');
        this.updateStats();
        this.updateGreeting();
    }

    renderTodoList(priority) {
        const listId = `${priority}PriorityList`;
        const countId = `${priority}Count`;
        const list = document.getElementById(listId);
        const countBadge = document.getElementById(countId);

        const todos = this.getTodosByPriority(priority);
        countBadge.textContent = todos.length;

        if (todos.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">inbox</span>
                    <p>할일이 없습니다</p>
                </div>
            `;
            return;
        }

        list.innerHTML = todos.map(todo => this.createTodoElement(todo)).join('');

        list.querySelectorAll('.todo-item').forEach(item => {
            this.setupTodoItemDrag(item);
        });
    }

    createTodoElement(todo) {
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}"
                 draggable="true"
                 data-id="${todo.id}">
                <span class="material-icons drag-handle">drag_indicator</span>
                <div class="checkbox-wrapper" onclick="app.toggleTodo(${todo.id})">
                    <div class="checkbox">
                        <span class="material-icons">check</span>
                    </div>
                </div>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `;
    }

    setupTodoItemDrag(item) {
        item.addEventListener('dragstart', (e) => this.handleDragStart(e));
        item.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    handleDragStart(e) {
        this.draggedItem = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);

        const draggedId = parseInt(e.target.dataset.id);
        const draggedTodo = this.todos.find(t => t.id === draggedId);

        document.querySelectorAll('.priority-section').forEach(section => {
            const priority = section.dataset.priority;
            if (priority !== draggedTodo.priority) {
                section.style.transition = 'all 0.3s';
                section.style.opacity = '0.7';
            }
        });
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.todo-list').forEach(list => {
            list.classList.remove('drag-over');
        });
        document.querySelectorAll('.priority-section').forEach(section => {
            section.classList.remove('drag-over-section');
            section.style.opacity = '1';
        });
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        const list = e.target.closest('.todo-list');
        const section = e.target.closest('.priority-section');

        if (list) {
            list.classList.add('drag-over');
        }

        if (section && this.draggedItem) {
            const draggedId = parseInt(this.draggedItem.dataset.id);
            const draggedTodo = this.todos.find(t => t.id === draggedId);
            const targetPriority = section.dataset.priority;

            if (draggedTodo && draggedTodo.priority !== targetPriority) {
                section.classList.add('drag-over-section');
            }
        }
    }

    handleDragLeave(e) {
        const list = e.target.closest('.todo-list');
        const section = e.target.closest('.priority-section');

        if (list && !list.contains(e.relatedTarget)) {
            list.classList.remove('drag-over');
        }

        if (section && !section.contains(e.relatedTarget)) {
            section.classList.remove('drag-over-section');
        }
    }

    async handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();

        const targetList = e.target.closest('.todo-list');
        if (!targetList || !this.draggedItem) {
            return;
        }

        const draggedId = parseInt(this.draggedItem.dataset.id);
        const targetPriority = targetList.parentElement.dataset.priority;

        const draggedTodo = this.todos.find(t => t.id === draggedId);
        if (!draggedTodo) {
            return;
        }

        const oldPriority = draggedTodo.priority;
        const targetTodos = this.getTodosByPriority(targetPriority);

        let insertIndex = 0;
        const afterElement = this.getDragAfterElement(targetList, e.clientY);

        if (afterElement) {
            const afterId = parseInt(afterElement.dataset.id);
            const afterTodo = this.todos.find(t => t.id === afterId);
            insertIndex = this.todos.indexOf(afterTodo);
        } else {
            if (targetTodos.length > 0) {
                const lastTodo = targetTodos[targetTodos.length - 1];
                insertIndex = this.todos.indexOf(lastTodo) + 1;
            } else {
                const priorities = ['high', 'medium', 'low'];
                const targetPriorityIndex = priorities.indexOf(targetPriority);

                insertIndex = 0;
                for (let i = 0; i < targetPriorityIndex; i++) {
                    const priorityTodos = this.getTodosByPriority(priorities[i]);
                    insertIndex += priorityTodos.length;
                }
            }
        }

        const currentIndex = this.todos.indexOf(draggedTodo);
        this.todos.splice(currentIndex, 1);

        if (insertIndex > currentIndex) {
            insertIndex--;
        }

        draggedTodo.priority = targetPriority;
        this.todos.splice(insertIndex, 0, draggedTodo);

        await this.updateTodoPositions();
        this.render();

        if (oldPriority !== targetPriority) {
            this.showNotification(`우선순위가 변경되었습니다! (${this.getPriorityText(oldPriority)} → ${this.getPriorityText(targetPriority)})`);
        }

        return false;
    }

    async updateTodoPositions() {
        const updates = [];

        ['high', 'medium', 'low'].forEach(priority => {
            const priorityTodos = this.getTodosByPriority(priority);
            priorityTodos.forEach((todo, index) => {
                todo.position = index;
                todo.priority = priority;
                updates.push(
                    supabaseClient
                        .from('todos')
                        .update({ position: index, priority: priority })
                        .eq('id', todo.id)
                );
            });
        });

        await Promise.all(updates);
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    getPriorityText(priority) {
        const texts = {
            high: '높음',
            medium: '중간',
            low: '낮음'
        };
        return texts[priority] || priority;
    }

    updateStats() {
        const completed = this.todos.filter(t => t.completed).length;
        const pending = this.todos.filter(t => !t.completed).length;

        document.getElementById('completedCount').textContent = completed;
        document.getElementById('pendingCount').textContent = pending;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #323232;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-size: 14px;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

const app = new TodoApp();
