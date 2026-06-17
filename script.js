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
            await this.migrateFromLocalStorage();
            await this.loadCurrentUser();
            await this.loadTodosFromSupabase();
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

    setupEventListeners() {
        const userNameInput = document.getElementById('userName');
        const userLoginBtn = document.getElementById('userLoginBtn');
        const todoInput = document.getElementById('todoInput');
        const addTodoBtn = document.getElementById('addTodoBtn');
        const priorityBtns = document.querySelectorAll('.priority-btn');

        userNameInput.value = this.userName;

        // 로그인 버튼 클릭 이벤트
        userLoginBtn.addEventListener('click', () => {
            const name = userNameInput.value;
            this.updateUserName(name);
        });

        // 이름 입력 필드에서 Enter 키 처리
        userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = userNameInput.value;
                this.updateUserName(name);
            }
        });

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

    async migrateFromLocalStorage() {
        const localData = localStorage.getItem('todoApp');
        if (!localData) {
            console.log('마이그레이션할 localStorage 데이터가 없습니다.');
            return;
        }

        try {
            const { todos, userName } = JSON.parse(localData);
            console.log('localStorage에서 데이터 발견:', { userName, todoCount: todos?.length });

            if (userName) {
                const { data: user, error } = await supabaseClient
                    .from('users')
                    .insert({ name: userName })
                    .select()
                    .single();

                if (error) {
                    console.error('사용자 생성 실패:', error);
                    return;
                }

                if (user) {
                    this.currentUser = user;
                    this.userName = user.name;
                    localStorage.setItem('currentUserName', userName);
                    console.log('사용자 생성 완료:', user);

                    if (todos && todos.length > 0) {
                        const todosToInsert = todos.map((todo, index) => ({
                            user_id: user.id,
                            text: todo.text,
                            completed: todo.completed,
                            priority: todo.priority,
                            position: index
                        }));

                        const { error: todoError } = await supabaseClient.from('todos').insert(todosToInsert);
                        if (todoError) {
                            console.error('할일 마이그레이션 실패:', todoError);
                        } else {
                            console.log(`${todos.length}개 할일 마이그레이션 완료`);
                        }
                    }
                }
            }

            localStorage.setItem('todoApp_backup', localData);
            localStorage.removeItem('todoApp');
            console.log('localStorage 데이터가 Supabase로 마이그레이션되었습니다.');
        } catch (e) {
            console.error('마이그레이션 실패:', e);
        }
    }

    async loadCurrentUser() {
        const userName = localStorage.getItem('currentUserName') || '';
        if (!userName) {
            console.log('저장된 사용자 이름이 없습니다.');
            return;
        }

        console.log('사용자 로드 시도:', userName);
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('name', userName)
            .single();

        if (error) {
            console.error('사용자 로드 실패:', error);
            return;
        }

        if (data) {
            this.currentUser = data;
            this.userName = data.name;
            console.log('사용자 로드 완료:', data);
        }
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

    async updateUserName(name) {
        const trimmedName = name.trim();

        if (!trimmedName) {
            this.showNotification('이름을 입력해주세요!');
            return;
        }

        console.log('사용자 조회/생성 시도:', trimmedName);

        const { data: existingUser } = await supabaseClient
            .from('users')
            .select('*')
            .eq('name', trimmedName)
            .single();

        if (existingUser) {
            this.currentUser = existingUser;
            this.userName = existingUser.name;
            console.log('기존 사용자 로그인:', existingUser);
            this.showNotification(`환영합니다, ${this.userName}님! 👋`);
        } else {
            const { data: newUser, error } = await supabaseClient
                .from('users')
                .insert({ name: trimmedName })
                .select()
                .single();

            if (newUser) {
                this.currentUser = newUser;
                this.userName = newUser.name;
                console.log('새 사용자 생성:', newUser);
                this.showNotification(`회원가입 완료! 환영합니다, ${this.userName}님! 🎉`);
            } else {
                console.error('사용자 생성 실패:', error);
                this.showNotification('로그인에 실패했습니다. 다시 시도해주세요.');
                return;
            }
        }

        localStorage.setItem('currentUserName', trimmedName);
        await this.loadTodosFromSupabase();
        this.updateGreeting();
        this.render();
    }

    updateGreeting() {
        const greeting = document.getElementById('userGreeting');
        if (this.userName) {
            greeting.textContent = `안녕하세요, ${this.userName}님! 👋`;
            greeting.classList.add('active');
        } else {
            greeting.classList.remove('active');
        }
    }

    async addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();

        if (!text) {
            this.showNotification('할일을 입력해주세요!');
            return;
        }

        if (!this.currentUser) {
            this.showNotification('사용자 이름을 먼저 입력해주세요!');
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
