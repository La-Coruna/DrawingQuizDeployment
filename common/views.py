from django.http import HttpRequest
from django.contrib.auth import logout, authenticate, login
from django.shortcuts import redirect, render
from common.forms import UserForm


def logout_view(request: HttpRequest):
    logout(request)
    return redirect('index')

def signup(request: HttpRequest):
    if request.method == "POST":
        form = UserForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            return redirect('index')
    else:
        form = UserForm()
    return render(request, "common/signup.html", {'form':form})
