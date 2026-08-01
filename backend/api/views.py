from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
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
import os
import secrets
from django.db import transaction
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from rest_framework_simplejwt.views import TokenObtainPairView
import string
from .serializers import MyTokenObtainPairSerializer

User = get_user_model()


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

def send_email(email, message):
    print(f"Sending message ({message} to {email}")
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

    api_instance.send_transac_email(send_smtp_email)

def send_password_reset_email(email, message):
    print(f"Sending message ({message} to {email}")
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
        subject="Password Reset Request",
        text_content=message
    )

    api_instance.send_transac_email(send_smtp_email)

class ForgotPasswordView(APIView):
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)

        new_password = generate_temp_password()
        user.set_password(new_password)
        user.temporary_password = new_password
        user.save()

        send_password_reset_email(user.email, f"Someone has requested a password reset for your account. Your new temporary password is: {new_password}. You can login with this password and change it to something more memorable.")

        return Response({"message": "A new temporary password has been sent to your email."}, status=status.HTTP_200_OK)

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

        end_date = start_date + timedelta(days=6)
        student = get_object_or_404(User, id=student_id)

        logs = (
            Log.objects
            .filter(
                student=student,
                date__gte=start_date,
                date__lte=end_date,
            )
            .order_by("date")
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


class LeaderboardListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        date = request.query_params.get('date')
        date = parse_date(date)
        start_date = get_start_date(date)
        students = list(User.objects.filter(role=2))
        for student in students:
            logs = Log.objects.filter(student=student, date__lte=date, date__gte=start_date)
            student.score_at_date = compute_score_at_date(student, date)
        students.sort(key=lambda s: s.score_at_date, reverse=True)
        serializer = LeaderboardSerializer(students, many=True)
        return Response(serializer.data)

def get_start_date(given_date):
    return given_date.replace(day=1)

def compute_score_at_date(student, given_date):
    start_date = get_start_date(given_date)

    logs = Log.objects.filter(
        student=student,
        date__gte=start_date,
        date__lte=given_date,
    )

    return sum(
        calculate_score(
            log.respect,
            log.behavior,
            log.hw_prep,
            log.lesson_prog,
            log.attendance,
        )
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

class SetAdminView(APIView):
    def post(self, request, teacher_id, *args, **kwargs):
        teacher = User.objects.get(id = teacher_id)
        teacher.is_staff = not teacher.is_superuser
        teacher.is_superuser = not teacher.is_superuser
        teacher.save()
        return Response({"id": teacher_id}, status=status.HTTP_201_CREATED)

class DeleteUserView(APIView):
    def delete(self, request, id, *args, **kwargs):
        user = User.objects.get(id = id)
        user.delete()
        return Response({"id": id}, status=status.HTTP_201_CREATED)

class ChangePassword(APIView):
    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.temporary_password ="Password has been changed!"
        user.save()
    
        return Response(
            {'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK,
        )




# ---------------------------------------------------------------------------
# Label helpers — shared by both views
# ---------------------------------------------------------------------------
RATING_LABELS = {1: "Needs Attention", 2: "Good", 3: "Excellent"}


def rating_label(value):
    return RATING_LABELS.get(value, "N/A")


def respect_label(value):
    return "Did not meet expectations" if value == 1 else "Meets expectations"


def build_log_message(log, verb):
    """verb: 'created' or 'updated' — controls the intro line."""
    intro = "A new report has been created" if verb == "created" else "A previous report was updated"

    if log.attendance == 0:  # Present
        return (
            f"{intro} for your child: {log.student.first_name} {log.student.last_name}\n"
            f"Details:\n"
            f"Date: {log.date}\n"
            f"Attendance: Present\n"
            f"Homework Preparation: {rating_label(log.hw_prep)}\n"
            f"Homework Prep Comments: {log.hw_prep_comments or ''}\n"
            f"Participation: {rating_label(log.behavior)}\n"
            f"Respect: {respect_label(log.respect)}\n"
            f"Lesson Progress: {rating_label(log.lesson_prog)}\n"
            f"Lesson Progress Comments: {log.lesson_prog_comments or ''}\n"
            f"Next Lesson/Homework: {log.next_lesson or ''}\n"
            f"Additional Comments: {log.comments or ''}"
        )
    else:  # Absent
        return (
            f"{intro} for your child: {log.student.first_name} {log.student.last_name}\n"
            f"Details:\n"
            f"Date: {log.date}\n"
            f"Attendance: Absent"
        )


def notify_parents(log, verb):
    print("notifying parents!")
    student = log.student
    if student.parents:
        for parent_id in student.parents:
            parent = User.objects.get(id=parent_id)
            if parent.email_notifications:
                send_email(parent.email, build_log_message(log, verb))


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------
def calculate_score(respect, participation, hw_prep, lesson_prog, attendance):
    def shifted(value):
        return (value - 1) if value is not None else 0

    respect_score = shifted(respect)
    participation_score = shifted(participation)
    hw_prep_score = shifted(hw_prep)
    lesson_prog_score = shifted(lesson_prog)
    attendance_score = 1 if attendance == 0 else 0

    return respect_score + participation_score + hw_prep_score + lesson_prog_score + attendance_score

class CreateLogView(generics.CreateAPIView):
    serializer_class = CreateLogSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = serializer.save()
    
        notify_parents(log, verb="created")

        return Response({"id": log.log_id}, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------
class UpdateLogView(generics.GenericAPIView):
    serializer_class = CreateLogSerializer

    def get_object(self):
        return get_object_or_404(
            Log,
            log_id=self.request.data.get('log_id'),
        )

    def post(self, request, *args, **kwargs):
        instance = self.get_object()

        old_score = calculate_score(
            instance.respect,
            instance.behavior,
            instance.hw_prep,
            instance.lesson_prog,
            instance.attendance,
        )

        student = instance.student
        student.score -= old_score

        new_score = calculate_score(
            request.data.get("respect", 0),
            request.data.get("participation", 0),
            request.data.get("hw_prep", 0),
            request.data.get("lesson_prog", 0),
            request.data.get("attendance", 1),
        )

        student.score += new_score
        student.save()

        # --- field updates ---
        if request.data.get('attendance') == 0:  # Present
            instance.hw_prep = request.data.get('hw_prep')
            instance.hw_prep_comments = request.data.get('hw_prep_comments')
            instance.behavior = request.data.get('participation')
            instance.respect = request.data.get('respect')
            instance.lesson_prog = request.data.get('lesson_prog')
            instance.lesson_prog_comments = request.data.get('lesson_prog_comments')
            instance.next_lesson = request.data.get('next_lesson')
            instance.comments = request.data.get('comments')
            instance.attendance = request.data.get('attendance')
        else:  # Absent
            instance.hw_prep = None
            instance.hw_prep_comments = ""
            instance.behavior = None
            instance.respect = None
            instance.lesson_prog = None
            instance.lesson_prog_comments = ""
            instance.next_lesson = ""
            instance.comments = ""
            instance.attendance = request.data.get('attendance')

        instance.save()

        notify_parents(instance, verb="updated")

        return Response({"id": instance.log_id}, status=status.HTTP_200_OK)


class DeleteLogView(generics.GenericAPIView):
    serializer_class = CreateLogSerializer

    def get_object(self):
        return get_object_or_404(
            Log,
            log_id=self.request.data.get('log_id'),
        )

    def post(self, request, *args, **kwargs):
        instance = self.get_object()

        old_score = calculate_score(
            instance.respect,
            instance.behavior,
            instance.hw_prep,
            instance.lesson_prog,
            instance.attendance,
        )

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
    password = generate_temp_password()

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


def generate_temp_password(length: int = 12) -> str:
    """
    Generate a random password that satisfies the policy:
    - at least 9 characters (default 12 for a bit of headroom)
    - at least one uppercase letter
    - at least one lowercase letter
    - at least one digit
    - at least one special character
    """
    if length < 9:
        raise ValueError("length must be at least 9 to satisfy the password policy")

    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    # Keep this in sync with whatever your policy/regex actually allows
    special = "!@#$%^&*()-_=+[]{}?"

    all_chars = lowercase + uppercase + digits + special

    # Guarantee one of each required class first
    password_chars = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]

    # Fill the rest randomly from the full pool
    password_chars += [secrets.choice(all_chars) for _ in range(length - len(password_chars))]

    # Shuffle so the guaranteed chars aren't always in the same position
    # (secrets doesn't have shuffle, so use a Fisher-Yates with secrets.randbelow)
    for i in range(len(password_chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        password_chars[i], password_chars[j] = password_chars[j], password_chars[i]

    return "".join(password_chars)