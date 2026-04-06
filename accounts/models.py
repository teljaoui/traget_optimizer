from django.db import models
import hashlib


class User(models.Model):

    ROLE_ADMIN = 'ADMIN'
    ROLE_USER  = 'USER'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrateur'),
        (ROLE_USER,  'Utilisateur'),
    ]

    first_name  = models.CharField(max_length=100)
    last_name   = models.CharField(max_length=100)
    email       = models.EmailField(unique=True)
    password    = models.CharField(max_length=255)
    telephone   = models.CharField(max_length=20, blank=True, null=True)
    role        = models.CharField(
                    max_length=10,
                    choices=ROLE_CHOICES,
                    default=ROLE_USER
                  )
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def set_password(self, raw_password):
        """Hasher le mot de passe avec SHA256."""
        self.password = hashlib.sha256(raw_password.encode()).hexdigest()

    def check_password(self, raw_password):
        """Vérifier le mot de passe."""
        return self.password == hashlib.sha256(raw_password.encode()).hexdigest()

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"