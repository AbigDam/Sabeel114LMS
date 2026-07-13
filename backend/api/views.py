from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model
from .serializers import *
from .models import *
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
User = get_user_model()

import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException


def send_email(email, message):

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = os.environ.get("BREVO_API_KEY")

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[
            {
                "email": email
            }
        ],
        sender={
            "email": "sabeel114@yahoo.com",
            "name": "Sabeel LMS"
        },
        subject="DAWN Daily Progress Report",
        text_content=message
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
    except ApiException as e:
        print("Email error:", e)

LOG_TYPE_MAP = {
    0: 'reading',
    1: 'memorization',
    2: 'review',
}
@api_view(['GET'])
def test(request):
    return Response({"message": "Testing!  Testing!  Message Recived?"})

class UpdateNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        user.email_notifications = not user.email_notifications
        user.save()
        return Response({"message": "Notifications updated successfully."})

class GetPerformanceView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, student_id):
        days_back = int(request.query_params.get('days'))
        student = get_object_or_404(User, id=student_id, role=2)
        logs = Log.objects.filter(student=student).order_by('-date')[:days_back]
        serializer = PerformanceSerializer(logs, many=True)
        return Response(serializer.data)


class GetWeeklyLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        start_date = parse_date(request.query_params.get("start_date"))

        if start_date is None:
            return Response(
                {"error": "A valid start_date (YYYY-MM-DD) is required."},
                status=400,
            )

        student = get_object_or_404(User, id=student_id, role=2)

        logs = (
            Log.objects
            .filter(student=student, date__gte=start_date)
            .order_by("date")[:7]
        )

        serializer = LogSerializer(logs, many=True)
        return Response(serializer.data)

class GetChildren(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        parent_id = request.user.id
        all_children = User.objects.filter(role=2)
        children = []
        for child in all_children:
            if child.parents and parent_id in child.parents:
                children.append(child)
        serializer = StudentSerializer(children, many=True)
        return Response(serializer.data)

def get_start_date(given_date):
    if given_date.day == 1:
        # Subtracting 1 day from the 1st always lands on the last day of the previous month
        previous_month_end = given_date - timedelta(days=1)
        return previous_month_end.replace(day=1)
    return given_date.replace(day=1)


class LeaderboardListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        date = request.query_params.get('date')
        date = parse_date(date)
        thirty_days_ago = get_start_date(date)
        students = list(User.objects.filter(role=2))
        for student in students:
            logs = Log.objects.filter(student=student, date__lte=date, date__gte=thirty_days_ago)
            student.score_at_date = sum(
                log.respect + log.behavior + (1 if log.attendance == 0 else 0) for log in logs)
        students.sort(key=lambda s: s.score_at_date, reverse=True)
        serializer = LeaderboardSerializer(students, many=True)
        return Response(serializer.data)

def compute_score_at_date(student, as_of_date):
    thirty_days_ago = get_start_date(as_of_date)
    logs = Log.objects.filter(student=student, date__lte=as_of_date, date__gte=thirty_days_ago)
    return sum(
        log.respect + log.behavior + (1 if log.attendance == 0 else 0)
        for log in logs
    )

class MaleListView(APIView):
    def get(self, request):
        first_of_month = timezone.now().date().replace(day=1)

        male_students = list(User.objects.filter(role=2, gender=True))
        for student in male_students:
            student.score_at_date = compute_score_at_date(student, first_of_month)

        male_students.sort(key=lambda s: s.score_at_date)

        serializer = StudentSerializer(male_students, many=True)
        return Response([s.first_name + s.last_name for s in male_students])


class FemaleListView(APIView):
    def get(self, request):
        first_of_month = timezone.now().date().replace(day=1)

        female_students = list(User.objects.filter(role=2, gender=False))
        for student in female_students:
            student.score_at_date = compute_score_at_date(student, first_of_month)

        female_students.sort(key=lambda s: s.score_at_date)

        serializer = StudentSerializer(female_students, many=True)
        return Response([s.first_name + s.last_name for s in female_students])

class ParentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        parents = (
            User.objects
            .filter(role=0)
            .order_by("last_name", "first_name")
        )

        serializer = ParentSerializer(parents, many=True)
        return Response(serializer.data)

class TeacherListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        teachers = (
            User.objects
            .filter(role=1)
            .order_by("last_name", "first_name")
        )

        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)

