import os
import re
import shutil
import unicodedata
from pathlib import Path

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponseNotAllowed, JsonResponse, Http404
from django.views.decorators.http import require_GET
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

from .models import Drawing
from .services import topic

# Create your views here.
@login_required(login_url='common:login')
def draw_page(request:HttpRequest):
    """그리기 페이지 - 서버에서 주제 하나 랜덤 선택"""
    random_topic = topic.get_random_topic()
    return render(request, 'drawing/draw.html', {'random_topic': random_topic})

@login_required
@require_GET
def random_topic_api(request):
    """AJAX 요청으로 새 주제 반환"""
    t = topic.get_random_topic()
    return JsonResponse({'topic': t})

@login_required(login_url='common:login')
def drawing_list(request:HttpRequest):
    drawings = Drawing.objects.filter(is_public=True).order_by('-created_at')
    return render(request, 'drawing/drawing_list.html', {'drawings':drawings})

@login_required(login_url='common:login')
def drawing_list_my(request:HttpRequest):
    drawings = Drawing.objects.filter(author=request.user).order_by('-created_at')
    return render(request, 'drawing/drawing_list_my.html', {'drawings':drawings})

@csrf_exempt  # JS가 FormData로 전송하므로 CSRF 예외 또는 토큰 처리 필요
@login_required
def drawing_create(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    user = request.user
    file = request.FILES.get('file')
    title = request.POST.get('title', '').strip()
    subject = request.POST.get('subject', '').strip()

    if not file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    # Drawing 인스턴스 생성
    drawing = Drawing.objects.create(
        author=user,
        title=title,
        subject=subject,
    )

    # 파일 저장
    save_path = Path(settings.BASE_DIR) / 'static' / 'assets' / 'images' / 'drawing'
    save_path.mkdir(parents=True, exist_ok=True)
    file_path = save_path / f"{drawing.id}.png"

    with open(file_path, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)

    return JsonResponse({
        'message': f'업로드 성공! id={drawing.id}',
        'id': drawing.id,
        'file_url': f"/static/assets/images/drawing/{drawing.id}.png"
    })

@login_required
def drawing_delete(request, drawing_id):
    """그림을 실제 삭제하지 않고 deleted 폴더로 이동 (한글 안전 버전)"""
    drawing = get_object_or_404(Drawing, pk=drawing_id, author=request.user)

    # 원본 파일 경로
    src_path = os.path.join(
        settings.BASE_DIR, 'static', 'assets', 'images', 'drawing', f"{drawing.id}.png"
    )

    # 삭제 보관 폴더 (deleted)
    deleted_dir = os.path.join(
        settings.BASE_DIR, 'static', 'assets', 'images', 'drawing', 'deleted'
    )
    os.makedirs(deleted_dir, exist_ok=True)

    # 🔤 파일명 안전 처리 함수 (한글 포함)
    def safe_name(value):
        if not value:
            return "none"
        # 한글, 영어, 숫자, 공백만 허용
        safe = re.sub(r'[^가-힣a-zA-Z0-9\s_-]', '', value)
        safe = re.sub(r'\s+', '_', safe.strip())  # 공백 → _
        safe = unicodedata.normalize('NFC', safe)  # 한글 조합형 안전화
        return safe[:80]  # 너무 길면 잘라냄

    title = safe_name(drawing.title or "untitled")
    subject = safe_name(drawing.subject or "none")

    # 새로운 파일명
    deleted_name = f"{drawing.id}_{drawing.author.id}_{title}_{subject}.png"
    dst_path = os.path.join(deleted_dir, deleted_name)

    # 파일 이동
    if os.path.exists(src_path):
        try:
            shutil.move(src_path, dst_path)
        except Exception as e:
            print(f"[Error] 파일 이동 실패: {e}")

    # DB 레코드 삭제
    drawing.delete()

    # Ajax 응답
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'id': drawing_id,
            'deleted': deleted_name
        })

    return redirect('drawing:drawing_list_my')

from django.http import JsonResponse

@login_required
def drawing_toggle_public(request, drawing_id):
    """공개 상태 토글"""
    drawing = get_object_or_404(Drawing, pk=drawing_id, author=request.user)
    drawing.is_public = not drawing.is_public
    drawing.save()
    return JsonResponse({'success': True, 'is_public': drawing.is_public})

@login_required
def get_subject(request, drawing_id):
    try:
        drawing = Drawing.objects.get(id=drawing_id)
        return JsonResponse({'subject': drawing.subject})
    except Drawing.DoesNotExist:
        raise Http404("Drawing not found")