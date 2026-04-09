import django
import os
import csv

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from administrator.models import Sommet 

with open('sommets_up.csv', newline='') as f:
    reader = csv.DictReader(f)
    sommets = [
        Sommet(
            latitude=float(row['latitude']),
            longitude=float(row['longitude'])
        )
        for row in reader
    ]

    Sommet.objects.bulk_create(sommets)
    print(f"{len(sommets)} sommets importés.")