#Register
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username,
        }, status=status.HTTP_201_CREATED)

# Create Classroom
class CreateClassView(generics.CreateAPIView):
    serializer_class = CreateClassSerializer
    permission_classes = [IsAuthenticated]

# Return all Classes of a Teacher
class FilterClasses(APIView):
    def get(self, request):
        permission_classes = [IsAuthenticated]

        teacher_id = request.user.id
        all_classes = Classroom.objects.all()
        classes = []
        for classroom in all_classes:
            if teacher_id in classroom.teachers:
                classes.append(classroom)
        serializer  = ClassSerializer(classes, many=True)
        return Response(serializer.data)

class CurrentUser(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "email": request.user.email,
            "username": request.user.username,
            "is_superuser": request.user.is_staff or request.user.is_superuser,
            "role": request.user.role,
            "email_notifications": request.user.email_notifications,
        })

class AnnouncementListView(ListAPIView):
    queryset = Announcement.objects.all().order_by("-date")
    serializer_class = AnnouncementSerializer


class StudentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        classroom = get_object_or_404(Classroom, class_id=class_id)
        student_ids = classroom.students or []

        students = User.objects.filter(
            id__in=student_ids, 
            role=2
        )

        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)
        
class CreateLogView(generics.CreateAPIView):
    serializer_class = CreateLogSerializer
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = serializer.save()

        #send_email("adamkhurshid08@gmail.com", "message1")

        
        respect = "Did not meet expectations" if log.respect == 1 else "Meets expectations"
        behavior = "Needs Attention" if log.behavior == 1 else "Good" if log.behavior == 2 else "Excellent"
        print("Respect:", respect)
        print("Behavior:", behavior)
        if log.attendance == 0:
            log_message = f"A new report has been created for your child: {log.student.first_name} {log.student.last_name}\nDetails:\nDate: {log.date}\nRespect: {respect}\nBehavior: {behavior}\nAttendance: 'Present' \nComments: {log.comments}"
        else:
            log_message = f"A new report has been created for your child: {log.student.first_name} {log.student.last_name}\nDetails:\nDate: {log.date}\nAttendance: 'Absent'"
        print("Log Message:", log_message)
        student = log.student
        print(f"Student: {student.first_name} {student.last_name}, Parents: {student.parents}")
        if student.parents:
            print("Parents found")
            for parent_id in student.parents:
                parent = User.objects.get(id=parent_id)
                print(f"Parent: {parent.first_name} {parent.last_name}, Email: {parent.email}, Notifications Enabled: {parent.email_notifications}")
                if parent.email_notifications:
                    print(f"Sending email to: {parent.email}")
                    send_email(parent.email, log_message)
                else:
                    print(f"Skipping email for parent ID {parent_id}: No email or notifications disabled.")
                
            

        return Response({"id": log.log_id}, status=status.HTTP_201_CREATED)

