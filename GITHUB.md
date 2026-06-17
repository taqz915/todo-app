# GitHub Pages 배포 가이드

이 문서는 Todo 애플리케이션을 GitHub Pages로 배포하는 방법을 설명합니다.

## 사전 준비

- GitHub 계정
- Git 설치 (`git --version`으로 확인)
- 현재 프로젝트가 git repository로 초기화되어 있어야 함

## 1. GitHub Repository 생성

### 1.1 GitHub에서 새 Repository 만들기

1. https://github.com 접속 후 로그인
2. 우측 상단 `+` 버튼 클릭 → `New repository` 선택
3. Repository 설정:
   - **Repository name**: `todo-app` (또는 원하는 이름)
   - **Description**: `Supabase 기반 할일 관리 애플리케이션`
   - **Public** 선택 (GitHub Pages는 무료로 Public에서만 사용 가능)
   - ✅ **Add a README file** 체크하지 않기 (이미 로컬에 파일이 있음)
   - ✅ **.gitignore** 선택하지 않기
   - ✅ **License** 선택하지 않기
4. `Create repository` 클릭

### 1.2 Repository URL 복사

생성 후 표시되는 URL을 복사합니다:
```
https://github.com/[사용자명]/todo-app.git
```

## 2. 로컬 프로젝트를 GitHub에 Push

### 2.1 현재 디렉토리 확인

```bash
cd /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/taqz915/day02/todo
pwd
```

### 2.2 Git 초기화 (처음 한 번만)

```bash
# 이미 git repository가 있는지 확인
git status

# git이 초기화되지 않았다면
git init
```

### 2.3 파일 추가 및 커밋

```bash
# 모든 파일 스테이징
git add .

# 커밋 메시지와 함께 커밋
git commit -m "Initial commit: Supabase 기반 Todo 앱"

# 또는 Co-Authored-By 포함
git commit -m "$(cat <<'EOF'
Initial commit: Supabase 기반 Todo 앱

- localStorage에서 Supabase로 마이그레이션
- 사용자 로그인 시스템
- 우선순위별 할일 관리
- 드래그 앤 드롭 기능

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### 2.4 Remote Repository 연결

```bash
# GitHub repository를 remote로 추가
git remote add origin https://github.com/[사용자명]/todo-app.git

# 또는 SSH 사용 시
git remote add origin git@github.com:[사용자명]/todo-app.git

# remote가 제대로 추가되었는지 확인
git remote -v
```

### 2.5 GitHub에 Push

```bash
# main 브랜치로 push
git push -u origin main

# 또는 master 브랜치인 경우
git push -u origin master
```

**인증 방법:**
- HTTPS 사용 시: GitHub username과 Personal Access Token 입력
- SSH 사용 시: SSH 키가 미리 설정되어 있어야 함

## 3. GitHub Pages 활성화

### 3.1 Repository Settings 접근

1. GitHub repository 페이지 접속
2. 상단 탭에서 `Settings` 클릭
3. 좌측 사이드바에서 `Pages` 클릭

### 3.2 GitHub Pages 설정

1. **Source** 섹션:
   - **Branch**: `main` (또는 `master`) 선택
   - **Folder**: `/ (root)` 선택
2. `Save` 버튼 클릭

### 3.3 배포 대기

- 저장 후 1-2분 정도 기다리면 배포가 완료됩니다.
- 상단에 배포 URL이 표시됩니다:
  ```
  Your site is published at https://[사용자명].github.io/todo-app/
  ```

## 4. 배포 확인

### 4.1 브라우저에서 접속

```
https://[사용자명].github.io/todo-app/
```

### 4.2 확인 사항

- [ ] 페이지가 정상적으로 로드됨
- [ ] Supabase 연결 확인 (개발자 도구 콘솔)
- [ ] 이름 입력 및 로그인 가능
- [ ] 할일 추가/삭제/완료 기능 작동
- [ ] 드래그 앤 드롭 작동
- [ ] 페이지 새로고침 후 데이터 유지

## 5. 업데이트 및 재배포

코드 수정 후 다시 배포하려면:

```bash
# 변경된 파일 확인
git status

# 변경 사항 스테이징
git add .

# 커밋
git commit -m "Update: 기능 수정 설명"

