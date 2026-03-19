# RailPass 웹 시스템 구현 태스크

## 1. 프로젝트 구조 세팅
- [x] 설계 문서 (PlantUML) 생성
- [x] 디렉토리 구조 생성 (backend/, frontend/, docker/)
- [x] Docker Compose 구성 (PostgreSQL, Redis, Backend, Frontend, Worker)
- [x] 환경변수 파일 (.env.example) 생성

## 2. 백엔드 (FastAPI)
- [x] 프로젝트 초기화 (pyproject.toml / requirements.txt)
- [x] DB 모델 정의 (SQLAlchemy + Alembic 마이그레이션)
  - [x] users 테이블
  - [x] rail_accounts 테이블
  - [x] notification_settings 테이블
  - [x] card_settings 테이블
  - [x] reservation_jobs 테이블
  - [x] reservation_results 테이블
- [x] 인증 API (JWT 로그인/회원가입/토큰 갱신)
- [x] 사용자 설정 API (계정, 알림, 카드)
- [x] 예매 관리 API (생성, 조회, 취소, 결제)
- [x] WebSocket 엔드포인트 (실시간 상태)
- [x] 암호화 유틸리티 (AES-256)

## 3. 예매 워커 (Python)
- [x] 기존 srtgo 코드 통합
- [x] 워커 베이스 클래스 설계
- [x] SRT 워커 구현
- [x] KTX 워커 구현
- [x] 작업 큐 연동 (Redis/BullMQ → Python rq or celery)
- [x] 실시간 상태 업데이트 (WebSocket 푸시)
- [x] 알림 발송 (텔레그램/디스코드)

## 4. 프론트엔드 (Next.js)
- [x] 프로젝트 초기화 (Next.js + TypeScript + Tailwind)
- [x] 레이아웃 및 공통 컴포넌트
- [x] 로그인/회원가입 페이지
- [x] 대시보드 페이지
- [x] 예매 설정 페이지
  - [x] 열차 종류 선택
  - [x] 역 선택
  - [x] 날짜/시간대 선택
  - [x] 승객 구성
  - [x] 좌석 유형 / 자동결제 설정
- [x] 예매 현황 페이지 (실시간)
- [x] 예매 내역 / 관리 페이지
- [x] 사용자 설정 페이지

## 5. 배포 설정 (Oracle Cloud Linux)
- [x] Dockerfile (backend, frontend, worker)
- [x] docker-compose.yml (전체 스택)
- [x] Nginx 리버스 프록시 설정
- [x] 배포 가이드 작성
