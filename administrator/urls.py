from django.urls import path
from . import views

urlpatterns = [
    path('', views.admin_dashboard, name='admin_dashboard'),
    path('optimisation/index/', views.optimisation_index, name='liste_optimisation'),
    path('optimisation/ajouter/', views.optimisation_add, name='ajouter_optimisation'),
    path('optimisation/modifer/', views.optimisation_update, name='modifer_optimisation'),
    path('optimisation/zone/index', views.optimisation_zone, name='zone_optimisation'),
    path('optimisation/zone/detail', views.optimisation_zone_detail, name='zone_detail_optimisation'),

]