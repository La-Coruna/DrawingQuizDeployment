from django.urls import path

from . import views

app_name = 'drawing'

urlpatterns = [
    path('draw', views.draw_page, name="draw"),
    path('random-topic/', views.random_topic_api, name='random_topic'),
    path('', views.drawing_list, name="drawing_list"),
    path('my', views.drawing_list_my, name="drawing_list_my"),
    path('create', views.drawing_create, name='drawing_create'),
    path('delete/<int:drawing_id>/', views.drawing_delete, name='drawing_delete'),
    path('toggle-public/<int:drawing_id>/', views.drawing_toggle_public, name='drawing_toggle_public'),
    path('get_subject/<int:drawing_id>/', views.get_subject, name='get_subject'),
]