"""Behavioral contracts for Aurora Glass, using synthetic local records only.

These checks exercise the real Flask renderer and APIs. They never refresh a
source, connect an account, send email, or submit an employer application.
"""
import re
import uuid
from urllib.parse import urlsplit

import pytest
from sqlalchemy import text

from test_hosted import app, mod


@pytest.fixture
def workspace():
    client = app.test_client()
    with client.session_transaction() as session:
        session['owner'] = True
    page = client.get('/').get_data(as_text=True)
    token = re.search(r'name="csrf-token" content="([^"]+)"', page).group(1)
    return client, {'X-CSRF-Token': token}


@pytest.fixture
def opportunity(workspace):
    client, headers = workspace
    identifier = uuid.uuid4().hex
    response = client.post('/api/jobs', json={
        'company': 'Aurora Synthetic Test Company',
        'title': 'Python Backend Intern',
        'location': 'Remote',
        'url': 'https://example.test/aurora/' + identifier,
    })
    assert response.status_code == 200
    job_id = response.json['id']
    key = 'j:' + job_id
    service = app.extensions['career']['service']
    service.invalidate()
    yield client, headers, key
    # Remove only this test's generated records; never touch real documents.
    with mod.db.begin() as connection:
        for table_name, column in (
            ('career_history', 'opportunity_key'),
            ('career_receipts', 'opportunity_key'),
            ('career_states', 'key'),
        ):
            connection.execute(text(f'DELETE FROM {table_name} WHERE {column}=:key'), {'key': key})
        connection.execute(text('DELETE FROM jobs WHERE id=:id'), {'id': job_id})
    service.invalidate()


