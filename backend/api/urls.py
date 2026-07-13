from django.urls import path
from . import views
from .views import *
#from . import adminViews
#from .adminViews import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.views import TokenRefreshView
urlpatterns = [
    path('test/', views.test, name = "test"),
    path('register/', RegisterView.as_view(), name = "register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path('token/refresh/', TokenRefreshView.as_view()),

    path("create_class/", CreateClassView.as_view(), name="create_class"),
    path("create_class_accounts/", CreateClassAccounts.as_view(), name="create_class_accounts"),
    path("select_classes/", FilterClasses.as_view(), name="filter_class"),
    path("current_user/", CurrentUser.as_view(), name="current_user"),
    path("announcements/", AnnouncementListView.as_view(), name="announcements"),
    path("select_students/<int:class_id>/", StudentListView.as_view(), name="student_list"),
    path("create_log/", CreateLogView.as_view(), name="create_log"),
    path("update_log/", UpdateLogView.as_view(), name='update_log'),
    path("delete_log/", DeleteLogView.as_view(), name='delete_log'),
    path("teachers/", TeacherListView.as_view(), name='teachers'),
    path("parents/", ParentListView.as_view(), name='parents'),
    path("notifications/", UpdateNotificationsView.as_view(), name='notifications'),

    path("male_list/", MaleListView.as_view(), name='male_list'),
    path("female_list/", FemaleListView.as_view(), name='female_list'),
    path("leaderboard/", LeaderboardListView.as_view(), name='leaderboard'),

    path("parent/students/", GetChildren.as_view(), name='children'),
    path("parent/students/<int:student_id>/week/", GetWeeklyLogsView.as_view(), name='weekly_logs'),
    path("parent/students/<int:student_id>/performance/", GetPerformanceView.as_view(), name='performance'),
    path("get_logs/", GetLogsView.as_view(), name='get_logs'),
    

    # Admin Views
    #path("admin/classes/", ClassesList.as_view(), name="admin_classes"),
]