# administrator/views.py
from accounts.decorators import admin_required
from django.shortcuts import render

@admin_required
def admin_dashboard(request):
    return render(request, 'administrator/dashboard.html')