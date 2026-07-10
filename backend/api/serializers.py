import datetime
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import *
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()

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
            "program",
            "teachers",
            "students",
            "schedule",
            "room",
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
    attendance = serializers.IntegerField(min_value=0, max_value=1, default=0) #0 - Present   1-Absent 


    def create(self, validated_data):
        student = User.objects.get(id=validated_data["student_id"])
        classroom = Classroom.objects.get(class_id=validated_data["class_id"])
        respect_score = validated_data.get("respect", 0)
        behavior_score = validated_data.get("behavior", 0)
        attendance_score = 1 if validated_data.get("attendance", 1) == 0 else 0
        score = respect_score + behavior_score + attendance_score
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
            attendance=validated_data.get("attendance", 0),
        )
        return log
        
# ── Student ──────────────────────────────────────────────────────────────────
class StudentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name"]
