from django.urls import path
from . import views

urlpatterns = [
    path('', views.admin_dashboard, name='admin_dashboard'),

    # USERS
    path('utilisateurs/', views.user_index, name='user_index'),
    path('utilisateurs/ajouter/', views.user_add, name='user_add'),
    path('utilisateurs/modifier/<int:id>/', views.user_update, name='user_update'),
    path('utilisateurs/supprimer/<int:id>/', views.user_delete, name='user_delete'),

    # OPTIMISATION
    path('optimisation/index/', views.optimisation_index, name='optimisation_index'),
    path('optimisation/ajouter/', views.optimisation_add, name='optimisation_add'),
    path('optimisation/modifier/<int:id>/', views.optimisation_update, name='optimisation_update'),
    path('optimisation/delete/<int:id>/', views.optimisation_delete, name='optimisation_delete'),


    # ZONE
    path('optimisation/zone/index/<int:id>/', views.optimisation_zone, name='zone_optimisation'),
    path('optimisation/zone/detail/<int:id>/', views.optimisation_zone_detail, name='zone_detail_optimisation'),
]