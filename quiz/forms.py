from django import forms

from drawing.models import Drawing

from .models import Answer, Comment, Question


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['subject', 'content', 'drawing', 'correct_answer']
        labels = {
            'subject': '퀴즈 제목',
            'content': '작가의 말',
            'drawing': '그림 선택',
            'correct_answer': '퀴즈 정답',
        }
        widgets = {
            'content': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 5,
                'placeholder': '당신의 그림에 대한 구차한 변명을 적어도 좋습니다.'
            }),
            'correct_answer': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '입력한 정답을 기반으로 자동 채점이 진행됩니다.'
            }),
        }

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)  # ✅ 뷰에서 전달받은 user
        super().__init__(*args, **kwargs)

        if 'drawing' in self.fields:
            if user:
                # ✅ 로그인한 사용자의 그림만 표시
                self.fields['drawing'].queryset = Drawing.objects.filter(author=user)
            else:
                # 로그인하지 않았으면 아무 그림도 표시 안 함
                self.fields['drawing'].queryset = Drawing.objects.none()
        
class AnswerForm(forms.ModelForm):
    class Meta:
        model = Answer
        fields = ['content']
        labels = {
            'content': '답변 내용',
        }    

class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['content']
        labels = {
            'content': '댓글 내용',
        }    