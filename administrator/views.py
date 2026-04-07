# administrator/views.py
from accounts.decorators import admin_required
from django.shortcuts import render
from accounts.models import User
from .models import Optimisation
from django.contrib import messages
from django.shortcuts import render, redirect
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404, redirect



@admin_required
def admin_dashboard(request):
    return render(request, 'administrator/pages/dashboard.html')

@admin_required
def optimisation_index(request):
    optimisations = Optimisation.objects.all().order_by('-created_at')
    return render(request, 'administrator/pages/optimisation/index.html', {
        'optimisations': optimisations
    })

@admin_required
def optimisation_add(request):
    if request.method == 'POST':
        nom = request.POST.get('nom')
        is_active = request.POST.get('is_active')
        is_active = True if is_active == '1' else False

        if not nom:
            messages.error(request, "Le nom est obligatoire")
            return redirect('optimisation_add')

        if is_active:
            Optimisation.objects.filter(is_active=True).update(is_active=False)

        Optimisation.objects.create(nom=nom, is_active=is_active)
        messages.success(request, "Optimisation créée avec succès")
        return redirect('optimisation_index')

    return render(request, 'administrator/pages/optimisation/ajouter.html')


@admin_required
def optimisation_update(request, id):
    optimisation = Optimisation.objects.get(id=id)

    if request.method == 'POST':
        optimisation.nom = request.POST.get('nom')
        is_active = True if request.POST.get('is_active') == '1' else False

        if is_active:
            Optimisation.objects.filter(is_active=True).exclude(id=id).update(is_active=False)

        optimisation.is_active = is_active
        optimisation.save()
        messages.success(request, "Optimisation modifiée avec succès")
        return redirect('optimisation_index')

    return render(request, 'administrator/pages/optimisation/modifier.html', {
        'optimisation': optimisation
    })

@admin_required
def optimisation_delete(request, id):
    optimisation = get_object_or_404(Optimisation, id=id)

    try:
        optimisation.delete()
        messages.success(request, "Optimisation supprimée avec succès")

    except ProtectedError:
        messages.error(request, "Suppression impossible : utilisée dans d'autres données")

    return redirect('optimisation_index')

@admin_required
def optimisation_zone(request):
      return render(request, 'administrator/pages/optimisation/index_zone.html')

@admin_required
def optimisation_zone_detail(request):
      return render(request, 'administrator/pages/optimisation/zone.html')

@admin_required
def user_index(request):
    current_user_id = request.session.get('user_id')

    users = User.objects.exclude(id=current_user_id)

    return render(request, 'administrator/pages/users/index.html', {
        'users': users
    })

@admin_required
def user_add(request):
      return render(request, 'administrator/pages/users/ajouter.html')

@admin_required
def user_update(request):
      return render(request, 'administrator/pages/users/modifier.html')




