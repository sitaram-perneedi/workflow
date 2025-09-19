"""
Celery configuration for the GRM system
"""
import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'system.settings.development')

app = Celery('grm_system')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat configuration
app.conf.beat_schedule = {
    'process-scheduled-workflows': {
        'task': 'apps.workflow_app.tasks.process_scheduled_workflows',
        'schedule': 60.0,  # Run every minute
    },
    'cleanup-old-executions': {
        'task': 'apps.workflow_app.tasks.cleanup_old_executions',
        'schedule': 3600.0,  # Run every hour
    },
}

app.conf.timezone = 'UTC'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')