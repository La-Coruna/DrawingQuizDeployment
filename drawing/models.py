from django.db import models
from django.contrib.auth.models import User

class Drawing(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='drawings')
    title = models.CharField(max_length=100, blank=True)
    subject = models.CharField(max_length=100, blank=True, help_text="그림 주제")
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title or '(제목 없음)'} by {self.author.username}"