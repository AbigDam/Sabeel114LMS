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
from django.http import JsonResponse

User = get_user_model()

import os
import secrets
from django.db import transaction
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


class StudentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        students = User.objects.filter(role=2).order_by("last_name", "first_name")

        serializer = StudentSerializer(students, many=True)
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        teacher_id = request.user.id
        all_classes = Classroom.objects.all()
 #       classes = []
        if request.user.is_superuser or request.user.is_staff:
            classes = all_classes
        else:
            classes = [classroom for classroom in all_classes if classroom.teachers and teacher_id in classroom.teachers]
        # for classroom in all_classes:
        #    if teacher_id in classroom.teachers:
        #         classes.append(classroom)
        serializer  = ClassSerializer(classes, many=True)
        return Response(serializer.data)

class CurrentUser(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
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

class SpecificTeacherListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SpecificTeacherSerializer

    def get(self, request, id):
        teacher = User.objects.get(id = id)
        serializer = SpecificTeacherSerializer(teacher)

        return Response(serializer.data)

class SpecificStudentListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SpecificStudentSerializer

    def get(self, request, id):
        student = User.objects.get(id = id)
        serializer = SpecificStudentSerializer(student)

        return Response(serializer.data)

class SpecificParentListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SpecificParentSerializer

    def get(self, request, id):
        parent = User.objects.get(id = id)
        serializer = SpecificParentSerializer(parent)

        return Response(serializer.data)


class StudentsInClassListView(APIView):
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

class TeachersInClassListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        classroom = get_object_or_404(Classroom, class_id=class_id)
        teacher_ids = classroom.teachers or []

        teachers = User.objects.filter(
            id__in=teacher_ids, 
            role=1
        )

        serializer = StudentSerializer(teachers, many=True)
        return Response(serializer.data)

class RemoveTeacherView(APIView):
    def post(self, request, class_id, *args, **kwargs):
        teacher_id = self.request.data.get('teacher_id')
        classroom = get_object_or_404(Classroom, class_id=class_id)
        teacher_ids = classroom.teachers or []
        if teacher_id in teacher_ids:
            teacher_ids.remove(teacher_id)
        classroom.teachers = teacher_ids
        classroom.save()
        return Response({"id": teacher_id}, status=status.HTTP_201_CREATED)

class RemoveStudentView(APIView):
    def post(self, request, class_id, *args, **kwargs):
        student_id = self.request.data.get('student_id')
        classroom = get_object_or_404(Classroom, class_id=class_id)
        student_ids = classroom.students or []
        if student_id in student_ids:
            student_ids.remove(student_id)
        classroom.students = student_ids
        classroom.save()
        return Response({"id": student_id}, status=status.HTTP_201_CREATED)

class RemoveParentView(APIView):
    def post(self, request, student_id, *args, **kwargs):
        parent_id = self.request.data.get('parent_id')
        student = User.objects.get(id = student_id)
        parent_ids = student.parents or []
        if parent_id in parent_ids:
            parent_ids.remove(parent_id)
        student.parents = parent_ids
        student.save()
        return Response({"id": student_id}, status=status.HTTP_201_CREATED)


class RemoveChildView(APIView):
    def post(self, request, parent_id, *args, **kwargs):
        student_id = self.request.data.get('student_id')
        student = User.objects.get(id = student_id)
        parent_ids = student.parents or []
        if parent_id in parent_ids:
            parent_ids.remove(parent_id)
        student.parents = parent_ids
        student.save()
        return Response({"id": student_id}, status=status.HTTP_201_CREATED)

class AddParentView(APIView):
    def post(self, request, student_id, *args, **kwargs):
        parent_id = self.request.data.get('parent_id')
        student = User.objects.get(id = student_id)
        parent_ids = student.parents or []
        parent_ids.append(parent_id)
        student.parents = parent_ids
        student.save()
        return Response({"id": student_id}, status=status.HTTP_201_CREATED)

class AddChildView(APIView):
    def post(self, request, parent_id, *args, **kwargs):
        student_id = self.request.data.get('student_id')
        student = User.objects.get(id = student_id)
        parent_ids = student.parents or []
        parent_ids.append(parent_id)
        student.parents = parent_ids
        student.save()
        return Response({"id": student_id}, status=status.HTTP_201_CREATED)

class AddTeacherView(APIView):
    def post(self, request, class_id, *args, **kwargs):
        teacher_id = self.request.data.get('teacher_id')
        classroom = get_object_or_404(Classroom, class_id=class_id)
        teacher_ids = classroom.teachers or []
        teacher_ids.append(teacher_id)
        classroom.teachers = teacher_ids
        classroom.save()
        return Response({"id": teacher_id}, status=status.HTTP_201_CREATED)

class AddStudentView(APIView):
    def post(self, request, class_id, *args, **kwargs):
        student_id = self.request.data.get('student_id')
        classroom = get_object_or_404(Classroom, class_id=class_id)
        student_ids = classroom.students or []
        student_ids.append(student_id)
        classroom.students = student_ids
        classroom.save()
        return Response({"id": student_id}, status=status.HTTP_201_CREATED)


class CreateLogView(generics.CreateAPIView):
    serializer_class = CreateLogSerializer
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = serializer.save()

        #send_email("adamkhurshid08@gmail.com", "message1")

        
        respect = "Did not meet expectations" if log.respect == 1 else "Meets expectations"
        behavior = "Needs Attention" if log.behavior == 1 else "Good" if log.behavior == 2 else "Excellent"
        if log.attendance == 0:
            log_message = f"A new report has been created for your child: {log.student.first_name} {log.student.last_name}\nDetails:\nDate: {log.date}\nRespect: {respect}\nBehavior: {behavior}\nAttendance: 'Present' \nComments: {log.comments}"
        else:
            log_message = f"A new report has been created for your child: {log.student.first_name} {log.student.last_name}\nDetails:\nDate: {log.date}\nAttendance: 'Absent'"
        student = log.student
        if student.parents:
            for parent_id in student.parents:
                parent = User.objects.get(id=parent_id)
                if parent.email_notifications:
                    send_email(parent.email, log_message)
                
            

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
        
        log = instance
        respect = "Did not meet expectations" if log.respect == 1 else "Meets expectations"
        behavior = "Needs Attention" if log.behavior == 1 else "Good" if log.behavior == 2 else "Excellent"
        if log.attendance == 0:
            log_message = f"A previous report was updated for your child: {log.student.first_name} {log.student.last_name}\n New Details:\nDate: {log.date}\nRespect: {respect}\nBehavior: {behavior}\nAttendance: 'Present' \nComments: {log.comments}"
        else:
            log_message = f"A previous report was updated for your child: {log.student.first_name} {log.student.last_name}\n New Details:\nDate: {log.date}\nAttendance: 'Absent'"
         
        log = instance
        student = log.student
        if student.parents:
            for parent_id in student.parents:
                parent = User.objects.get(id=parent_id)
                if parent.email_notifications:
                    send_email(parent.email, log_message)
                

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


def _generate_unique_username(first_name, last_name):
    base = f"{first_name}{last_name}".replace(" ", "") or "user"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username


def _find_or_create_account(email, full_name, role, created_accounts, gender):
    """Find an existing User by email/name, or create one (role=0 Parent / role=1 Teacher).
    Returns None if no email was supplied (e.g. an optional TA row)."""
    email = (email or "").strip()
    name_parts = (full_name or "").strip().split()
    first_name = name_parts[0] if name_parts else email.split("@")[0]
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""


    if role == 2:
        name_parts_list = full_name.split(" ", 1)
        student_first_name = name_parts_list[0]
        student_last_name = name_parts_list[1] if len(name_parts) > 1 else ""
        existing = User.objects.filter(first_name=student_first_name, last_name=student_last_name).first()
        if existing != None:
            return existing
    else:
        existing = User.objects.filter(email=email).first()
        if existing != None:
            return existing

    username = _generate_unique_username(first_name, last_name)
    password = secrets.token_urlsafe(9)

    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=role,
        password=password,
        gender = gender,
    )
    user.temporary_passwords = password
    user.save()

    created_accounts.append({
        "username": username, "email": email, "role": role, "temporary_password": password,
    })
    return user


