# GitHub Pages 배포 가이드

## 배포 URL
배포 후 다음 URL에서 접근 가능합니다:
```
https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/src/exercise/taqz915/day02/todo/
```

## 1단계: GitHub Pages 활성화

1. GitHub 저장소로 이동: https://github.com/weable-kosa/kosa-vibecoding-2026-3rd

2. **Settings** 탭 클릭

3. 왼쪽 메뉴에서 **Pages** 클릭

4. **Source** 섹션에서:
   - **Branch**: `main` 선택
   - **Folder**: `/ (root)` 선택
   - **Save** 클릭

5. 페이지 상단에 배포 URL이 표시됩니다:
   ```
   Your site is published at https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/
   ```

## 2단계: Supabase Redirect URL 업데이트

배포 후 Supabase 설정을 업데이트해야 합니다.

### Supabase Dashboard 설정

1. Supabase 대시보드 접속: https://supabase.com/dashboard

2. **Authentication** > **URL Configuration** 이동

3. **Site URL** 업데이트:
   ```
   https://weable-kosa.github.io
   ```

4. **Redirect URLs** 추가:
   ```
   https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/src/exercise/taqz915/day02/todo/
   ```

5. **Save** 클릭

### Google OAuth Redirect URI 업데이트

1. [Google Cloud Console](https://console.cloud.google.com/) 접속

2. **APIs & Services** > **Credentials**

3. OAuth 2.0 Client ID 클릭

4. **Authorized redirect URIs**에 추가:
   ```
   https://ngbksxbfggfgixtxzqci.supabase.co/auth/v1/callback
   ```

5. **Save** 클릭

### GitHub OAuth Redirect URI 업데이트

1. [GitHub Settings](https://github.com/settings/developers) 접속

2. OAuth Apps에서 Todo App 클릭

3. **Authorization callback URL** 확인:
   ```
   https://ngbksxbfggfgixtxzqci.supabase.co/auth/v1/callback
   ```
   (이미 설정되어 있어야 함)

## 3단계: 배포 확인

### 배포 상태 확인

1. GitHub 저장소의 **Actions** 탭에서 배포 진행 상황 확인

2. 초록색 체크마크가 표시되면 배포 완료

3. 배포된 사이트 접속:
   ```
   https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/src/exercise/taqz915/day02/todo/
   ```

### 기능 테스트

배포된 사이트에서 다음을 테스트하세요:

- [ ] 페이지 로드 확인
- [ ] "로그인" 버튼 클릭 → 모달 열림
- [ ] 이메일 매직 링크 전송 테스트
- [ ] Google 로그인 테스트
- [ ] GitHub 로그인 테스트
- [ ] 로그인 후 할일 추가/수정/삭제
- [ ] 로그아웃 테스트

## 문제 해결

### 404 에러가 발생하는 경우

**원인**: GitHub Pages가 아직 활성화되지 않았거나 배포 중

**해결**:
1. 5-10분 정도 기다리기
2. Settings > Pages에서 배포 상태 확인
3. Actions 탭에서 배포 로그 확인

### 로그인 후 리다이렉트가 안 되는 경우

**원인**: Supabase Redirect URL이 업데이트되지 않음

**해결**:
1. Supabase Dashboard > Authentication > URL Configuration
2. Redirect URLs에 GitHub Pages URL 추가
3. 브라우저 캐시 삭제 후 재시도

### Google/GitHub 로그인이 안 되는 경우

**원인**: OAuth 앱의 Redirect URI가 설정되지 않음

**해결**:
1. Google Cloud Console / GitHub Settings에서 Redirect URI 확인
2. Supabase callback URL이 올바르게 설정되어 있는지 확인:
   ```
   https://ngbksxbfggfgixtxzqci.supabase.co/auth/v1/callback
   ```

### CORS 에러가 발생하는 경우

**원인**: Supabase의 허용된 도메인 목록에 GitHub Pages URL이 없음

**해결**:
1. Supabase Dashboard > Settings > API
2. **Allowed origins** 확인
3. 필요시 GitHub Pages URL 추가

## 배포 자동화

매번 푸시할 때마다 자동으로 배포되도록 설정되어 있습니다:

```
git add .
git commit -m "Update todo app"
git push origin main
```

푸시 후 약 1-2분 내에 GitHub Pages에 자동 배포됩니다.

## 로컬 테스트

배포 전 로컬에서 테스트하려면:

```bash
# 로컬 서버 시작
python3 -m http.server 8001

# 브라우저에서 접속
http://localhost:8001
```

## 참고 링크

- GitHub Pages 문서: https://docs.github.com/en/pages
- Supabase 인증 문서: https://supabase.com/docs/guides/auth
- Google OAuth 설정: https://support.google.com/cloud/answer/6158849
- GitHub OAuth 설정: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
