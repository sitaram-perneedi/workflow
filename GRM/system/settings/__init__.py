import pymysql
pymysql.install_as_MySQLdb()



from system.celery import app as celery

__all__ = ('celery',)

#inside the system>settings>__init__.py
