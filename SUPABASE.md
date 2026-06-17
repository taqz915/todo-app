# Supabase 마이그레이션 가이드

이 문서는 Todo 애플리케이션의 데이터 저장소를 localStorage에서 Supabase로 마이그레이션하는 방법을 설명합니다.

## 1. Supabase 프로젝트 설정

### 1.1 계정 생성 및 프로젝트 생성

1. https://supabase.com 접속
2. "Start your project" 클릭하여 회원가입
3. GitHub, Google 등의 소셜 로그인 또는 이메일로 가입
4. 대시보드에서 "New Project" 클릭
5. 프로젝트 정보 입력:
   - **Name**: `todo-app` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (저장해두기!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국에서 가장 빠름)
   - **Pricing Plan**: Free tier 선택
6. "Create new project" 클릭 (프로비저닝에 1-2분 소요)

### 1.2 API 키 확인

프로젝트가 생성되면:
1. 좌측 메뉴에서 **Settings** > **API** 클릭
2. 다음 정보를 복사해두기:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (public API key)

## 2. 데이터베이스 스키마 설계

### 2.1 테이블 구조

#### `users` 테이블
사용자 정보를 저장합니다.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이름으로 빠른 조회를 위한 인덱스
CREATE INDEX idx_users_name ON users(name);
```

#### `todos` 테이블
할일 항목을 저장합니다.

```sql
CREATE TABLE todos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_id와 priority로 빠른 조회를 위한 복합 인덱스
CREATE INDEX idx_todos_user_priority ON todos(user_id, priority, position);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 테이블 생성 방법

Supabase 대시보드에서:
1. 좌측 메뉴 **SQL Editor** 클릭
2. "New Query" 클릭
3. 위의 SQL 스크립트를 복사하여 붙여넣기
4. "Run" 버튼 클릭하여 실행

또는:
1. 좌측 메뉴 **Database** > **Tables** 클릭
2. "Create a new table" UI를 통해 수동으로 생성

### 2.3 Row Level Security (RLS) 설정

**중요**: Supabase는 기본적으로 RLS가 활성화되어 있습니다. 현재는 단일 사용자 애플리케이션이므로 간단한 정책을 사용합니다.

```sql
-- 모든 사용자가 자신의 데이터에 접근 가능 (인증 없이)
-- 프로토타입이므로 public access 허용

-- users 테이블 RLS 활성화 및 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for users"
ON users FOR ALL
USING (true)
WITH CHECK (true);

-- todos 테이블 RLS 활성화 및 정책 설정
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for todos"
ON todos FOR ALL
USING (true)
WITH CHECK (true);
```

**참고**: 프로덕션 환경에서는 Supabase Auth를 통합하여 사용자별로 데이터를 격리해야 합니다.

## 3. 프론트엔드 통합

### 3.1 Supabase 클라이언트 라이브러리 추가

`index.html`의 `<head>` 섹션에 추가:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 3.2 Supabase 클라이언트 초기화

`script.js` 상단에 추가:

```javascript
// Supabase 설정
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**보안 참고**: 실제 프로덕션에서는 환경 변수나 설정 파일을 사용하는 것이 좋습니다.

### 3.3 데이터 마이그레이션 전략

#### 옵션 A: localStorage 데이터 자동 마이그레이션

앱 초기화 시 localStorage 데이터가 있으면 Supabase로 마이그레이션:

```javascript
async migrateFromLocalStorage() {
    const localData = localStorage.getItem('todoApp');
    if (!localData) return;

    const { todos, userName } = JSON.parse(localData);
    
    // 사용자 생성
    if (userName) {
        await this.createOrGetUser(userName);
    }
    
    // 할일 마이그레이션
    for (const todo of todos) {
        await this.createTodoInSupabase(todo);
    }
    
    // 마이그레이션 완료 후 localStorage 백업
    localStorage.setItem('todoApp_backup', localData);
    localStorage.removeItem('todoApp');
}
```

#### 옵션 B: 수동 마이그레이션 버튼 제공

사용자가 명시적으로 마이그레이션을 트리거하도록 UI에 버튼 추가

### 3.4 주요 API 메서드 구현 예시

```javascript
class TodoApp {
    constructor() {
        this.currentUser = null;
        this.todos = [];
        // ... 기존 코드
    }

    async init() {
        await this.loadCurrentUser();
        await this.loadTodosFromSupabase();
        this.setupEventListeners();
        this.setupDragAndDropZones();
        this.render();
    }

    // 사용자 로드 또는 생성
    async loadCurrentUser() {
        const userName = localStorage.getItem('currentUserName') || '';
        if (!userName) return;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('name', userName)
            .single();

        if (data) {
            this.currentUser = data;
            this.userName = data.name;
        } else {
            // 사용자 생성
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({ name: userName })
                .select()
                .single();
            
            if (newUser) {
                this.currentUser = newUser;
                this.userName = newUser.name;
            }
        }
    }

    // 할일 목록 로드
    async loadTodosFromSupabase() {
        if (!this.currentUser) return;

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .order('priority', { ascending: false })
            .order('position', { ascending: true });

        if (data) {
            this.todos = data.map(todo => ({
                id: todo.id,
                text: todo.text,
                completed: todo.completed,
                priority: todo.priority,
                createdAt: todo.created_at
            }));
        }
    }

