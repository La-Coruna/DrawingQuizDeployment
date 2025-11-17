from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from ..forms import QuestionForm
from ..models import Question


@login_required(login_url='common:login')
def question_create(request: HttpRequest):
    if request.method == 'POST':
        form = QuestionForm(request.POST, user=request.user)
        if form.is_valid():
            question: Question = form.save(commit=False)
            question.author = request.user
            question.create_date = timezone.now()
            question.save()
            if question.drawing and not question.correct_answer:
                question.correct_answer = question.drawing.subject
            return redirect('quiz:index')
    else:
        form = QuestionForm(user=request.user)
    context = {'form': form}
    return render(request, 'quiz/question_form.html', context)

@login_required(login_url='common:login')
def question_modify(request: HttpRequest, question_id: int):
    question = get_object_or_404(Question, pk=question_id)
    if request.user != question.author:
        messages.error(request, '수정 권한이 없습니다')
        return redirect('quiz:detail', question_id = question.id)
    
    if request.method == "POST":
        form = QuestionForm(request.POST, request.FILES, instance=question, user=request.user)
        if form.is_valid():
            question = form.save(commit=False)
            question.author = request.user
            question.modify_date = timezone.now()
            question.save()
            return redirect('quiz:detail', question_id=question.id)
    else:
        form = QuestionForm(instance=question, user=request.user)

    context = {'form':form}
    return render(request, "quiz/question_form.html", context)

@login_required(login_url='common:login')
def question_delete(request: HttpRequest, question_id: int):
    question = get_object_or_404(Question, pk=question_id)
    if request.user != question.author:
        messages.error(request, '삭제 권한이 없습니다')
        return redirect('quiz:detail', question_id = question.id)
    question.delete()
    return redirect('quiz:index')

@login_required(login_url='common:login')
def question_vote(request: HttpRequest, question_id: int):
    question = get_object_or_404(Question, pk=question_id)
    if request.user == question.author:
        messages.error(request, '본인이 작성한 글은 추천할 수 없습니다.')
    else:
        question.voter.add(request.user)
    return redirect('quiz:detail', question_id=question_id)