class UpdateLogView(generics.GenericAPIView):
    serializer_class = CreateLogSerializer

    def get_object(self):
        return get_object_or_404(
            Log,
            log_id = self.request.data.get('log_id')
        )

    def post(self, request, *args, **kwargs):
        instance = self.get_object()
        
        old_respect_score = instance.respect
        old_behavior_score = instance.behavior
        old_attendance_score = 1 if instance.attendance == 0 else 0
        old_score = old_respect_score + old_behavior_score + old_attendance_score
        student = instance.student
        student.score -= old_score
        respect_score = request.data.get("respect", 0)
        behavior_score = request.data.get("behavior", 0)
        attendance_score = 1 if request.data.get("attendance", 1) == 0 else 0
        new_score = respect_score + behavior_score + attendance_score
        student.score += new_score
        student.save()
        if request.data.get('attendance') == 0:
            instance.comments = request.data.get('comments')
            instance.behavior = request.data.get('behavior')
            instance.respect = request.data.get('respect')
            instance.attendance = request.data.get('attendance')
            instance.save()
        else:
            instance.comments = ""
            instance.respect = None
            instance.behavior = None
            instance.attendance = request.data.get('attendance')
            instance.save()
        

        '''
        log = instance
        respect = "Did not meet expectations" if log.respect == 1 else "Meets expectations"
        behavior = "Needs Attention" if log.behavior == 1 else "Good" if log.behavior == 2 else "Excellent"
        if log.attendance == 0:
            log_message = f"A previous report was updated for your child: {log.student.first_name} {log.student.last_name}\n New Details:\nDate: {log.date}\nRespect: {respect}\nBehavior: {behavior}\nAttendance: 'Present' \nComments: {log.comments}"
        else:
            log_message = f"A previous report was updated for your child: {log.student.first_name} {log.student.last_name}\n New Details:\nDate: {log.date}\nAttendance: 'Absent'"
        '''        

        return Response({"id": instance.log_id}, status=status.HTTP_200_OK)


class DeleteLogView(generics.GenericAPIView):
    serializer_class = CreateLogSerializer

    def get_object(self):
        return get_object_or_404(
            Log,
            log_id = self.request.data.get('log_id')
        )

    def post(self, request, *args, **kwargs):
        instance = self.get_object()
        old_respect_score = instance.respect if instance.respect else 0
        old_behavior_score = instance.behavior if instance.behavior else 0
        old_attendance_score = 1 if instance.attendance == 0 else 0
        old_score = old_respect_score + old_behavior_score + old_attendance_score
        student = instance.student
        student.score -= old_score
        student.save()
        instance.delete()

        return Response({"id": instance.log_id}, status=status.HTTP_200_OK)

class GetLogsView(generics.GenericAPIView):
    def get(self, request, *args, **kwargs):
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({"error": "class_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        logs = Log.objects.filter(logged_by_id=class_id).select_related('student')

        result = {}
        for log in logs:
            student_id = log.student_id
            if student_id not in result:
                result[student_id] = []
            if log.attendance == 0:
                result[student_id].append({
                    "id": log.log_id,
                    "date": log.date.isoformat(),
                    "behavior": log.behavior,
                    "respect": log.respect,
                    "attendance": log.attendance,
                    "comments": log.comments,
                })
            else:
                result[student_id].append({
                    "id": log.log_id,
                    "date": log.date.isoformat(),
                    "attendance": log.attendance,
                })

        return Response(result, status=status.HTTP_200_OK)

class CreateClassAccounts(APIView):
     def post(self, request): 
        first_names = self.request.data.get("first_names") 
        last_names = self.request.data.get("last_names") 
        emails = self.request.data.get("emails") 
        class_name = self.request.data.get("class_name") 
        
        program = self.request.data.get("program") 
        schedule = self.request.data.get("schedule") 
        room = self.request.data.get("room") 
        gender = self.request.data.get("gender")
        teachers =  self.request.data.get("teacher_ids") 
        parents =  self.request.data.get("parent_ids") 
        
        classroom = Classroom.objects.create(class_name = class_name, teachers = teachers, program = program, schedule = schedule, room = room, status = True) 
        results = {"created": []}
        students = []
        for i in range(len(first_names)): 
            first_name = first_names[i] 
            last_name = last_names[i] 
            email = emails[i] 
            username = f"{first_name}{last_name}" 
            password = "studentpass" 
            role_obj = 2
            if User.objects.filter(username = first_name + last_name).exists():
                user = User.objects.get(username = first_name + last_name)
            else:
                user = User.objects.create_user(username = first_name + last_name, first_name = first_name, parents = parents, last_name = last_name, email = email, gender = gender, password = password, role = role_obj)
            students.append(user.id)
            results["created"].append( {"username":username, "student_id":user.id}) 
        classroom.students = students
        classroom.save()

        return Response(results, status=status.HTTP_201_CREATED)
