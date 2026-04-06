# config/urls.py
from django.urls import path, include
from accounts.views import login_view, logout_view

urlpatterns = [
    path('', include('administrator.urls')),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('agent/', include('utilisateur.urls')),
]