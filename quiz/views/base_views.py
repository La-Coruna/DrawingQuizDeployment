from django.core.paginator import Paginator
from django.http import HttpRequest
from django.shortcuts import get_object_or_404, render
from django.db.models import Q, Count

from ..models import Question


def index(request: HttpRequest):
    
    # 입력 인자
    page = request.GET.get('page','1')  # 페이지
    kw = request.GET.get('kw', '')      # 검색어
    so = request.GET.get('so','recent')
    
    # 정렬
    if so == 'recommend':
        question_list = Question.objects.annotate(num_voter=Count('voter')).order_by('-num_voter', '-create_date')
    elif so == 'popular':
        question_list = Question.objects.annotate(num_answer=Count('answer')).order_by('-num_answer', '-create_date')
    else: # recent
        question_list = Question.objects.order_by('-create_date')
    
    # 조회
    if kw:
        question_list = question_list.filter(
            Q(subject__icontains = kw) |
            Q(content__icontains = kw) |
            Q(author__username__icontains = kw) |
            Q(answer__author__username__icontains = kw)            
        ).distinct()
    
    paginator = Paginator(question_list, 10)
    page_obj = paginator.get_page(page)
    context = {'question_list': page_obj, 'page': page, 'kw': kw, 'so': so}
    return render(request, 'quiz/question_list.html', context)

def detail(request: HttpRequest, question_id):
    question = get_object_or_404(Question, id=question_id)
    context = {'question': question}
    return render(request, 'quiz/question_detail.html', context)