# englishstudy-site

englishstudy.kr (마스터 영어) — Cloudflare Workers, 푸시하면 자동 배포.

## 작업 규칙 (2026-11-10)

1. 작업을 마칠 때마다 변경 내용을 커밋하고 GitHub에 푸시한다. 밖에서(사무실·휴대폰·claude.ai/code)도 이어서 작업할 수 있게 하기 위해서다.
2. 50MB가 넘는 파일, mp3·mp4 같은 큰 미디어 파일은 GitHub에 올리지 말고 Cloudflare R2에 올린 뒤 주소로 연결한다. (저장소 전체는 1GB 이하 유지)
3. API 키, 비밀번호, 관리자 열쇠가 든 파일은 절대 커밋하지 않는다. 커밋 전에 .gitignore를 확인한다.