class BulkCreateClasses(APIView):
    """Accepts a flat list of parsed spreadsheet rows (one per student) and
    creates/reuses classes, teachers, TAs, parents, and students, linking them
    all together in one pass."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rows = self.request.data.get("rows") or []

        created_accounts = []
        classes_created = 0
        classes_reused = 0
        classroom_cache = {}

        with transaction.atomic():
            for row in rows:
                class_name = (row.get("class_name") or "").strip()
                if not class_name:
                    continue

                cache_key = class_name.lower()
                classroom = classroom_cache.get(cache_key)
                if classroom is None:
                    classroom = Classroom.objects.filter(class_name__iexact=class_name).first()
                    if classroom is None:
                        classroom = Classroom.objects.create(
                            class_name=class_name, teachers=[], students=[], status=True,
                        )
                        classes_created += 1
                    else:
                        classes_reused += 1
                    classroom_cache[cache_key] = classroom

                teacher = _find_or_create_account(row.get("teacher_email"), row.get("teacher_name"), 1, created_accounts, None)
                ta = _find_or_create_account(row.get("ta_email"), row.get("ta_name"), 1, created_accounts, None)
                parent = _find_or_create_account(row.get("parent_email"), row.get("parent_name"), 0, created_accounts, None)
                student = _find_or_create_account("", row.get("student_name"), 2, created_accounts, row.get("gender")=="Male")

                classroom.teachers = classroom.teachers or []
                for teacher_user in (teacher, ta):
                    if teacher_user and teacher_user.id not in classroom.teachers:
                        classroom.teachers.append(teacher_user.id)

                classroom.students = classroom.students or []
                if student.id not in classroom.students:
                    classroom.students.append(student.id)
                classroom.save()

                if parent:
                    student.parents = list(set((student.parents or []) + [parent.id]))
                    student.save()

        return Response({
            "classes_created": classes_created,
            "classes_reused": classes_reused,
            "accounts_created": created_accounts,
        }, status=status.HTTP_201_CREATED)



class CreateClassAccounts(APIView):
    def post(self, request):
        data = request.data
        class_name = data.get("class_name")
        gender = data.get("gender")
        teacher_entries = data.get("teachers") or []
        student_entries = data.get("students") or []

        if not class_name:
            return Response({"error": "class_name is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Shared list — _find_or_create_account appends to this every time it
        # actually creates a new account, so it doubles as our response payload.
        created_accounts = []

        # --- Teachers: existing (by id) or brand new (name + email) ---
        teacher_ids = []
        for entry in teacher_entries:
            teacher_id = entry.get("teacher_id")
            if teacher_id:
                try:
                    teacher = User.objects.get(id=teacher_id, role=1)
                except User.DoesNotExist:
                    return Response(
                        {"error": f"Teacher with id {teacher_id} was not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                first_name = (entry.get("first_name") or "").strip()
                last_name = (entry.get("last_name") or "").strip()
                email = (entry.get("email") or "").strip()
                if not first_name or not last_name or not email:
                    return Response(
                        {"error": "Each new teacher needs a first name, last name, and email."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                full_name = f"{first_name} {last_name}"
                teacher = _find_or_create_account(email, full_name, 1, created_accounts, None)

            teacher_ids.append(teacher.id)

        if Classroom.objects.filter(class_name=class_name).exists():
            classroom = Classroom.objects.get(class_name=class_name, status=True)
            if classroom.teachers:
                classroom.teachers.extend(teacher_ids)
            else:
                classroom.teachers = teacher_ids
            classroom.save()
        else:
            classroom,__ = Classroom.objects.get_or_create(class_name=class_name, teachers=teacher_ids, status=True)

        # --- Students: existing (by id) or brand new (name only — no email) ---
        student_ids = []
        for student_entry in student_entries:
            student_id = student_entry.get("student_id")
            if student_id:
                try:
                    student = User.objects.get(id=student_id, role=2)
                except User.DoesNotExist:
                    return Response(
                        {"error": f"Student with id {student_id} was not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                first_name = (student_entry.get("first_name") or "").strip()
                last_name = (student_entry.get("last_name") or "").strip()
                if not first_name or not last_name:
                    return Response(
                        {"error": "Each new student needs a first name and last name."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                full_name = f"{first_name} {last_name}"
                student = _find_or_create_account(None, full_name, 2, created_accounts, gender)

            # --- Parents for this student: existing (by id) or brand new (name + email) ---
            parent_ids = []
            for parent_entry in (student_entry.get("parents") or []):
                parent_id = parent_entry.get("parent_id")
                if parent_id:
                    try:
                        parent = User.objects.get(id=parent_id, role=0)
                    except User.DoesNotExist:
                        return Response(
                            {"error": f"Parent with id {parent_id} was not found."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    p_first = (parent_entry.get("first_name") or "").strip()
                    p_last = (parent_entry.get("last_name") or "").strip()
                    p_email = (parent_entry.get("email") or "").strip()
                    if not p_first or not p_email:
                        return Response(
                            {"error": "Each new parent needs at least a first name and email."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    p_full_name = f"{p_first} {p_last}".strip()
                    parent = _find_or_create_account(p_email, p_full_name, 0, created_accounts, None)

                parent_ids.append(parent.id)

            if parent_ids and student.parents:
                student.parents.extend(parent_ids)
                student.save()
            elif parent_ids:
                student.parents = parent_ids
                student.save()         

            student_ids.append(student.id)

        classroom.students.extend(student_ids)
        classroom.save()

        return Response({"created": created_accounts}, status=status.HTTP_201_CREATED)


class CheckExistingAccounts(APIView):

    def post(self, request):
        rows = self.request.data.get("rows", [])
        results = []

        for row in rows:
            teacher_email = (row.get("teacher_email") or "").strip()
            ta_email = (row.get("ta_email") or "").strip()
            parent_email = (row.get("parent_email") or "").strip()
            student_name = (row.get("student_name") or "").strip()

            teacher_exists = (
                User.objects.filter(email=teacher_email).exists()
                if teacher_email else False
            )
            ta_exists = (
                User.objects.filter(email=ta_email).exists()
                if ta_email else False
            )
            parent_exists = (
                User.objects.filter(email=parent_email).exists()
                if parent_email else False
            )

            if student_name:
                name_parts = student_name.split(" ", 1)
                student_first_name = name_parts[0]
                student_last_name = name_parts[1] if len(name_parts) > 1 else ""
                student_exists = User.objects.filter(
                    first_name=student_first_name, last_name=student_last_name
                ).exists()
            else:
                student_exists = False

                
            results.append({
                "teacher_exists": teacher_exists,
                "ta_exists": ta_exists,
                "student_exists": student_exists,
                "parent_exists": parent_exists,
            })

        return JsonResponse({"results": results})

