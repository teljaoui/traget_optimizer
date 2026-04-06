# utilisateur/views.py
from accounts.decorators import user_required
from django.shortcuts import render

@user_required
def user_dashboard(request):
    return render(request, 'utilisateur/pages/dashboard.html')