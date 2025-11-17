from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest
from django.shortcuts import get_object_or_404, redirect, render, resolve_url
from django.utils import timezone

from quiz.services.answer_service import evaluate_answer

from ..forms import AnswerForm
from ..models import Answer, Question


@login_required(login_url='common:login')
def answer_create(request: HttpRequest, question_id):
    question: Question = get_object_or_404(Question, pk=question_id)
    if request.method == "POST":
        form = AnswerForm(request.POST)
        if form.is_valid():
            answer: Answer = form.save(commit=False)
            answer.author = request.user
            answer.create_date = timezone.now()
            answer.question = question
            evaluate_answer(answer) # 정답 자동 판정
            answer.save()
            return redirect("quiz:detail", question_id=question.id)
    else:
        form = AnswerForm()
    return render(request, "quiz/question_detail.html", {"question": question, "form": form})

@login_required(login_url='common:login')
def answer_modify(request: HttpRequest, answer_id: int):
    answer = get_object_or_404(Answer, pk=answer_id)

    if request.user != answer.author:
        messages.error(request, '수정 권한이 없습니다')
        return redirect('quiz:detail', question_id = answer.question.id)
    
    if request.method == "POST":
        form = AnswerForm(request.POST, instance=answer)
        if form.is_valid():
            answer = form.save(commit=False)
            answer.author = request.user
            answer.modify_date = timezone.now()
            evaluate_answer(answer) # 정답 자동 판정
            answer.save()
            #return redirect('quiz:detail', question_id = answer.question.id)
            return redirect('{}#answer_{}'.format(
                resolve_url('quiz:detail', question_id=answer.question.id), answer.id))

    else:
        form = AnswerForm(instance=answer)
    context = {'answer':answer,'form':form}
    return render(request, "quiz/answer_form.html", context)

@login_required(login_url='common:login')
def answer_delete(request: HttpRequest, answer_id: int):
    answer = get_object_or_404(Answer, pk=answer_id)
    if request.user != answer.author:
        messages.error(request, '삭제 권한이 없습니다')
    else:
        answer.delete()
    return redirect('quiz:detail', question_id=answer.question.id)


@login_required(login_url='common:login')
def answer_vote(request: HttpRequest, answer_id: int):
    answer = get_object_or_404(Answer, pk=answer_id)
    if request.user == answer.author:
        messages.error(request, '본인이 작성한 답변은 추천할 수 없습니다.')
    else:
        answer.voter.add(request.user)
    return redirect('quiz:detail', question_id=answer.question.id)

@login_required(login_url='common:login')
def answer_toggle_correct(request, answer_id):
    answer = get_object_or_404(Answer, pk=answer_id)
    question = answer.question

    # 권한 확인: 질문 작성자만 가능
    if request.user != question.author:
        messages.error(request, "질문 작성자만 정답을 변경할 수 있습니다.")
        return redirect('quiz:detail', question_id=question.id)

    # 토글 동작
    if answer.is_correct:
        # 이미 정답이면 해제
        answer.is_correct = False
    else:
        # 새 정답 지정 → 기존 정답 해제
        Answer.objects.filter(question=question, is_correct=True).update(is_correct=False)
        answer.is_correct = True

    answer.save()
    return redirect('{}#answer_{}'.format(
        resolve_url(to='quiz:detail', question_id = answer.question.id),
        answer.id
    ))
