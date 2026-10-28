"""Regression tests: source-grounded match screening, model honesty, and new UI."""
from career_os.match_engine import assess, shortlist, season_evidence, remote_evidence
from test_hosted import app


def sample(title="Python Backend Intern", location="Remote - India",
           description="Winter 2026 internship in Python and FastAPI for students graduating 2028.",
           code="likely", category="Internship", score=82):
    return {
        "key": "j:" + "1" * 32,
        "category": category, "title": title, "company": "Evidence Test Company",
        "location": location, "description": description,
        "provider": "ashby", "first_seen": "2026-10-28", "stage": "Discovered",
        "archived": False, "dismissed": False, "stale": False,
        "url": "https://jobs.ashbyhq.com/example/12345",
        "eligibility": {"code": code},
        "recommendation": {"score": score, "reasons": ["Python backend overlap"]},
        "extracted": {
            "description": description, "work_mode": "Remote",
            "deadline": {"date": None},
            "fields": {
                "graduation_years": {"value": [2028]},
                "compensation": {"value": None},
            },
        }
    }


def test_winter_and_remote_india_evidence_are_separate():
    item = sample()
    fit = assess(item)
    assert fit["track"] == "backend"
    assert fit["score"] == 82
    assert fit["winter"].startswith("winter ")
    assert fit["remote"]["india_eligible"] is True
    assert "Rules-based" in fit["kind"]


def test_remote_worldwide_is_not_confirmed_india_eligible():
    item = sample(location="Worldwide · Remote")
    assert remote_evidence(item)["india_eligible"] is False
    assert any("not confirmed" in x.lower() for x in assess(item)["checks"])


def test_us_restrictions_never_get_an_india_remote_badge():
    item = sample(location="Remote - United States only")
    assert remote_evidence(item)["india_eligible"] is False


def test_hard_employer_year_conflict_excludes():
    item = sample()
    item["extracted"]["fields"]["graduation_years"]["value"] = [2026, 2027]
    assert assess(item)["excluded"] is True
    assert shortlist([item])["total"] == 0


def test_closed_senior_and_already_applied_are_not_new_matches():
    closed = sample(code="closed")
    senior = sample(title="Staff Python Engineer")
    applied = sample()
    applied["stage"] = "Applied"
    assert shortlist([closed, senior, applied])["total"] == 0


def test_old_winter_year_not_current_intake():
    item = sample(description="Winter 2025 internship, Python and FastAPI")
    assert season_evidence(item) == "not_this_winter"


def test_unknown_eligibility_stays_capped_for_review():
    fit = assess(sample(code="unknown", score=94))
    assert fit["level"] == "review"
    assert fit["score"] <= 72


def test_shortlist_counts_and_sorted_order():
    first = sample(score=82)
    second = sample(score=54)
    second["key"] = "j:" + "2" * 32
    second["location"] = "Remote - US only"
    result = shortlist([second, first])
    assert result["total"] == 2
    assert result["items"][0]["key"] == first["key"]
    assert result["counts"]["remote_india_stated"] == 1
    assert result["counts"]["winter"] == 2


def test_new_routes_are_private_and_workspace_shows_clear_navigation():
    with app.test_client() as client:
        assert client.get("/api/v3/matches").status_code == 401
        client.post("/api/login", json={"password": "test-secret-not-a-real-password"})
        html = client.get("/").data.decode()
        for target in ("#matches", "#watch", "#winter", "#outreach"):
            assert target in html
        result = client.get("/api/v3/matches")
        assert result.status_code == 200
        assert "counts" in result.json
        assert "model" in result.json
        assert "items" in result.json
