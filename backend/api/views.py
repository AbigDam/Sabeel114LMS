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

User = get_user_model()

LOG_TYPE_MAP = {
    0: 'reading',
    1: 'memorization',
    2: 'review',
}
@api_view(['GET'])
def test(request):
    return Response({"message": "Testing!  Testing!  Message Recived?"})


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
            "is_superuser": request.user.is_superuser,
            "role_id": request.user.role,
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

        teachers =  self.request.data.get("teacher_ids") 
        
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
                user = User.objects.create_user(username = first_name + last_name, first_name = first_name, last_name = last_name, email = email, password = password, role = role_obj)
            students.append(user.id)
            results["created"].append( {"username":username, "student_id":user.id}) 
        classroom.students = students
        classroom.save()

        return Response(results, status=status.HTTP_201_CREATED)
