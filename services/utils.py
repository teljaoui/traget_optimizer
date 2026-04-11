import math

# ============================================================
# UTILITAIRES COMMUNS
# ============================================================

def point_in_polygon(lat, lng, points):
    n = len(points)
    inside = False
    px, py = lng, lat
    j = n - 1
    for i in range(n):
        xi, yi = points[i]['lng'], points[i]['lat']
        xj, yj = points[j]['lng'], points[j]['lat']
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def distance(a, b):
    R = 6371
    lat1 = math.radians(a['latitude'])
    lat2 = math.radians(b['latitude'])
    dlat = math.radians(b['latitude'] - a['latitude'])
    dlng = math.radians(b['longitude'] - a['longitude'])
    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(x), math.sqrt(1 - x))
    return R * c


def distance_totale_chemin(chemin):
    return sum(distance(chemin[i], chemin[i + 1]) for i in range(len(chemin) - 1))


# ============================================================
# ALGORITHME 1 : TSP Nearest Neighbor (avec contraintes optionnelles)
# ============================================================

def tsp_nearest_neighbor(sommets, points_importants=None):
    """
    Heuristique du plus proche voisin pour TSP.
    
    points_importants : liste ordonnée d'IDs de sommets à visiter EN PREMIER.
    Si None ou vide → comportement classique sans contrainte.
    """
    if not sommets:
        return []

    # --- Séparer les points importants des autres ---
    if points_importants:
        ids_importants = list(points_importants)  # ordre préservé
        debut = [s for id_ in ids_importants for s in sommets if s['id'] == id_]
        reste = [s for s in sommets if s['id'] not in ids_importants]
    else:
        debut = []
        reste = list(sommets)

    # --- Construire le chemin ---
    if debut:
        # Les points importants forment le début du chemin (dans l'ordre fourni)
        chemin = list(debut)
        non_visites = list(reste)
    else:
        # Comportement classique : départ depuis le premier sommet
        non_visites = list(reste)
        chemin = [non_visites.pop(0)]

    # Nearest neighbor pour les sommets restants
    while non_visites:
        dernier = chemin[-1]
        plus_proche = min(non_visites, key=lambda s: distance(dernier, s))
        chemin.append(plus_proche)
        non_visites.remove(plus_proche)

    chemin.append(chemin[0])  # Retour au départ
    return chemin


# ============================================================
# ALGORITHME 2 : TSP 2-opt (avec contraintes optionnelles)
# ============================================================

def tsp_2opt(sommets, points_importants=None):
    """
    TSP 2-opt avec contraintes optionnelles.
    
    points_importants : liste ordonnée d'IDs.
    Si fourni, les points importants sont FIXÉS en début de chemin
    et le 2-opt ne les déplace PAS (leurs positions [0..k] sont gelées).
    """
    if len(sommets) < 4:
        return tsp_nearest_neighbor(sommets, points_importants)

    # Base : Nearest Neighbor (sans le retour au départ)
    chemin = tsp_nearest_neighbor(sommets, points_importants)[:-1]

    # Nombre de points importants à geler en début de chemin
    nb_fixes = len(points_importants) if points_importants else 0
    # On commence le 2-opt APRÈS les points fixes
    debut_2opt = max(1, nb_fixes)

    ameliore = True
    while ameliore:
        ameliore = False
        for i in range(debut_2opt, len(chemin) - 1):
            for j in range(i + 1, len(chemin)):
                avant = distance(chemin[i - 1], chemin[i]) + distance(chemin[j - 1], chemin[j])
                apres = distance(chemin[i - 1], chemin[j - 1]) + distance(chemin[i], chemin[j])
                if apres < avant:
                    chemin[i:j] = chemin[i:j][::-1]
                    ameliore = True

    chemin.append(chemin[0])
    return chemin


# ============================================================
# DISPATCHER CENTRAL
# ============================================================

def executer_algorithme(nom_algorithme, sommets, points_importants=None):
    """
    Dispatcher central.
    
    points_importants : liste ordonnée d'IDs de sommets prioritaires (optionnel).
    Retourne : {'chemin': [...], 'distance_totale': float, 'nb_sommets': int}
    """
    nom = nom_algorithme.strip().upper()

    if nom == 'TSP':
        chemin = tsp_nearest_neighbor(sommets, points_importants)

    elif nom == 'TSP 2-OPT':
        chemin = tsp_2opt(sommets, points_importants)

    else:
        raise ValueError(f"Algorithme inconnu : '{nom_algorithme}'")

    dist = distance_totale_chemin(chemin)

    return {
        'chemin': chemin,
        'distance_totale': round(dist, 6),
        'nb_sommets': len(chemin),
    }