def test_rendered_pages_load_all_local_stylesheets_and_scripts(workspace):
    client, _ = workspace
    public = app.test_client()
    pages = [public.get('/'), client.get('/'), client.get('/classic')]
    for response in pages:
        assert response.status_code == 200
        page = response.get_data(as_text=True)
        styles = re.findall(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"', page)
        scripts = re.findall(r'<script\b[^>]*src="([^"]+)"', page)
        assert styles and scripts
        for url in styles + scripts:
            if not url.startswith('/static/'):
                continue
            asset = public.get(url)
            assert asset.status_code == 200, url
            path = urlsplit(url).path
            if path.endswith('.css'):
                assert asset.mimetype == 'text/css', url
            elif path.endswith('.js'):
                assert asset.mimetype in ('application/javascript', 'text/javascript'), url
    assert 'id="workspace"' not in pages[0].get_data(as_text=True)


def test_all_workspace_read_models_remain_private():
    client = app.test_client()
    for path in ('/api/v3/today', '/api/v3/opportunities', '/api/v3/profile',
                 '/api/v3/calendar', '/api/v3/inbox', '/api/v3/analytics',
                 '/api/v3/sources', '/api/autoapply', '/classic'):
        assert client.get(path).status_code == 401, path


def test_job_controls_require_csrf_and_same_origin_without_mutation(opportunity):
    client, headers, key = opportunity
    path = '/api/v3/opportunities/' + key
    assert client.patch(path, json={'notes': 'Forbidden mutation'}).status_code == 403
    assert client.patch(path, json={'notes': 'Forbidden mutation'},
                        headers={'X-CSRF-Token': 'incorrect'}).status_code == 403
    assert client.patch(path, json={'notes': 'Forbidden mutation'},
                        headers={**headers, 'Origin': 'https://foreign.example'}).status_code == 403
    assert client.get(path).json['notes'] == ''
    response = client.patch(path, json={'notes': 'Owner-reviewed synthetic note'}, headers=headers)
    assert response.status_code == 200
    assert client.get(path).json['notes'] == 'Owner-reviewed synthetic note'


def test_unknown_facts_and_missing_receipts_stay_explicit(opportunity):
    client, _, key = opportunity
    item = client.get('/api/v3/opportunities/' + key).json
    assert item['extracted']['fields']['compensation']['value'] is None
    assert item['extracted']['fields']['graduation_years']['value'] in (None, [])
    assert not item['extracted']['deadline']['date']
    assert item['last_checked'] is None
    assert item['submission_evidence']['kind'] == 'No independent employer receipt recorded'
    assert item['receipts'] == []


def test_application_stage_filters_and_receipt_gates(opportunity):
    client, headers, key = opportunity
    path = '/api/v3/opportunities/' + key
    response = client.patch(path, json={'stage': 'Applied'}, headers=headers)
    assert response.status_code == 422
    assert client.get(path).json['stage'] == 'Saved'
    assert client.get(path).json['receipts'] == []

    assert client.patch(path, json={'stage': 'Preparing'}, headers=headers).status_code == 200
    rows = client.get('/api/v3/opportunities?view=applications&stage=Preparing').json['items']
    assert any(row['key'] == key for row in rows)
    assert all(row['stage'] == 'Preparing' for row in rows)

    response = client.patch(path, json={
        'stage': 'Applied', 'submitted_by_owner': True,
        'reference': 'Synthetic owner-observed receipt AURORA-TEST',
    }, headers=headers)
    assert response.status_code == 200
    item = client.get(path).json
    assert item['stage'] == 'Applied'
    assert item['submission_evidence']['kind'] == 'Owner-reported submission'
    assert len(item['receipts']) == 1
    assert item['receipts'][0]['evidence_type'] == 'owner_reported'
    applied = client.get('/api/v3/opportunities?view=applications&stage=Applied').json['items']
    assert any(row['key'] == key for row in applied)
    assert all(row['stage'] == 'Applied' for row in applied)


def test_autoapply_reports_unavailable_without_persistent_storage(workspace, monkeypatch):
    client, _ = workspace
    # Preview storage must show an honest unavailable state, never a fake queue.
    monkeypatch.delenv('OPPORTUNITY_OS_PROFILE_IMPORT_APPROVED', raising=False)
    def unexpected_send(*args, **kwargs):
        pytest.fail('No employer request is authorized by this test.')
    monkeypatch.setattr('autoapply_engine.requests.post', unexpected_send)
    response = client.get('/api/autoapply')
    assert response.status_code == 503
    assert 'persistent' in response.json['error'].lower()
    assert client.post('/api/autoapply/settings', json={'enabled': True}).status_code == 503
    assert client.post('/api/autoapply/run', json={}).status_code == 503


def test_new_listing_opens_immediately_and_preserves_bounded_requirements(workspace):
    from career_os.service import CareerService
    client, _ = workspace
    service = app.extensions['career']['service']
    service.snapshot()  # Reproduce the warm dashboard cache before Add listing.
    other_worker = CareerService(service.store, service.cipher)
    other_worker.snapshot()
    requirements = ('Students graduating in 2028. Python, FastAPI, AWS and PostgreSQL. '
                    'Paid internship; stipend INR 25,000 per month. ' + 'x' * 13000)
    payload = {
        'company': 'Aurora Synthetic Listing', 'title': 'Backend Intern', 'location': 'India',
        'url': 'https://example.test/aurora-immediate/' + uuid.uuid4().hex,
        'description': requirements,
    }
    response = client.post('/api/jobs', json=payload)
    assert response.status_code == 200
    assert set(response.json) == {'ok', 'id'}
    job_id = response.json['id']
    key = 'j:' + job_id
    try:
        details = client.get('/api/v3/opportunities/' + key)
        assert details.status_code == 200
        assert details.json['title'] == payload['title']
        assert details.json['extracted']['description'] == requirements[:12000]
        # A different worker with an already warm cache refreshes a valid miss.
        assert other_worker.get(key)['title'] == payload['title']
        with mod.db.connect() as connection:
            row = connection.execute(text('SELECT description,score,warnings FROM jobs WHERE id=:id'),
                                     {'id': job_id}).mappings().one()
        assert row['description'] == requirements[:12000]
        score, warnings = mod.rank(payload['title'], requirements[:12000], payload['location'])
        assert row['score'] == score and row['warnings'] == warnings
        assert client.post('/api/jobs', json={**payload, 'description': 'Different duplicate text'}).status_code == 200
        assert client.get('/api/v3/opportunities/' + key).json['extracted']['description'] == requirements[:12000]
    finally:
        client.delete('/api/jobs/' + job_id)


def test_legacy_update_and_delete_refresh_workspace_immediately(opportunity):
    client, _, key = opportunity
    job_id = key[2:]
    assert client.get('/api/v3/opportunities/' + key).json['stage'] == 'Saved'
    response = client.patch('/api/jobs/' + job_id, json={
        'status': 'Draft ready', 'notes': 'Synthetic updated note from classic tools',
    })
    assert response.status_code == 200
    details = client.get('/api/v3/opportunities/' + key)
    assert details.status_code == 200
    assert details.json['stage'] == 'Preparing'
    assert details.json['notes'] == 'Synthetic updated note from classic tools'
    assert client.delete('/api/jobs/' + job_id).status_code == 200
    assert client.get('/api/v3/opportunities/' + key).status_code == 404


def test_rejected_legacy_mutations_preserve_records_and_projection(opportunity):
    client, _, key = opportunity
    service = app.extensions['career']['service']
    before = service.snapshot()
    path = '/api/jobs/' + key[2:]
    anonymous = app.test_client()
    assert anonymous.patch(path, json={'status': 'Interview'}).status_code == 401
    assert client.patch(path, json={'status': 'Interview'},
                        headers={'Origin': 'https://foreign.example'}).status_code == 403
    assert service.snapshot() is before
    assert client.get('/api/v3/opportunities/' + key).json['stage'] == 'Saved'
