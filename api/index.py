from app import app
from werkzeug.middleware.proxy_fix import ProxyFix

# Vercel relies on reverse proxy headers. We need to tell Flask to trust them
# so it correctly routes /api/... requests
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
