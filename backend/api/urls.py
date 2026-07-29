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
    path("login/", MyTokenObtainPairView.as_view(), name="login"),
    path('token/refresh/', TokenRefreshView.as_view()),

    path("create_class/", CreateClassView.as_view(), name="create_class"),
    path("create_class_accounts/", CreateClassAccounts.as_view(), name="create_class_accounts"),
    path("select_classes/", FilterClasses.as_view(), name="filter_class"),
    path("current_user/", CurrentUser.as_view(), name="current_user"),
    path("announcements/", AnnouncementListView.as_view(), name="announcements"),
    path("select_students/<int:class_id>/", StudentsInClassListView.as_view(), name="student_list"),
    path("select_teachers/<int:class_id>/", TeachersInClassListView.as_view(), name="teacher_list"),
    path("remove_teacher/<int:class_id>/", RemoveTeacherView.as_view(), name="remove_teacher"),
    path("remove_student/<int:class_id>/", RemoveStudentView.as_view(), name="remove_student"),
    path("add_teacher/<int:class_id>/", AddTeacherView.as_view(), name="add_teachert"),
    path("add_student/<int:class_id>/", AddStudentView.as_view(), name="add_student"),

    path("remove_parent/<student_id>/", RemoveParentView.as_view(), name="remove_parent"),
    path("remove_child/<parent_id>/", RemoveChildView.as_view(), name="remove_child"),

    path("add_child/<parent_id>/", AddChildView.as_view(), name="add_child"),
    path("add_parent/<student_id>/", AddParentView.as_view(), name="add_parent"),
    
    path("create_log/", CreateLogView.as_view(), name="create_log"),
    path("update_log/", UpdateLogView.as_view(), name='update_log'),
    path("delete_log/", DeleteLogView.as_view(), name='delete_log'),
    path("delete_user/<int:id>/", DeleteUserView.as_view(), name='delete_user'),
    path("teachers/", TeacherListView.as_view(), name='teachers'),
    path("parents/", ParentListView.as_view(), name='parents'),
    path("students/", StudentListView.as_view(), name='parents'),
    path("teachers/<int:id>/", SpecificTeacherListView.as_view(), name='teachers'),
    path("parents/<int:id>/", SpecificParentListView.as_view(), name='parents'),
    path("students/<int:id>/", SpecificStudentListView.as_view(), name='parents'),
    path("notifications/", UpdateNotificationsView.as_view(), name='notifications'),
    path("check_existing_accounts/", CheckExistingAccounts.as_view(), name='exsistingaccounts'),
    path("bulk_create_classes/", BulkCreateClasses.as_view(), name="bulk_create_classes"),
    path("change_password/", ChangePassword.as_view(), name="change_password"),

    path("male_list/", MaleListView.as_view(), name='male_list'),
    path("female_list/", FemaleListView.as_view(), name='female_list'),
    path("leaderboard/", LeaderboardListView.as_view(), name='leaderboard'),

    path("parent/students/", GetChildren.as_view(), name='children'),
    path("parent/students/<int:student_id>/week/", GetWeeklyLogsView.as_view(), name='weekly_logs'),
    path("parent/students/<int:student_id>/performance/", GetPerformanceView.as_view(), name='performance'),
    path("get_logs/", GetLogsView.as_view(), name='get_logs'),
    
    path("set_admin/<teacher_id>/", SetAdminView.as_view(), name='set_admin'),


    # Admin Views
    #path("admin/classes/", ClassesList.as_view(), name="admin_classes"),
]