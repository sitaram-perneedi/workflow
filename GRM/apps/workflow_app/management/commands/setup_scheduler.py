"""
Management command to set up the workflow scheduler
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json

class Command(BaseCommand):
    help = 'Set up periodic tasks for workflow scheduling'
    
    def handle(self, *args, **options):
        # Create periodic task for processing scheduled workflows
        crontab, created = CrontabSchedule.objects.get_or_create(
            minute='*',  # Every minute
            hour='*',
            day_of_month='*',
            month_of_year='*',
            day_of_week='*',
        )
        
        task, created = PeriodicTask.objects.get_or_create(
            name='process_scheduled_workflows',
            defaults={
                'crontab': crontab,
                'task': 'apps.workflow_app.tasks.process_scheduled_workflows',
                'enabled': True,
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS('Created scheduled workflow processor task')
            )
        else:
            self.stdout.write(
                self.style.WARNING('Scheduled workflow processor task already exists')
            )
        
        # Create cleanup task
        cleanup_crontab, created = CrontabSchedule.objects.get_or_create(
            minute='0',  # Every hour
            hour='*',
            day_of_month='*',
            month_of_year='*',
            day_of_week='*',
        )
        
        cleanup_task, created = PeriodicTask.objects.get_or_create(
            name='cleanup_old_executions',
            defaults={
                'crontab': cleanup_crontab,
                'task': 'apps.workflow_app.tasks.cleanup_old_executions',
                'enabled': True,
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS('Created cleanup task')
            )
        else:
            self.stdout.write(
                self.style.WARNING('Cleanup task already exists')
            )
        
        self.stdout.write(
            self.style.SUCCESS('Scheduler setup completed successfully')
        )