# 1. 베이스 이미지 설정
FROM python:3.10-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 필요한 파일 복사
COPY requirements.txt /app/

# 4. 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 5. 전체 소스 복사
COPY . /app/

# 6. 포트 노출
EXPOSE 8000

# 7. Gunicorn 실행 명령어
CMD ["gunicorn", "mysite.wsgi:application", "--bind", "0.0.0.0:8000"]