# GitHub에 push (자동으로 재배포됨)
git push origin main
```

**배포 시간:** Push 후 약 1-2분 내에 자동 재배포

## 6. 문제 해결

### 6.1 404 Not Found 에러

**원인**: 브랜치나 폴더 설정이 잘못됨

**해결**:
1. Settings → Pages에서 올바른 브랜치 선택
2. 파일이 repository root에 있는지 확인
3. `index.html` 파일명 확인 (대소문자 구분)

### 6.2 CSS/JS 파일이 로드되지 않음

**원인**: 상대 경로 문제

**해결**: 
- 현재 프로젝트는 상대 경로(`./styles.css`, `./script.js`)를 사용하므로 문제없음
- 절대 경로를 사용하는 경우 `/todo-app/styles.css` 형태로 수정

### 6.3 Supabase 연결 실패

**원인**: CORS 설정 또는 API 키 문제

**해결**:
1. Supabase Dashboard → Settings → API
2. **URL Configuration**에서 GitHub Pages URL 추가:
   ```
   https://[사용자명].github.io
   ```
3. Supabase는 기본적으로 모든 도메인 허용 (`*`)이므로 대부분 문제없음

### 6.4 Push 인증 실패

**원인**: Personal Access Token이 필요함 (비밀번호 인증 중단)

**해결**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. `Generate new token` 클릭
3. Scopes: `repo` 전체 체크
4. 생성된 토큰을 복사하여 비밀번호 대신 사용

## 7. 추가 설정 (선택사항)

### 7.1 Custom Domain 연결

1. 도메인 구매 (예: Namecheap, GoDaddy)
2. DNS 설정:
   ```
   Type: CNAME
   Name: www
   Value: [사용자명].github.io
   ```
3. GitHub Pages Settings에서 Custom domain 입력

### 7.2 HTTPS 강제

- GitHub Pages → Settings → Pages
- ✅ `Enforce HTTPS` 체크

### 7.3 README.md 작성

Repository에 `README.md` 추가:

```markdown
# Todo App

Supabase 기반 할일 관리 애플리케이션

## 🌐 Live Demo

[https://[사용자명].github.io/todo-app/](https://[사용자명].github.io/todo-app/)

## ✨ 주요 기능

- 📝 할일 추가/수정/삭제
- 🎯 우선순위별 관리 (높음/중간/낮음)
- ✅ 완료 상태 토글
- 🎨 드래그 앤 드롭으로 순서 변경
- 💾 Supabase를 통한 데이터 지속성
- 👤 사용자별 데이터 관리

## 🛠️ 기술 스택

- Vanilla JavaScript (프레임워크 없음)
- HTML5 & CSS3
- Supabase (Backend as a Service)
- Material Design UI

## 📦 로컬 실행

\`\`\`bash
# HTTP 서버 시작
python3 -m http.server 8000

# 브라우저에서 접속
http://localhost:8000
\`\`\`

## 📄 License

MIT License
```

## 8. 배포 완료 체크리스트

배포 전 확인:
- [ ] `index.html`, `styles.css`, `script.js` 파일 존재
- [ ] Supabase URL과 API 키가 코드에 포함됨
- [ ] Git commit 완료
- [ ] GitHub repository 생성
- [ ] Remote origin 설정
- [ ] GitHub Pages 활성화

배포 후 확인:
- [ ] URL 접속 가능
- [ ] 브라우저 콘솔에 에러 없음
- [ ] 로그인 기능 작동
- [ ] 할일 CRUD 기능 작동
- [ ] 드래그 앤 드롭 작동
- [ ] 모바일에서도 정상 작동

## 9. 참고 링크

- [GitHub Pages 공식 문서](https://docs.github.com/en/pages)
- [Supabase 문서](https://supabase.com/docs)
- [Git 기본 명령어](https://git-scm.com/docs)
- [Personal Access Token 생성](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

## 10. 추가 팁

### 10.1 .gitignore 설정

불필요한 파일 제외:

```bash
# .gitignore 파일 생성
cat > .gitignore << 'EOF'
# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log

# Backup files
*.backup
*_backup.md
EOF

git add .gitignore
git commit -m "Add .gitignore"
git push origin main
```

### 10.2 GitHub Actions로 자동 배포

`.github/workflows/deploy.yml` 생성:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

### 10.3 성능 최적화

- Supabase CDN 대신 로컬 호스팅 고려
- 이미지 최적화 (WebP 변환)
- CSS/JS 압축 (Minify)

---

**배포 성공을 축하합니다! 🎉**

문제가 발생하면 GitHub Issues를 통해 문의하세요.
