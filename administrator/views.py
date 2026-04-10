# administrator/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import ProtectedError
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db import transaction
import json

from accounts.decorators import admin_required
from accounts.models import User
from .models import Optimisation, Zone, Sommet, PointZone, Affectation, Algorithme, Trajet
from services.utils import point_in_polygon, executer_algorithme
from django.urls import reverse



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
def optimisation_zone(request, id):
    optimisation = get_object_or_404(Optimisation, id=id)
    zones = optimisation.zones.all().prefetch_related('points', 'affectations__user')  # ✅ ajouter affectations__user

    zones_data = []
    for zone in zones:
        points = [
            {'lat': p.latitude, 'lng': p.longitude, 'ordre': p.ordre}
            for p in zone.points.all()
        ]
        zones_data.append({'id': zone.id, 'nom': zone.nom, 'points': points})

    sommets_data = list(Sommet.objects.values('id', 'latitude', 'longitude'))
    users = User.objects.all().values('id', 'first_name', 'last_name', 'email')

    return render(request, 'administrator/pages/optimisation/index_zone.html', {
        'optimisation': optimisation,
        'zones': zones,
        'zones_json': json.dumps(zones_data),
        'sommets_json': json.dumps(sommets_data),
        'users_json': json.dumps(list(users)),
    })

@admin_required
def zone_tsp_api(request, id):
    zone = get_object_or_404(Zone, id=id)

    points = [
        {'lat': p.latitude, 'lng': p.longitude, 'ordre': p.ordre}
        for p in zone.points.all().order_by('ordre')
    ]

    if len(points) < 3:
        return JsonResponse({'error': 'Zone insuffisante'}, status=400)

    algo_id = request.GET.get('algo_id')
    if not algo_id:
        return JsonResponse({'error': 'Algorithme non spécifié'}, status=400)

    algorithme = get_object_or_404(Algorithme, id=algo_id)

    tous_sommets = list(Sommet.objects.values('id', 'latitude', 'longitude'))
    sommets_dans_zone = [
        s for s in tous_sommets
        if point_in_polygon(s['latitude'], s['longitude'], points)
    ]

    if len(sommets_dans_zone) < 2:
        return JsonResponse({'error': 'Pas assez de sommets dans la zone'}, status=400)

    try:
        resultat = executer_algorithme(algorithme.nom, sommets_dans_zone)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({
    'chemin':          resultat['chemin'],
    'distance_totale': resultat['distance_totale'],
    'nb_sommets':      resultat['nb_sommets'],
    'algorithme':      algorithme.nom,
    'unite':           'km',  # ← ajouter
    })


@admin_required
@require_POST
def zone_create(request, optimisation_id):
    try:
        data          = json.loads(request.body)
        nom           = data.get('nom', '').strip()
        user_id       = data.get('user_id')
        algorithme_id = data.get('algorithme_id')
        points        = data.get('points', [])

        if not nom:
            return JsonResponse({'error': 'Nom requis'}, status=400)
        if len(points) < 3:
            return JsonResponse({'error': 'Au moins 3 points requis'}, status=400)

        optimisation = get_object_or_404(Optimisation, id=optimisation_id)

        with transaction.atomic():
            zone = Zone.objects.create(
                nom=nom,
                optimisation=optimisation,
                algorithme_id=algorithme_id,
            )

            for i, p in enumerate(points):
                # ✅ Direct dans PointZone, sans passer par Sommet
                PointZone.objects.create(
                    zone=zone,
                    latitude=p['lat'],
                    longitude=p['lng'],
                    ordre=i + 1
                )

            if user_id:
                user = get_object_or_404(User, id=user_id)
                Affectation.objects.get_or_create(user=user, zone=zone)

        return JsonResponse({'success': True, 'zone_id': zone.id})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
        
