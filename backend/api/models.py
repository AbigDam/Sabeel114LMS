from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    id = models.BigAutoField(primary_key=True)
    role = models.IntegerField(null = True, blank = True) #Options:  0 - Parent, 1 - Teacher, 2 - Student
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    parents = models.JSONField(list, blank=True, null=True) #List of user IDs (of parents)
    gender = models.BooleanField(null=True, blank=True) #True - Male, False - Female
    score = models.IntegerField(default=0, null=True, blank=True)
    email_notifications = models.BooleanField(default=False)

class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=255)
    message = models.CharField(max_length=1000)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField()

class Classroom(models.Model):
    class_id = models.BigAutoField(primary_key=True)
    teachers = models.JSONField(list) #List of teacher IDs
    students = models.JSONField(list, blank = True, null=True) #List of student IDs
    class_name = models.CharField(max_length=255, blank=True, null=True)
    program = models.CharField(max_length=255, blank=True, null=True)
    schedule = models.CharField(max_length=255, blank=True, null=True)
    room = models.CharField(max_length=255, blank=True, null=True)
    status = models.BooleanField(default = True)
    #schedule_days = models.CharField(max_length=255)
    #start_time = models.TimeField()
    #end_time = models.TimeField()

class Log(models.Model):
    log_id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reading_log")
    logged_by = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="student_reading_log")
    comments = models.CharField(max_length=1000, null= True, blank= True)
    date = models.DateField()
    respect = models.IntegerField(default = 2,null=True, blank=True) #1 - Does not meet expectations   2 - Meets expectations
    behavior = models.IntegerField(default = 3,null=True, blank=True) #1 - Needs Attention   2 - Good   3 - Excellent
    attendance = models.IntegerField(default = 0) #0 - Present   1-Absent 



class Report_Card(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="report_card")
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="student_report_card")
    behavior_score= models.IntegerField()  #Out of 5
    reading_score = models.IntegerField()  #Out of 5
    review_score = models.IntegerField()  #Out of 5
    memorization_score = models.IntegerField()  #Out of 5
    attendance_score = models.IntegerField()  #Out of 5
    trimester = models.IntegerField() #Out of 3
    date = models.DateField()

class Announcement(models.Model):
    announcement_id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    detail = models.CharField(max_length=1000)
    date = models.DateField()