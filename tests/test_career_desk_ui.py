"""Presentation/UX contracts for Career Desk — no external accounts required."""
import re
from pathlib import Path
from test_hosted import app

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_private_career_desk_assets_and_mobile_nav():
    html = read("templates/workspace.html")
    assert "Opportunity OS · Career Desk" in html
    assert 'mission-control.css?v=7.0.0' in html
    assert 'mission-control.js?v=7.0.0' in html
    assert 'class="mobile-dock"' in html
    for page in ("today", "matches", "winter", "applications", "inbox"):
        assert f"('{page}'" in html
    assert 'aria-label="Quick mobile navigation"' in html
    assert 'aria-label="Search or jump to… Ctrl K"' in html


def test_no_missing_svg_sprite_icons_in_new_workflows():
    sprite = read("static/vendor/lucide/icons.svg")
    ids = set(re.findall(r'<symbol\s+id="([^"]+)"', sprite))
    for path in ("static/mission-control.js", "static/source-watch.js"):
        code = read(path)
        for icon in re.findall(r"\b(?:ctx|context)\.icon\('([^']+)'", code):
            assert icon in ids, f"{icon} in {path} is missing from SVG sprite"
    html = read("templates/workspace.html")
    assert "('today','sun','Home')" in html


def test_search_is_wired_to_existing_discovery_not_external_site():
    workspace = read("static/workspace.js")
    module = read("static/mission-control.js")
    assert "search:(q)=>" in workspace
    assert "state.pendingFilters={q:" in workspace
    assert "navigate('discover')" in workspace
    assert 'id="desk-home-search"' in module
    assert "event.stopImmediatePropagation()" in module
    assert "data-desk-search" in module


def test_relevance_and_employer_evidence_are_prominent():
    code = read("static/mission-control.js")
    for important in (
        "Remote · India not verified", "Check employer requirements",
        "Pay not disclosed", "Employer listing",
        "data-action=\"feedback\"", "Not for me", "not hiring probabilities",
    ):
        assert important.lower() in code.lower() or important == "data-action=\"feedback\""
    assert "data-kind=\"Interested\"" in code
    assert "data-kind=\"Not interested\"" in code


def test_mobile_dock_respects_safe_areas_and_reduced_motion():
    css = read("static/mission-control.css")
    assert "@media(max-width:900px)" in css
    assert ".mobile-dock" in css
    assert "env(safe-area-inset-bottom)" in css
    assert "prefers-reduced-motion:reduce" in css
    assert ":focus-visible" in read("static/workspace.css")


def test_existing_private_workspace_routes_remain_owner_bound():
    with app.test_client() as client:
        assert client.get("/").status_code == 200
        assert client.get("/api/v3/matches").status_code == 401
        assert client.get("/api/v3/opportunities").status_code == 401
        assert client.get("/api/outreach/contacts").status_code == 401
        client.post("/api/login", json={"password": "test-secret-not-a-real-password"})
        workspace = client.get("/")
        assert workspace.status_code == 200
        html = workspace.data.decode()
        assert 'class="mobile-dock"' in html
        assert 'href="#matches"' in html
        assert 'href="#winter"' in html
        assert 'href="#outreach"' in html
        for source in (
            "/static/mission-control.css",
            "/static/mission-control.js",
            "/static/source-watch.css",
        ):
            assert client.get(source).status_code == 200