    // 할일 추가
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

        // 현재 priority의 마지막 position 계산
        const currentPriorityTodos = this.getTodosByPriority(this.selectedPriority);
        const maxPosition = currentPriorityTodos.length > 0 
            ? Math.max(...currentPriorityTodos.map(t => t.position || 0))
            : 0;

        const { data, error } = await supabase
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
                createdAt: data.created_at
            });
            input.value = '';
            this.render();
            this.showNotification('할일이 추가되었습니다! ✅');
        } else {
            console.error('Failed to add todo:', error);
            this.showNotification('할일 추가에 실패했습니다.');
        }
    }

    // 할일 완료 토글
    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newCompleted = !todo.completed;

        const { error } = await supabase
            .from('todos')
            .update({ completed: newCompleted })
            .eq('id', id);

        if (!error) {
            todo.completed = newCompleted;
            this.render();
        }
    }

    // 할일 삭제
    async deleteTodo(id) {
        if (!confirm('이 할일을 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (!error) {
            this.todos = this.todos.filter(t => t.id !== id);
            this.render();
            this.showNotification('할일이 삭제되었습니다! 🗑️');
        }
    }

    // 사용자 이름 업데이트
    async updateUserName(name) {
        const trimmedName = name.trim();
        
        if (!trimmedName) {
            this.userName = '';
            this.currentUser = null;
            localStorage.removeItem('currentUserName');
            this.updateGreeting();
            return;
        }

        // 기존 사용자 찾기 또는 생성
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('name', trimmedName)
            .single();

        if (existingUser) {
            this.currentUser = existingUser;
            this.userName = existingUser.name;
        } else {
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({ name: trimmedName })
                .select()
                .single();

            if (newUser) {
                this.currentUser = newUser;
                this.userName = newUser.name;
            }
        }

        localStorage.setItem('currentUserName', trimmedName);
        await this.loadTodosFromSupabase();
        this.render();
    }

    // 드래그 앤 드롭 후 position 업데이트
    async updateTodoPositions() {
        const updates = [];
        
        // priority별로 position 재정렬
        ['high', 'medium', 'low'].forEach(priority => {
            const priorityTodos = this.getTodosByPriority(priority);
            priorityTodos.forEach((todo, index) => {
                updates.push(
                    supabase
                        .from('todos')
                        .update({ position: index, priority: priority })
                        .eq('id', todo.id)
                );
            });
        });

        await Promise.all(updates);
    }
}
```

## 4. 실시간 동기화 (선택사항)

여러 기기/탭에서 실시간 동기화를 원할 경우:

```javascript
async setupRealtimeSubscription() {
    if (!this.currentUser) return;

    supabase
        .channel('todos')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'todos',
                filter: `user_id=eq.${this.currentUser.id}`
            },
            (payload) => {
                console.log('Change received!', payload);
                this.loadTodosFromSupabase().then(() => this.render());
            }
        )
        .subscribe();
}
```

## 5. 마이그레이션 체크리스트

- [ ] Supabase 계정 생성
- [ ] 프로젝트 생성 및 API 키 복사
- [ ] 데이터베이스 테이블 생성 (SQL 실행)
- [ ] RLS 정책 설정
- [ ] `index.html`에 Supabase 라이브러리 추가
- [ ] `script.js`에 Supabase 클라이언트 초기화 코드 추가
- [ ] localStorage 메서드를 Supabase API 호출로 변경
- [ ] 기존 localStorage 데이터 마이그레이션 로직 구현
- [ ] 에러 처리 및 로딩 상태 추가
- [ ] 오프라인 모드 처리 (선택사항)
- [ ] 테스트 및 검증

## 6. 주의사항

### 6.1 API 키 보안
- `anon` 키는 클라이언트에서 사용해도 안전합니다 (RLS로 보호됨)
- `service_role` 키는 절대 클라이언트 코드에 포함하지 마세요

### 6.2 Rate Limiting
- Free tier는 다음 제한이 있습니다:
  - 500MB 데이터베이스
  - 1GB 파일 저장소
  - 50,000 월간 활성 사용자

### 6.3 에러 처리
- 네트워크 오류, 권한 오류 등을 처리하는 try-catch 추가
- 사용자에게 친화적인 에러 메시지 표시

### 6.4 성능 최적화
- 대량의 할일이 있을 경우 pagination 고려
- 낙관적 업데이트(Optimistic Update) 적용으로 UX 개선

## 7. 추가 기능 제안

### 7.1 인증 추가 (선택사항)
현재는 이름 기반이지만, 향후 Supabase Auth를 통해 이메일/소셜 로그인 추가 가능:

```javascript
// 이메일 로그인 예시
const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password'
});
```

### 7.2 협업 기능
- 할일 공유 기능
- 멀티 사용자 환경에서 권한 관리

### 7.3 백업 및 복원
- localStorage를 백업 저장소로 활용
- 오프라인 모드 지원 (Service Worker + IndexedDB)

## 8. 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript SDK](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime 기능](https://supabase.com/docs/guides/realtime)
