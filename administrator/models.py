from django.db import models
from accounts.models import User


class Algorithme(models.Model):
    nom         = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'algorithmes'

    def __str__(self):
        return self.nom


class Optimisation(models.Model):
    nom        = models.CharField(max_length=150)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'optimisations'

    def __str__(self):
        return self.nom


class Zone(models.Model):
    nom           = models.CharField(max_length=150)
    optimisation  = models.ForeignKey(
                        Optimisation,
                        on_delete=models.CASCADE,
                        related_name='zones'
                    )
    algorithme    = models.ForeignKey(
                        Algorithme,
                        on_delete=models.SET_NULL,
                        null=True,
                        blank=True,
                        related_name='zones'
                    )

    class Meta:
        db_table = 'zones'

    def __str__(self):
        return f"{self.nom} ({self.optimisation})"


class Sommet(models.Model):
    latitude  = models.FloatField()
    longitude = models.FloatField()

    class Meta:
        db_table = 'sommets'

    def __str__(self):
        return f"({self.latitude}, {self.longitude})"


class PointZone(models.Model):
    zone      = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='points')
    latitude = models.FloatField()
    longitude = models.FloatField()
    ordre     = models.PositiveIntegerField()

    class Meta:
        db_table      = 'point_zones'
        ordering      = ['ordre']
        unique_together = [('zone', 'ordre')]

class Trajet(models.Model):
    zone            = models.ForeignKey(
                          Zone,
                          on_delete=models.CASCADE,
                          related_name='trajets'
                      )
    distance_totale = models.FloatField(default=0.0)
    duree_totale    = models.FloatField(default=0.0)

    class Meta:
        db_table = 'trajets'

    def __str__(self):
        return f"Trajet zone {self.zone_id} – {self.distance_totale} km"


class TrajetSommet(models.Model):
    trajet = models.ForeignKey(
                 Trajet,
                 on_delete=models.CASCADE,
                 related_name='sommets'
             )
    sommet = models.ForeignKey(
                 Sommet,
                 on_delete=models.CASCADE,
                 related_name='trajet_sommets'
             )
    ordre  = models.PositiveIntegerField()

    class Meta:
        db_table = 'trajet_sommets'
        ordering = ['ordre']
        unique_together = [('trajet', 'ordre')]

    def __str__(self):
        return f"Trajet {self.trajet_id} – Sommet {self.sommet_id} (ordre {self.ordre})"


class Affectation(models.Model):
    user = models.ForeignKey(
               User,
               on_delete=models.CASCADE,
               related_name='affectations'
           )
    zone = models.ForeignKey(
               Zone,
               on_delete=models.CASCADE,
               related_name='affectations'
           )

    class Meta:
        db_table = 'affectations'
        unique_together = [('user', 'zone')]

    def __str__(self):
        return f"{self.user} → {self.zone}"