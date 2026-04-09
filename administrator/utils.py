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
    
