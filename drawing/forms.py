from django import forms
from .models import Drawing


class DrawingForm(forms.ModelForm):
    class Meta:
        model = Drawing
        fields = ["title", "subject"]
        labels = {
            "title": "제목",
            "subject": "주제",
        }
