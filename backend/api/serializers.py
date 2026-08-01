import datetime
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import *
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
 
    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            # Field-level error -> DRF returns {"current_password": [...]}
            # which matches what the frontend already expects.
            raise serializers.ValidationError('Current password is incorrect.')
        return value
 
    def validate(self, attrs):
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from your current password.'
            })
        return attrs


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        username_or_email = attrs.get("username")
        password = attrs.get("password")

        try:
            user = User.objects.get(email__iexact=username_or_email)
            username = getattr(user, User.USERNAME_FIELD)
        except User.DoesNotExist:
            username = username_or_email

        attrs["username"] = username

        return super().validate(attrs)

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.CharField()

    def create(self, validated_data):
        role_name = validated_data.pop("role")
        if role_name == "Teacher":
            role_obj = 1
        elif role_name == "Parent":
            role_obj = 0
        elif role_name == "Student":
            role_obj = 2

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=role_obj,
        )
        return user

class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
        ]
        
class ParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
        ]


class CreateClassSerializer(serializers.Serializer):
    class_name = serializers.CharField()

    def create(self, validated_data):
        user = self.context["request"].user
        
        classroom = Classroom.objects.create(teacher =  [user],class_name = validated_data["class_name"])

        return classroom

class ClassSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="class_id", read_only=True)
    title = serializers.CharField(source="class_name", read_only=True)

    status = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()


    class Meta:
        model = Classroom
        fields = [
            "id",
            "title",
            "teachers",
            "students",
            "status",
        ]

    def get_students(self, obj):
        return len(obj.students or [])

    def get_status(self, obj):
        return "active" if obj.status else "inactive"

class AnnouncementSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="announcement_id", read_only=True)
    date = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ["id", "title", "detail", "date"]

    def get_date(self, obj):
        today = timezone.now().date()
        delta = (obj.date - today).days

        if delta == 0:
            return "Today"
        elif delta == 1:
            return "Tomorrow"
        elif 1 < delta <= 7:
            return obj.date.strftime("%A")  # e.g. "Saturday"
        else:
            return obj.date.strftime("%b %d, %Y")  # fallback: "Jun 14, 2026"


class CreateLogSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    class_id = serializers.IntegerField()
    comments = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.DateField(default=datetime.date.today)
    respect = serializers.IntegerField(min_value=1, max_value=2, default=2)
    behavior = serializers.IntegerField(min_value=1, max_value=3, default=3)
    hw_prep = serializers.IntegerField(min_value=1, max_value=3, required=False, allow_null=True, default=None)
    hw_prep_comments = serializers.CharField(required=False, allow_blank=True, default="")
    lesson_prog = serializers.IntegerField(min_value=1, max_value=3, required=False, allow_null=True, default=None)
    lesson_prog_comments = serializers.CharField(required=False, allow_blank=True, default="")
    next_lesson = serializers.CharField(required=False, allow_blank=True, default="")
    attendance = serializers.IntegerField(min_value=0, max_value=1, default=0)  # 0 - Present   1 - Absent

    def create(self, validated_data):
        student = User.objects.get(id=validated_data["student_id"])
        classroom = Classroom.objects.get(class_id=validated_data["class_id"])

        score = calculate_score(
            validated_data.get("respect"),
            validated_data.get("behavior"),
            validated_data.get("hw_prep"),
            validated_data.get("lesson_prog"),
            validated_data.get("attendance", 1),
        )

        if student.score:
            student.score += score
        else:
            student.score = score
        student.save()

        log = Log.objects.create(
            student=student,
            logged_by=classroom,
            comments=validated_data.get("comments", ""),
            date=validated_data["date"],
            respect=validated_data.get("respect"),
            behavior=validated_data.get("behavior"),
            hw_prep=validated_data.get("hw_prep"),
            hw_prep_comments=validated_data.get("hw_prep_comments", ""),
            lesson_prog=validated_data.get("lesson_prog"),
            lesson_prog_comments=validated_data.get("lesson_prog_comments", ""),
            next_lesson=validated_data.get("next_lesson", ""),
            attendance=validated_data.get("attendance", 0),
        )
        return log

class SpecificTeacherSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    classes = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    temp_password = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "classes",
            "student_count",
            "is_admin",
            "temp_password",
        ]

    def get_classes(self, obj):
        classes = Classroom.objects.filter(teachers__contains=[obj.id])

        return [
            {
                "id": classroom.class_id,
                "name": classroom.class_name,
            }
            for classroom in classes
        ]

    def get_student_count(self, obj):
        classes = Classroom.objects.filter(teachers__contains=[obj.id])

        unique_students = set()
        for classroom in classes:
            for student in classroom.students:
                unique_students.add(student)

        return len(unique_students)

    def get_temp_password(self, obj):
        return obj.temporary_passwords

    def get_is_admin(self, obj):
        return obj.is_superuser or obj.is_staff

class SpecificStudentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    classes = serializers.SerializerMethodField()
    parents = serializers.SerializerMethodField()
    score = serializers.SerializerMethodField()
    temp_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "parents",
            "classes",
            "score",
            "temp_password",
        ]

    def get_classes(self, obj):
        classes = Classroom.objects.filter(students__contains=[obj.id])

        return [
            {
                "id": classroom.class_id,
                "name": classroom.class_name,
            }
            for classroom in classes
        ]

    def get_parents(self, obj):
        parent_ids = obj.parents
        parents = User.objects.filter(id__in=parent_ids)

        return [
            {
                "id": parent.id,
                "first_name": parent.first_name,
                "last_name": parent.last_name,
            }
            for parent in parents
        ]

    def get_temp_password(self, obj):
        return obj.temporary_passwords

    def get_score(self, obj):
        return obj.score

class SpecificParentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    children = serializers.SerializerMethodField()
    temp_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "children",
            "email_notifications",
            "temp_password",
        ]

    def get_children(self, obj):
        parent_id = obj.id
        children = []
        students = User.objects.filter(role = 2)
        for student in students:
            if parent_id in student.parents:
                children.append(student)
        return [
            {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
            }
            for student in students
        ]

    def get_temp_password(self, obj):
        return obj.temporary_passwords


class StudentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name"]

class LeaderboardSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    score = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "username", "score", "gender"]
    def get_score(self, obj):
        return getattr(obj, 'score_at_date', obj.score)
        

class LogSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="log_id", read_only=True)
    class Meta:
        model = Log
        fields = ["id", "comments", "date", "respect", "behavior", "attendance","hw_prep","lesson_prog","lesson_prog_comments","hw_prep_comments","next_lesson"]
    
class PerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log
        fields = ["respect", "behavior", "attendance","hw_prep","lesson_prog", "date"]

def calculate_score(respect, participation, hw_prep, lesson_prog, attendance):
    def shifted(value):
        return (value - 1) if value is not None else 0

    respect_score = shifted(respect) #0 - 2
    participation_score = shifted(participation) #0 - 2
    hw_prep_score = shifted(hw_prep) #0 - 2
    lesson_prog_score = shifted(lesson_prog) #0 - 2
    attendance_score = 1 if attendance == 0 else 0 #0 - 1

    return respect_score + participation_score + hw_prep_score + lesson_prog_score + attendance_score
