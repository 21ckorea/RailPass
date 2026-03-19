"""
RailPass 예매 워커 메인 - Redis 큐에서 작업을 수신하여 예매를 실행
"""
import asyncio
import json
import logging
import signal
import sys
import os
import time

import redis

# srtgo 모듈 경로 추가
sys.path.insert(0, "/app/srtgo")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("railpass.worker")


def get_redis_client():
    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, db=0, decode_responses=True)


def main():
    r = get_redis_client()
    logger.info("🚂 RailPass Worker 시작 - Redis 큐 대기 중...")

    running = True

    def signal_handler(sig, frame):
        nonlocal running
        logger.info("종료 신호 수신 - 워커 종료 중...")
        running = False

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    while running:
        try:
            # 블로킹 팝 (최대 2초 대기)
            result = r.brpop("railpass:jobs", timeout=2)
            if result is None:
                continue

            _, raw_data = result
            job_data = json.loads(raw_data)
            job_id = job_data.get("job_id")

            logger.info(f"새 작업 수신: job_id={job_id}")

            # 취소 체크
            if r.exists(f"railpass:cancel:{job_id}"):
                logger.info(f"작업 취소됨: {job_id}")
                _update_status(r, job_id, "CANCELLED", 0, 0, "사용자에 의해 취소됨")
                continue

            # 워커 실행 (별도 프로세스)
            from app.workers.reservation_worker import run_reservation
            try:
                run_reservation(r, job_data)
            except Exception as e:
                logger.error(f"작업 실패: {job_id} - {e}")
                _update_status(r, job_id, "FAILED", 0, 0, str(e))

        except redis.exceptions.ConnectionError as e:
            logger.error(f"Redis 연결 오류: {e} - 5초 후 재시도")
            time.sleep(5)
        except Exception as e:
            logger.error(f"워커 오류: {e}")
            time.sleep(1)

    logger.info("워커 종료")


def _update_status(r: redis.Redis, job_id: str, status: str, try_count: int, elapsed: int, message: str):
    data = json.dumps({
        "job_id": job_id,
        "status": status,
        "try_count": try_count,
        "elapsed_seconds": elapsed,
        "message": message,
    })
    r.set(f"railpass:status:{job_id}", data, ex=86400)
    r.publish(f"railpass:ws:{job_id}", data)


if __name__ == "__main__":
    main()
