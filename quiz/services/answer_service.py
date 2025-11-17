import re
from quiz.models import Answer

def normalize_text(text: str) -> str:
    """
    공백, 특수문자 제거 + 소문자로 통일
    """
    if not text:
        return ''
    return re.sub(r'[^0-9a-zA-Z가-힣]', '', text).lower().strip()

def check_correct_answer(user_answer: str, correct_answer: str) -> bool:
    """
    사용자의 답변과 정답을 비교하여 일치 여부 반환
    """
    return normalize_text(user_answer) == normalize_text(correct_answer)

def evaluate_answer(answer: Answer):
    """
    Answer 객체를 받아서 정답 여부(is_correct)를 자동 판정
    """
    question = answer.question
    if not question.correct_answer:
        answer.is_correct = False
        return

    if check_correct_answer(answer.content, question.correct_answer):
        answer.is_correct = True
    else:
        answer.is_correct = False
