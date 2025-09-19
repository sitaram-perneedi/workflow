from .base import *

ENCRYPT_KEY = 'infiniti'
SECURITY_KEY = 'c0rdq0oVaf5Oki/52/IgRw=='
DEBUG = True

MIDDLEWARE += [
    # 'system.middleware.httpMiddleware.HttpMiddleware',
    # 'system.middleware.logMiddleware.LogMiddleware',
    # Exposing csrftoken in a response header
    'system.middleware.csrfTokenMiddleware.CsrfTokenMiddleware',
]

ADDITIONAL_JWT = {
    'SIGNING_KEY': ENCRYPT_KEY,
}
SIMPLE_JWT.update(ADDITIONAL_JWT)
# Server will send this header to browser
CORS_EXPOSE_HEADERS = ["x-csrftoken"]
