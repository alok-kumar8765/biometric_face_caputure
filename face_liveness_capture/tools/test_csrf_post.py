import requests

BASE = 'http://127.0.0.1:8000'
ADMIN_LOGIN = BASE + '/admin/login/'
UPLOAD = BASE + '/face-capture/upload/'

# Minimal 1x1 PNG data URL
DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQImWNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

s = requests.Session()
print('GET', ADMIN_LOGIN)
r = s.get(ADMIN_LOGIN)
print('GET status', r.status_code)

# Print cookies to confirm csrftoken present
print('Cookies:', s.cookies.get_dict())

headers = {'X-CSRFToken': s.cookies.get('csrftoken', '')}
print('POST', UPLOAD)
r = s.post(UPLOAD, json={'image': DATA_URL}, headers=headers)
print('POST status', r.status_code)
print('Response:', r.text)
