from django.urls import path
from . import views

urlpatterns = [
    path('', views.admin_dashboard, name='admin_dashboard'),

    # USERS
    path('utilisateurs/', views.user_index, name='user_index'),
    path('utilisateurs/ajouter/', views.user_add, name='user_add'),
    path('utilisateurs/modifier/<int:id>/', views.user_update, name='user_update'),

    # OPTIMISATION
    path('optimisation/index/', views.optimisation_index, name='liste_optimisation'),
    path('optimisation/ajouter/', views.optimisation_add, name='ajouter_optimisation'),
    path('optimisation/modifier/<int:id>/', views.optimisation_update, name='modifier_optimisation'),

    # ZONE
    path('optimisation/zone/index/', views.optimisation_zone, name='zone_optimisation'),
    path('optimisation/zone/detail/<int:id>/', views.optimisation_zone_detail, name='zone_detail_optimisation'),
]