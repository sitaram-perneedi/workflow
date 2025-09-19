#!/usr/bin/env python
"""
Script to start the complete workflow system
"""
import os
import sys
import subprocess
import time
from pathlib import Path

def start_redis():
    """Start Redis server"""
    try:
        # Check if Redis is already running
        result = subprocess.run(['redis-cli', 'ping'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Redis is already running")
            return True
    except FileNotFoundError:
        pass
    
    try:
        print("Starting Redis server...")
        subprocess.Popen(['redis-server'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2)
        
        # Verify Redis started
        result = subprocess.run(['redis-cli', 'ping'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Redis started successfully")
            return True
        else:
            print("✗ Failed to start Redis")
            return False
    except Exception as e:
        print(f"✗ Error starting Redis: {e}")
        return False

def start_celery_worker():
    """Start Celery worker"""
    print("Starting Celery worker...")
    try:
        worker_process = subprocess.Popen([
            'celery', '-A', 'system', 'worker', '-l', 'info'
        ], cwd='GRM')
        print("✓ Celery worker started")
        return worker_process
    except Exception as e:
        print(f"✗ Error starting Celery worker: {e}")
        return None

def start_celery_beat():
    """Start Celery beat scheduler"""
    print("Starting Celery beat scheduler...")
    try:
        beat_process = subprocess.Popen([
            'celery', '-A', 'system', 'beat', '-l', 'info'
        ], cwd='GRM')
        print("✓ Celery beat started")
        return beat_process
    except Exception as e:
        print(f"✗ Error starting Celery beat: {e}")
        return None

def start_django():
    """Start Django development server"""
    print("Starting Django development server...")
    try:
        django_process = subprocess.Popen([
            'python', 'manage.py', 'runserver', '127.0.0.1:8000'
        ], cwd='GRM')
        print("✓ Django server started on http://127.0.0.1:8000")
        return django_process
    except Exception as e:
        print(f"✗ Error starting Django: {e}")
        return None

def main():
    print("🚀 Starting GRM Workflow System...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path('GRM/manage.py').exists():
        print("✗ Please run this script from the project root directory")
        sys.exit(1)
    
    processes = []
    
    try:
        # Start Redis
        if not start_redis():
            print("✗ Failed to start Redis. Please install and start Redis manually.")
            sys.exit(1)
        
        # Start Celery worker
        worker_process = start_celery_worker()
        if worker_process:
            processes.append(worker_process)
        
        # Start Celery beat
        beat_process = start_celery_beat()
        if beat_process:
            processes.append(beat_process)
        
        # Start Django
        django_process = start_django()
        if django_process:
            processes.append(django_process)
        
        print("\n" + "=" * 50)
        print("🎉 GRM Workflow System is running!")
        print("📊 Dashboard: http://127.0.0.1:8000/workflow/")
        print("🔧 Admin: http://127.0.0.1:8000/admin/")
        print("\nPress Ctrl+C to stop all services")
        print("=" * 50)
        
        # Wait for processes
        try:
            while True:
                time.sleep(1)
                # Check if any process died
                for process in processes:
                    if process.poll() is not None:
                        print(f"⚠️  Process {process.pid} died, restarting...")
                        break
        except KeyboardInterrupt:
            print("\n🛑 Stopping all services...")
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping all services...")
    
    finally:
        # Clean up processes
        for process in processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            except Exception:
                pass
        
        print("✓ All services stopped")

if __name__ == '__main__':
    main()