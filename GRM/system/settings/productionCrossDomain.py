from .base import *

DEBUG = False
ENCRYPT_KEY = 'infiniti'
SECURITY_KEY = 'c0rdq0oVaf5Oki/52/IgRw=='
LOGGING_ROOT = os.path.join(STATIC_ROOT, 'logs')

MIDDLEWARE += [
    # 'system.middleware.httpMiddleware.HttpMiddleware',
    'system.middleware.logMiddleware.LogMiddleware',
    'system.middleware.csrfTokenMiddleware.CsrfTokenMiddleware'
]

ADDITIONAL_JWT = {
    'SIGNING_KEY': ENCRYPT_KEY,
}
SIMPLE_JWT.update(ADDITIONAL_JWT)
CORS_ORIGIN_ALLOW_ALL = False
CORS_ORIGIN_WHITELIST = [
    'http://mail.grouprm.net',
    'http://mail-v2.grouprm.net'
]
CORS_EXPOSE_HEADERS = ["x-csrftoken"]
# Cross site cookies need to get attached automatically
CORS_ALLOW_CREDENTIALS = True
# cookies should be stored from cross site
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
# need to add secure attribute if using cross site cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
