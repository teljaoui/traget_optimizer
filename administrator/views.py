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
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        telephone = request.POST.get('telephone')
        password = request.POST.get('password')
        role = request.POST.get('role')

        if not email:
            messages.error(request, "L'email est obligatoire")
            return redirect('user_add')
        elif not password:
            messages.error(request, "Le mot de passe est obligatoire")
            return redirect('user_add')
        
        new_user = User(
            first_name = first_name,
            last_name = last_name,
            email = email,
            telephone = telephone,
            role = role
        )
        new_user.set_password(password)
        new_user.save()
        
        messages.success(request, "Utilisateur créé avec succès")
        return redirect('user_index')
    
    return render(request, 'administrator/pages/users/ajouter.html')


@admin_required
def user_update(request, id):
    user = get_object_or_404(User, id=id)
    
    if request.method == 'POST':
        # Récupération des données du formulaire
        user.first_name = request.POST.get('first_name')
        user.last_name = request.POST.get('last_name')
        user.email = request.POST.get('email')
        user.role = request.POST.get('role')
        user.telephone = request.POST.get('telephone')
        
        user.is_active = 'is_active' in request.POST
        
        new_password = request.POST.get('password')
        if new_password:
            user.set_password(new_password)
            
        user.save()
        messages.success(request, f"L'utilisateur {user.first_name} a été mis à jour.")
        return redirect('user_index')
        
    return render(request, 'administrator/pages/users/modifier.html', {'user': user})
    
    
@admin_required
def user_delete(request, id):
    user_to_delete = get_object_or_404(User, id=id)
    
    if user_to_delete.id == request.session.get('user_id'):
        messages.error(request, "Vous ne pouvez pas supprimer votre propre compte.")
        return redirect('user_index')

    try:
        user_to_delete.delete()
        messages.success(request, "Utilisateur supprimé avec succès.")
    except ProtectedError:
        messages.error(request, "Impossible de supprimer cet utilisateur car il est lié à d'autres données (ex: Zones, Affectations).")
    
    return redirect('user_index')
