"""Owner-bound integration tests for Winter Internships and Outreach Studio."""
import io
from test_hosted import app, mod


def signin():
    client = app.test_client()
    assert client.post('/api/login', json={'password': 'test-secret-not-a-real-password'}).status_code == 200
    return client


def test_new_outreach_routes_require_owner():
    client = app.test_client()
    assert client.get('/api/outreach/contacts').status_code == 401
    assert client.get('/api/outreach/draft/unknown').status_code == 401
    assert client.post('/api/outreach/exclusion/unknown', json={'excluded': True}).status_code == 401


def test_contact_preview_import_draft_and_do_not_contact(monkeypatch):
    monkeypatch.setattr(mod, 'has_persistent_db', lambda: True)
    client = signin()
    payload = b'Company,Email,Name,Role\nWinter QA Labs,winter-qa@example.org,Alex,Technical Recruiter\n'
    preview = client.post('/api/contacts/import?preview=1', data={'file': (io.BytesIO(payload), 'hr.csv')})
    assert preview.status_code == 200
    assert preview.json['ready'] == 1
    assert preview.json['preview'][0]['email'] == 'winter-qa@example.org'
    assert preview.json['note'].startswith('Preview only.')
    assert not any(c['email'] == 'winter-qa@example.org' for c in client.get('/api/contacts').json['contacts'])

    imported = client.post('/api/contacts/import', data={'file': (io.BytesIO(payload), 'hr.csv')})
    assert imported.status_code == 200
    assert imported.json['imported'] == 1
    contact = next(c for c in client.get('/api/outreach/contacts').json['contacts']
                   if c['email'] == 'winter-qa@example.org')
    assert contact['classification']['recipient_verified'] is False

    draft = client.get('/api/outreach/draft/' + contact['id'] + '?season=winter&focus=backend')
    assert draft.status_code == 200
    assert draft.json['to'] == contact['email']
    assert 'winter' in draft.json['subject'].lower()
    assert 'FastAPI' in draft.json['body']
    assert draft.json['attach_original_resume'] is False

    blocked = client.post('/api/outreach/exclusion/' + contact['id'], json={'excluded': True})
    assert blocked.status_code == 200 and blocked.json['excluded'] is True
    assert client.get('/api/outreach/draft/' + contact['id']).status_code == 409
    denied = client.post('/api/gmail/send', json={
        'to': contact['email'], 'subject': 'Winter internship inquiry',
        'body': 'Hello, I would like to inquire about internship opportunities this winter.',
        'reviewed_and_confirmed': True})
    assert denied.status_code == 409
    assert 'do-not-contact' in denied.json['error'].lower()


def test_winter_filter_excludes_nonseasonal_job():
    client = signin()
    winter = client.post('/api/jobs', json={
        'company': 'Winter Filter Verification', 'title': 'Winter 2026 Internship: Python Backend',
        'description': 'India-based students graduating in 2028 may apply for December 2026.',
        'location': 'India', 'url': 'https://example.org/roles/winter-2026-qa'})
    assert winter.status_code == 200
    summer = client.post('/api/jobs', json={
        'company': 'Summer Filter Verification', 'title': 'Summer 2027 Internship: Python Backend',
        'description': 'India-based students graduating in 2028 may apply for June 2027.',
        'location': 'India', 'url': 'https://example.org/roles/summer-2027-qa'})
    assert summer.status_code == 200
    res = client.get('/api/v3/opportunities?view=discover&season=winter&size=60')
    assert res.status_code == 200
    titles = [item['title'] for item in res.json['items']]
    assert any('Winter 2026 Internship' in title for title in titles)
    assert not any('Summer 2027 Internship' in title for title in titles)
