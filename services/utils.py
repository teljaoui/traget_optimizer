import math

# ============================================================
# UTILITAIRES COMMUNS
# ============================================================

def point_in_polygon(lat, lng, points):
    """Algorithme Ray-Casting pour vérifier si un point est dans un polygone"""
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
    """Distance réelle en kilomètres entre deux sommets (formule Haversine)."""
    R = 6371  # Rayon de la Terre en km

    lat1 = math.radians(a['latitude'])
    lat2 = math.radians(b['latitude'])
    dlat = math.radians(b['latitude'] - a['latitude'])
    dlng = math.radians(b['longitude'] - a['longitude'])

    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(x), math.sqrt(1 - x))

    return R * c  # Résultat en km


def distance_totale_chemin(chemin):
    """Calcule la distance totale d'un chemin."""
    return sum(
        distance(chemin[i], chemin[i + 1])
        for i in range(len(chemin) - 1)
    )


# ============================================================
# ALGORITHME 1 : TSP Nearest Neighbor
# ============================================================

def tsp_nearest_neighbor(sommets):
    """Heuristique du plus proche voisin pour TSP."""
    if not sommets:
        return []

    non_visites = list(sommets)
    chemin = [non_visites.pop(0)]

    while non_visites:
        dernier = chemin[-1]
        plus_proche = min(non_visites, key=lambda s: distance(dernier, s))
        chemin.append(plus_proche)
        non_visites.remove(plus_proche)

    chemin.append(chemin[0])  # Retour au départ
    return chemin


# ============================================================
# ALGORITHME 2 : TSP 2-opt (amélioration du Nearest Neighbor)
# ============================================================

def tsp_2opt(sommets):
    """
    Améliore un chemin TSP en inversant des segments pour réduire la distance.
    Utilise d'abord Nearest Neighbor comme base, puis applique 2-opt.
    """
    if len(sommets) < 4:
        return tsp_nearest_neighbor(sommets)

    # Base : Nearest Neighbor (sans le retour au départ)
    chemin = tsp_nearest_neighbor(sommets)[:-1]

    ameliore = True
    while ameliore:
        ameliore = False
        for i in range(1, len(chemin) - 1):
            for j in range(i + 1, len(chemin)):
                # Distance avant l'échange
                avant = distance(chemin[i - 1], chemin[i]) + distance(chemin[j - 1], chemin[j])
                # Distance après l'échange (inversion du segment i..j)
                apres = distance(chemin[i - 1], chemin[j - 1]) + distance(chemin[i], chemin[j])

                if apres < avant:
                    chemin[i:j] = chemin[i:j][::-1]  # Inverser le segment
                    ameliore = True

    chemin.append(chemin[0])  # Retour au départ
    return chemin


# ============================================================
# DISPATCHER CENTRAL — point d'entrée unique
# ============================================================

def executer_algorithme(nom_algorithme, sommets, **kwargs):
    """
    Dispatcher central : choisit et exécute le bon algorithme
    selon le nom stocké en base de données.
    
    Retourne : {'chemin': [...], 'distance_totale': float}
    """
    nom = nom_algorithme.strip().upper()

    if nom == 'TSP':
        chemin = tsp_nearest_neighbor(sommets)

    elif nom == 'TSP 2-OPT':
        chemin = tsp_2opt(sommets)

    else:
        raise ValueError(f"Algorithme inconnu : '{nom_algorithme}'")

    dist = distance_totale_chemin(chemin)

    return {
        'chemin': chemin,
        'distance_totale': round(dist, 6),
        'nb_sommets': len(chemin),
    }