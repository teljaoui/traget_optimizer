# utilisateur/views.py
from accounts.decorators import user_required
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
import json

from accounts.models import User
from administrator.models import (
    Optimisation, Zone, Sommet, Affectation,
    Algorithme, Trajet, TrajetSommet, PointZone
)

from services.utils import point_in_polygon, executer_algorithme

@user_required
def user_dashboard(request):
    user_id = request.session.get('user_id')

    trajet        = None
    trajet_data   = None
    zone          = None
    zone_data     = None
    sommets_zone  = []
    sommets_data  = []
    algorithmes   = Algorithme.objects.all()

    optimisation_active = Optimisation.objects.filter(is_active=True).first()

    if optimisation_active:
        affectation = Affectation.objects.select_related(
            'zone__optimisation', 'zone__algorithme'
        ).filter(
            user_id=user_id,
            zone__optimisation=optimisation_active
        ).first()

        zone = affectation.zone if affectation else None

        if zone:
            points_zone = list(zone.points.order_by('ordre'))
            zone_data = {
                'id':   zone.id,
                'nom':  zone.nom,
                'points': [
                    {'lat': p.latitude, 'lng': p.longitude}
                    for p in points_zone
                ]
            }

            tous_sommets = list(Sommet.objects.all())
            points_poly  = [{'lat': p.latitude, 'lng': p.longitude} for p in points_zone]

            sommets_zone = [
                s for s in tous_sommets
                if point_in_polygon(s.latitude, s.longitude, points_poly)
            ]
            sommets_data = [
                {'id': s.id, 'latitude': float(s.latitude), 'longitude': float(s.longitude)}
                for s in tous_sommets 
            ]

            trajet = Trajet.objects.filter(zone=zone) \
                                   .prefetch_related('sommets__sommet') \
                                   .first()
            if trajet:
                trajet_data = {
                    'id':              trajet.id,
                    'distance_totale': float(trajet.distance_totale),
                    'zone_nom':        zone.nom,
                    'algorithme':      zone.algorithme.nom if zone.algorithme else 'N/A',
                    'sommets': [
                        {
                            'id':        ts.sommet.id,
                            'ordre':     ts.ordre,
                            'latitude':  float(ts.sommet.latitude),
                            'longitude': float(ts.sommet.longitude),
                            'status':    ts.status,  
                        }
                        for ts in trajet.sommets.all()
                    ]
                }

    return render(request, 'utilisateur/pages/dashboard.html', {
        'optimisation': optimisation_active,
        'zone':         zone,
        'trajet':       trajet,
        'trajet_json':  json.dumps(trajet_data)  if trajet_data  else 'null',
        'zone_json':    json.dumps(zone_data)    if zone_data    else 'null',
        'sommets_json': json.dumps(sommets_data) if sommets_data else '[]',
        'sommets_zone': sommets_zone,
        'algorithmes':  algorithmes,
    })


@user_required
def agent_generer_trajet(request, zone_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)

    user_id = request.session.get('user_id')
    user    = get_object_or_404(User, id=user_id)

    optimisation_active = Optimisation.objects.filter(is_active=True).first()
    if not optimisation_active:
        return JsonResponse({'error': 'Aucune optimisation active'}, status=400)

    zone = get_object_or_404(Zone, id=zone_id, optimisation=optimisation_active)

    if not Affectation.objects.filter(user=user, zone=zone).exists():
        return JsonResponse({'error': 'Zone non autorisée pour cet agent'}, status=403)

    try:
        body    = json.loads(request.body)
        algo_id = body.get('algo_id')
        points_importants = body.get('points_importants', []) 
    except (json.JSONDecodeError, AttributeError):
        algo_id           = request.POST.get('algo_id')
        points_importants = []

    if not algo_id:
        return JsonResponse({'error': 'Algorithme non spécifié'}, status=400)

    try:
        points_importants = [int(pid) for pid in points_importants]
    except (ValueError, TypeError):
        return JsonResponse({'error': 'points_importants invalides'}, status=400)

    algorithme = get_object_or_404(Algorithme, id=algo_id)

    points = [
        {'lat': p.latitude, 'lng': p.longitude, 'ordre': p.ordre}
        for p in zone.points.all().order_by('ordre')
    ]
    if len(points) < 3:
        return JsonResponse({'error': 'Zone insuffisante (moins de 3 points)'}, status=400)

    tous_sommets      = list(Sommet.objects.values('id', 'latitude', 'longitude'))
    sommets_dans_zone = [
        s for s in tous_sommets
        if point_in_polygon(s['latitude'], s['longitude'], points)
    ]
    if len(sommets_dans_zone) < 2:
        return JsonResponse({'error': 'Pas assez de sommets dans la zone'}, status=400)

    ids_dans_zone = {s['id'] for s in sommets_dans_zone}
    points_importants_valides = [pid for pid in points_importants if pid in ids_dans_zone]

    try:
        resultat = executer_algorithme(
            algorithme.nom,
            sommets_dans_zone,
            points_importants=points_importants_valides or None, 
        )
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)

    Trajet.objects.filter(zone=zone).delete()

    trajet = Trajet.objects.create(
        zone=zone,
        distance_totale=resultat['distance_totale'],
    )

    zone.algorithme = algorithme
    zone.save(update_fields=['algorithme'])

    for idx, sommet_data in enumerate(resultat['chemin'], start=1):
        sommet = get_object_or_404(Sommet, id=sommet_data['id'])
        TrajetSommet.objects.create(trajet=trajet, sommet=sommet, ordre=idx)

    trajet_data = {
        'id':              trajet.id,
        'distance_totale': float(trajet.distance_totale),
        'zone_nom':        zone.nom,
        'algorithme':      algorithme.nom,
        'sommets': [
            {
                'id':        ts.sommet.id,
                'ordre':     ts.ordre,
                'latitude':  float(ts.sommet.latitude),
                'longitude': float(ts.sommet.longitude),
            }
            for ts in trajet.sommets.all()
        ]
    }

    return JsonResponse({
        'success':         True,
        'trajet':          trajet_data,
        'nb_sommets':      resultat['nb_sommets'],
        'algorithme':      algorithme.nom,
        'points_fixes':    len(points_importants_valides),
        'unite':           'km',
    })

@user_required
def update_statut_sommet(request, trajet_id, ordre):
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON invalide'}, status=400)

    nouveau_statut = data.get('status')

    statuts_valides = [s.value for s in TrajetSommet.StatusChoices]
    if nouveau_statut not in statuts_valides:
        return JsonResponse({'error': f'Statut invalide. Valeurs acceptées : {statuts_valides}'}, status=400)

    ts = get_object_or_404(TrajetSommet, trajet_id=trajet_id, ordre=ordre)

    user_id = request.session.get('user_id')
    if not Affectation.objects.filter(user_id=user_id, zone=ts.trajet.zone).exists():
        return JsonResponse({'error': 'Accès non autorisé'}, status=403)

    if ts.status != TrajetSommet.StatusChoices.EN_ATTENTE and nouveau_statut == TrajetSommet.StatusChoices.EN_ATTENTE:
        return JsonResponse({'error': 'Impossible de repasser un point traité en attente'}, status=403)

    ts.status = nouveau_statut
    ts.save(update_fields=['status'])

    return JsonResponse({
        'success': True,
        'status':  ts.status,
        'ordre':   ts.ordre,
    })