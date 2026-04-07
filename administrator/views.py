# administrator/views.py
from accounts.decorators import admin_required
from django.shortcuts import render

@admin_required
def admin_dashboard(request):
    return render(request, 'administrator/pages/dashboard.html')

@admin_required
def optimisation_index(request):
      return render(request, 'administrator/pages/optimisation/index.html')

@admin_required
def optimisation_add(request):
      return render(request, 'administrator/pages/optimisation/ajouter.html')

@admin_required
def optimisation_update(request):
      return render(request, 'administrator/pages/optimisation/modifier.html')

@admin_required
def optimisation_zone(request):
      return render(request, 'administrator/pages/optimisation/index_zone.html')

@admin_required
def optimisation_zone_detail(request):
      return render(request, 'administrator/pages/optimisation/zone.html')


