import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

# Créer admin
if not User.objects.filter(email='admin@test.com').exists():
    admin = User(
        first_name='Admin',
        last_name='Test',
        email='admin@gmail.com',
        telephone='0600000000',
        role='ADMIN',
        is_active=True
    )
    admin.set_password('admin123')
    admin.save()
    print("Admin créé")
else:
    print("Admin existe déjà")

# Créer user normal
if not User.objects.filter(email='user@test.com').exists():
    user = User(
        first_name='User',
        last_name='Test',
        email='user@gmail.com',
        telephone='0600000001',
        role='USER',
        is_active=True
    )
    user.set_password('user123')
    user.save()
    print("User créé")
else:
    print("User existe déjà")