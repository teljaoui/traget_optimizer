from django.urls import path
from . import views

urlpatterns = [
    path('', views.user_dashboard, name='user_dashboard'),
    path('zone/<int:zone_id>/generer/',   views.agent_generer_trajet,  name='agent_generer_trajet'),
]
