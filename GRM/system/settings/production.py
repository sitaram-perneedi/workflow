from .base import *

DEBUG = False
ENCRYPT_KEY = 'infiniti'
SECURITY_KEY = 'c0rdq0oVaf5Oki/52/IgRw=='
LOGGING_ROOT = os.path.join(STATIC_ROOT, 'logs')

MIDDLEWARE += [
    #'system.middleware.httpMiddleware.HttpMiddleware',
    'system.middleware.logMiddleware.LogMiddleware',
]

LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'formatter': {
        'verbose': {
            'format': '%(levelname)s [%(asctime)s] %(module)s %(message)s'
        },
    },
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGGING_ROOT+'/debug.log',
            'maxBytes': 1024000,
            'backupCount': 5,
        },
        'mail_admins': {
            'class': 'django.utils.log.AdminEmailHandler',
            # But the emails are plain text by default - HTML is nicer
            'include_html': True
        }
    },
    'loggers': {
        'error_log': {
            'handlers': ['file','mail_admins'],
            'propagate': True,
            'level': 'ERROR'
        },
        'critical_log': {
            'handlers': ['file','mail_admins'],
            'propagate': True,
            'level': 'CRITICAL'
        },
    }
}

ADDITIONAL_JWT = {
    'SIGNING_KEY': ENCRYPT_KEY,
}
SIMPLE_JWT.update(ADDITIONAL_JWT)
CORS_ORIGIN_ALLOW_ALL = False
CORS_ORIGIN_WHITELIST = [
    'http://mail.grouprm.net'
]

