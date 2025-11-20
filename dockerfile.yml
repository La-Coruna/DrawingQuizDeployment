# 1. Python 기반 이미지
FROM python:3.10-slim

# 2. 컨테이너 내부 작업폴더
WORKDIR /app

# 3. 시스템 패키지 + psycopg2 빌드 필수 도구 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. requirements.txt 복사 및 설치
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 5. 전체 프로젝트 복사
COPY . /app/

# 6. static 파일 수집
RUN python manage.py collectstatic --noinput

# 7. 웹 서비스 실행 (gunicorn)
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]

