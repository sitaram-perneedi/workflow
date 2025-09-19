"""
Custom middleware for workflow app
"""
from django.middleware.csrf import CsrfViewMiddleware
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class WorkflowCsrfMiddleware(CsrfViewMiddleware):
    """
    Custom CSRF middleware that handles multiple token header names
    """
    
    def _get_token_from_request(self, request):
        """
        Get CSRF token from request headers with multiple fallbacks
        """
        # Try standard Django CSRF header
        token = request.META.get('HTTP_X_CSRFTOKEN')
        if token:
            return token
        
        # Try custom header name from settings
        custom_header = getattr(settings, 'CSRF_HEADER_NAME', 'HTTP_X_XSRF_TOKEN')
        token = request.META.get(custom_header)
        if token:
            return token
        
        # Try other common header names
        for header_name in ['HTTP_X_XSRF_TOKEN', 'HTTP_X_CSRF_TOKEN']:
            token = request.META.get(header_name)
            if token:
                return token
        
        # Fallback to cookie
        return request.COOKIES.get(settings.CSRF_COOKIE_NAME)
    
    def process_request(self, request):
        """
        Process request and set CSRF token
        """
        # Get token from various sources
        csrf_token = self._get_token_from_request(request)
        if csrf_token:
            request.META['HTTP_X_CSRFTOKEN'] = csrf_token
        
        return super().process_request(request)

class WorkflowLoggingMiddleware:
    """
    Middleware to log workflow-related requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log API requests
        if request.path.startswith('/api/workflows/'):
            logger.info(f"Workflow API request: {request.method} {request.path}")
        
        response = self.get_response(request)
        
        # Log API responses with errors
        if request.path.startswith('/api/workflows/') and response.status_code >= 400:
            logger.error(f"Workflow API error: {response.status_code} for {request.method} {request.path}")
        
        return response