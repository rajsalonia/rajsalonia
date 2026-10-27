"""Evidence-based filters and additive analytics; isolated records, no external actions."""
import pytest
from sqlalchemy import text

from test_career_os import service, add


@pytest.mark.parametrize('skill, title, description', [
    ('python', 'Python Intern', 'Build services.'),
    ('fastapi', 'Engineering Intern', 'Develop FastAPI endpoints.'),
    ('backend', 'Back-end Intern', 'Build services.'),
    ('ai', 'Engineering Intern', 'Work on generative AI systems.'),
    ('ai', 'Engineering Intern', 'Evaluate LLMs.'),
    ('ai', 'Engineering Intern', 'Build machine learning models.'),
    ('ai', 'AI Engineering Intern', 'Build services.'),
    ('cloud', 'Engineering Intern', 'Deploy to AWS.'),
    ('cloud', 'Cloud Intern', 'Build services.'),
    ('devops', 'SRE Intern', 'Build services.'),
    ('devops', 'Engineering Intern', 'Support DevOps delivery.'),
])
def test_explicit_skill_filter_matches_recorded_role_evidence(service, skill, title, description):
    key = add(service, 'match', title=title, description=description)
    add(service, 'other', title='Design Intern', description='Create visual concepts.', company='Python Cloud AI Labs')
    rows, _ = service.filtered({'skill': skill})
    assert [row['key'] for row in rows] == [key]


def test_skill_filter_boundaries_and_invalid_filter(service):
    add(service, title='Email Design Intern', description='Maintain correspondence and design assets.')
    assert service.filtered({'skill': 'ai'})[0] == []
    with pytest.raises(ValueError, match='supported skill'):
        service.filtered({'skill': 'unsupported'})


def test_unpaid_requires_explicit_compensation_evidence(service):
    unpaid = add(service, 'unpaid', description='Unpaid internship. Students can apply.')
    paid = add(service, 'paid', description='Paid internship. Students can apply.')
    add(service, 'unknown', description='Students can apply. Compensation is not disclosed.')
    assert [row['key'] for row in service.filtered({'paid': 'no'})[0]] == [unpaid]
    assert [row['key'] for row in service.filtered({'paid': 'yes'})[0]] == [paid]
    rows, interpreted = service.filtered({'q': 'unpaid stipend internships'})
    assert interpreted['paid'] == 'no'
    assert [row['key'] for row in rows] == [unpaid]


def test_analytics_current_distribution_does_not_infer_receipts(service, monkeypatch):
    add(service, 'discovered', title='Python Intern', description='Python, FastAPI.', provider='greenhouse')
    add(service, 'preparing', title='Cloud Intern', description='AWS and Python.', provider='greenhouse', status='Preparing')
    add(service, 'applied', title='Backend Intern', description='Python.', provider='lever', status='Applied')
    add(service, 'interview', title='Design Intern', description='Design systems.', provider='lever', status='Interview')
    items = service.snapshot()
    python_item = next(row for row in items if row['title'] == 'Python Intern')
    python_item['extracted']['preferred_skills'].append('python')
    monkeypatch.setattr(service, 'snapshot', lambda: items)
    result = service.analytics()
    assert result['opportunities'] == 4
    assert result['tracked'] == 3
    assert result['pending_review'] == 1
    assert result['sources'] == [
        {'name': 'greenhouse', 'total': 2, 'tracked': 1, 'submitted': 0},
        {'name': 'lever', 'total': 2, 'tracked': 2, 'submitted': 2},
    ]
    assert next(row['count'] for row in result['skills'] if row['name'] == 'python') == 3
    assert result['owner_reported_submissions'] == 0
    assert result['audit_events'] == 0
    assert 'not conversion rates' in result['limitation']
    assert 'do not imply independent employer receipts' in result['limitation']


def test_audit_activity_uses_kolkata_days_and_real_event_counts(service):
    service.store.clock = lambda: '2026-10-27T04:00:00+00:00'
    timestamps = [
        '2026-10-13T18:29:59+00:00',  # Before the first local day.
        '2026-10-13T18:30:00+00:00',  # 14 Oct in Kolkata.
        '2026-10-26T18:00:00+00:00',  # 26 Oct in Kolkata.
        '2026-10-26T20:00:00+00:00',  # 27 Oct in Kolkata.
        '2026-10-27T08:30:00+05:30',  # Another event on 27 Oct.
        '2026-10-27T05:00:00+00:00',  # Future event excluded.
        'not-recorded',
    ]
    with service.store.db.begin() as connection:
        for index, stamp in enumerate(timestamps):
            connection.execute(text('INSERT INTO career_history(id,event,created_at) VALUES(:id,:event,:stamp)'),
                               {'id': str(index), 'event': 'synthetic_action', 'stamp': stamp})
    result = service.analytics()
    counts = {row['date']: row['count'] for row in result['activity']}
    assert list(counts)[0] == '2026-10-14'
    assert list(counts)[-1] == '2026-10-27'
    assert len(counts) == 14
    assert counts['2026-10-14'] == 1
    assert counts['2026-10-26'] == 1
    assert counts['2026-10-27'] == 2
    assert sum(counts.values()) == 4
    assert result['audit_events'] == 7


def test_empty_analytics_contains_zero_activity_without_demo_data(service):
    result = service.analytics()
    assert result['opportunities'] == result['tracked'] == result['pending_review'] == 0
    assert result['sources'] == result['skills'] == []
    assert len(result['activity']) == 14
    assert all(row['count'] == 0 for row in result['activity'])


def test_analytics_api_keeps_old_fields_and_adds_distributions():
    from test_hosted import app
    client = app.test_client()
    assert client.get('/api/v3/analytics').status_code == 401
    with client.session_transaction() as session:
        session['owner'] = True
    response = client.get('/api/v3/analytics')
    assert response.status_code == 200
    assert {'opportunities', 'stages', 'eligibility', 'owner_reported_submissions',
            'audit_events', 'limitation', 'sources', 'skills', 'activity',
            'tracked', 'pending_review'} <= response.json.keys()
    assert len(response.json['activity']) == 14