@admin_required
@require_POST
def zone_delete(request, zone_id):
    """
    Supprime une zone et redirige vers la liste des zones de l'optimisation parente.
    """
    zone = get_object_or_404(Zone, id=zone_id)
    
    # On stocke l'ID de l'optimisation avant la suppression
    optimisation_id = zone.optimisation.id 

    try:
        with transaction.atomic():
            zone.delete()
        
        # Message de succès (optionnel si vous utilisez les messages Django)
        messages.success(request, "La zone a été supprimée avec succès.")
        
        # Redirection vers 'zone_optimisation' avec l'ID récupéré
        return redirect(reverse('zone_optimisation', kwargs={'id': optimisation_id}))

    except Exception as e:
        # En cas d'erreur, on peut renvoyer vers la même page avec un message d'erreur
        messages.error(request, f"Erreur lors de la suppression : {str(e)}")
        return redirect(reverse('zone_optimisation', kwargs={'id': optimisation_id}))
    
@admin_required
def optimisation_zone_detail(request, id):
    zone = get_object_or_404(Zone, id=id)

    # ============================================================
    # 1. Données de la zone
    # ============================================================
    points_zone = list(zone.points.all().order_by('ordre'))

    points = [
        {'lat': p.latitude, 'lng': p.longitude}
        for p in points_zone
    ]

    zone_data = {
        'id': zone.id,
        'nom': zone.nom,
        'points': points
    }

    # ============================================================
    # 2. Tous les sommets (JS)
    # ============================================================
    tous_sommets = list(Sommet.objects.all())

    # Sommets dans la zone (pour affichage HTML)
    points_poly = [{'lat': p.latitude, 'lng': p.longitude} for p in points_zone]

    sommets_dans_zone = [
        s for s in tous_sommets
        if point_in_polygon(s.latitude, s.longitude, points_poly)
    ]

    # ============================================================
    # 3. Trajet + STATUS
    # ============================================================
    trajet = Trajet.objects.filter(zone=zone)\
        .prefetch_related('sommets__sommet')\
        .first()

    # Mapping : sommet_id → status
    status_map = {}

    if trajet:
        for ts in trajet.sommets.all():
            status_map[ts.sommet.id] = ts.status

    # ============================================================
    # 4. Sommets JSON (pour JS)
    # ============================================================
    sommets_data = [
        {
            'id': s.id,
            'latitude': float(s.latitude),
            'longitude': float(s.longitude),
            'status': status_map.get(s.id, 'en_attente')  # ✅ AJOUT
        }
        for s in tous_sommets
    ]

    # ============================================================
    # 5. Trajet JSON (pour JS)
    # ============================================================
    trajet_data = None

    if trajet:
        trajet_data = {
            'id': trajet.id,
            'distance_totale': float(trajet.distance_totale),
            'sommets': [
                {
                    'id': ts.sommet.id,
                    'ordre': ts.ordre,
                    'latitude': float(ts.sommet.latitude),
                    'longitude': float(ts.sommet.longitude),
                    'status': ts.status  # ✅ AJOUT
                }
                for ts in trajet.sommets.all().order_by('ordre')
            ]
        }

    # ============================================================
    # 6. Sommets pour HTML (liste à droite)
    # ============================================================
    sommets_zone = [
        {
            'obj': s,
            'status': status_map.get(s.id, 'en_attente')
        }
        for s in sommets_dans_zone
    ]

    # ============================================================
    # 7. Render
    # ============================================================
    return render(request, 'administrator/pages/optimisation/zone.html', {
        'zone': zone,
        'optimisation': zone.optimisation,

        'zone_json': json.dumps(zone_data),
        'sommets_json': json.dumps(sommets_data),
        'trajet_json': json.dumps(trajet_data) if trajet_data else 'null',

        'trajet': trajet,
        'sommets_zone': sommets_zone,

        'affectations': zone.affectations.select_related('user').all(),
        'algorithmes': Algorithme.objects.all(),
    })

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
            first_name=first_name,
            last_name=last_name,
            email=email,
            telephone=telephone,
            role=role
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
        messages.error(request,
                       "Impossible de supprimer cet utilisateur car il est lié à d'autres données (ex: Zones, Affectations).")

    return redirect('user_index')
