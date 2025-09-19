"""
Management command to set up the complete workflow system
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Set up the complete workflow system with all node types and configurations'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up complete workflow system...'))
        
        # Set up basic node types
        self.stdout.write('Setting up basic node types...')
        call_command('setup_node_types')
        
        # Set up GRM-specific node types
        self.stdout.write('Setting up GRM-specific node types...')
        call_command('setup_grm_node_types')
        
        # Set up scheduler
        self.stdout.write('Setting up scheduler...')
        call_command('setup_scheduler')
        
        self.stdout.write(
            self.style.SUCCESS('Complete workflow system setup completed successfully!')
        )
        
        self.stdout.write(
            self.style.WARNING('Next steps:')
        )
        self.stdout.write('1. Start Celery worker: celery -A system worker -l info')
        self.stdout.write('2. Start Celery beat: celery -A system beat -l info')
        self.stdout.write('3. Access the workflow editor at /workflow/')