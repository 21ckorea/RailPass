# RailPass 웹 시스템 구현 완료 보고

## 🚀 프로젝트 개요
기존 Python CLI 기반의 기차표 예매 프로그램을 현대적인 **Full-Stack 웹 서비스**로 전환 완료했습니다. 이제 오라클 클라우드 리눅스 서버에서 Docker를 통해 손쉽게 실행하고, 언제 어디서나 브라우저를 통해 기차표를 자동으로 예매할 수 있습니다.

---

## ✨ 핵심 구현 기능

### 1. 현대적인 UI/UX (Next.js 15 + Tailwind CSS)
- **다크 모드 지원**: 시스템 설정에 따른 자동 테마 전환
- **반응형 디자인**: 모바일과 데스크탑 모두 최적화된 화면
- **실시간 대시보드**: 진행 중인 예매 상태와 성공 이력 한눈에 확인

### 2. 강력한 자동 예매 엔진 (Python Worker)
- **멀티 시간대 지원**: 기존 CLI와 달리 여러 시간대를 한 번에 선택하여 시도 가능
- **지능적 재시도**: Gamma Distribution 알고리즘으로 차단 위험 최소화하면서 취소표 탐색
- **자동 결제**: 예매 성공 시 미리 등록된 카드로 즉시 결제 (Native SRT/KTX 결제 연합)

### 3. 보안 및 알림 (FastAPI + AES-256)
- **데이터 암호화**: 모든 계정 정보와 카드 번호는 서버 DB에 **AES-256 비트 암호화**되어 안전하게 저장됨
- **실시간 알림**: 텔레그램 보트 및 디스코드 웹훅 연동으로 성공 즉시 알람 수신
- **WebSocket**: 브라우저를 끄지 않아도 실시간으로 시도 횟수와 상태 확인

---

## 🛠️ 기술 스택 상세
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend API**: FastAPI (Python 3.12), SQLAlchemy, JWT Auth
- **Worker**: 기존 `srtgo` 엔진 통합, Redis 기반 작업 큐
- **Infrastructure**: Docker Compose, PostgreSQL, Redis, Nginx

---

## 📦 설치 및 배포 가이드 (Oracle Cloud / Linux)

### 1. 사전 요구사항
- Docker 및 Docker Compose 설치
- 도메인 연결 (선택 사항)

### 2. 실행 방법
```bash
# 1. 프로젝트 폴더로 이동
cd /path/to/RailPass

# 2. 환경변수 설정
cp .env.example .env
vi .env  # 필요한 값들(SECRET_KEY 등)을 채워주세요

# 3. Docker 컨테이너 실행
docker-compose up -d --build
```

### 3. 접속 정보
- **Web UI**: `http://서버_IP`
- **API Docs**: `http://서버_IP/api/docs` (개발 모드 전용)

---

## 📸 주요 화면 설계 미리보기

1. **대시보드**: 현재 실행 중인 예매 작업들의 상태를 직관적으로 표시
2. **예매 설정**: 달력과 시간대 버튼을 사용하여 간편하게 예매 조건 설정
3. **실시간 현황**: "시도 횟수"와 "경과 시간"이 실시간으로 카운트되며 WebSocket으로 업데이트
4. **설정 페이지**: 안전하게 계정 정보와 알림 채널을 관리

> [!IMPORTANT]
> 오라클 클라우드 사용 시, Ingress Rule(보안 리스트)에서 **80**번과 **443**번 포트를 반드시 열어주어야 외부에서 접속이 가능합니다.

---
구현된 코드는 지정된 디렉토리에 모두 구성되었습니다. 테스트 및 배포 준비가 완료되었습니다!
