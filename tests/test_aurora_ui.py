"""Static regression checks for the Opportunity OS Aurora Glass UI.

These checks verify asset wiring and important accessibility contracts;
they do not replace browser screenshot or interaction testing.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_workspace_loads_aurora_glass_after_base_styles():
    html = read("templates/workspace.html")
    assert html.index("aurora-tokens.css") < html.index("workspace.css") < html.index("glass.css")
    for asset in ("aurora-tokens.css", "workspace.css", "glass.css", "workspace.js"):
        assert re.search(re.escape(asset) + r'\?v=5\.\d+\.\d+', html)
    for identifier in ("primary-nav", "content", "detail-dialog", "assistant-dialog",
                       "command-dialog", "command-input", "command-results", "sidebar-backdrop"):
        assert f'id="{identifier}"' in html
    assert 'data-action="theme"' in html
    assert 'data-action="collapse"' in html
    assert 'data-action="close-menu"' in html
    assert 'aria-label="Search or jump to… Ctrl K"' in html
    assert 'aria-controls="sidebar"' in html
    assert 'aria-labelledby="command-title"' in html
    assert 'role="combobox"' in html and 'aria-controls="command-results"' in html
    assert 'role="listbox"' in html


def test_advanced_workspace_and_login_use_glass_styles():
    html = read("templates/index.html")
    assert html.index("aurora-tokens.css") < html.index("filename='glass-classic.css'")
    assert html.index("filename='app.css'") < html.index("filename='glass-classic.css'")
    assert 'id="login-form"' in html
    assert 'id="main-content"' in html
    assert 'id="global-search-form"' in html


def test_design_system_covers_themes_breakpoints_and_accessibility():
    tokens = read("static/aurora-tokens.css")
    styles = [tokens, read("static/workspace.css"), read("static/glass.css")]
    css = "\n".join(styles)
    for token in ("--aurora-bg", "--aurora-text", "--aurora-muted", "--aurora-accent",
                  "--aurora-focus", "--aurora-font", "--aurora-radius", "--aurora-space-4"):
        assert token in tokens
    assert re.search(r'color-scheme\s*:\s*dark', tokens)
    assert re.search(r'\[data-theme\s*=\s*[\'\"]?light', tokens)
    assert re.search(r'color-scheme\s*:\s*light', tokens)
    assert re.search(r'@media\s*\(\s*max-width\s*:\s*700px\s*\)', css)
    assert re.search(r'prefers-reduced-motion\s*:\s*reduce', css)
    assert re.search(r'prefers-contrast\s*:\s*more', css)
    assert re.search(r'@supports\s+not[^\{]*backdrop-filter', css)
    assert "focus-visible" in css
    for sheet in styles:
        assert sheet.count("{") == sheet.count("}")


def test_advanced_style_covers_login_dashboard_and_responsive_motion():
    css = read("static/app.css") + "\n" + read("static/glass-classic.css")
    for selector in (".login-layout", ".login-card", ".sidebar", ".topbar", ".job-card"):
        assert selector in css
    assert re.search(r'@media\s*\(\s*max-width\s*:\s*(?:700|760)px\s*\)', css)
    assert re.search(r'prefers-reduced-motion\s*:\s*reduce', css)
    assert css.count("{") == css.count("}")


def test_workspace_navigation_exposes_queue_and_analytics_in_rendered_shell():
    from test_hosted import app
    client = app.test_client()
    with client.session_transaction() as session:
        session['owner'] = True
    response = client.get('/')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    for section in ('today', 'discover', 'saved', 'applications', 'queue', 'inbox',
                    'calendar', 'analytics'):
        assert re.search(r'href="#' + section + r'"[^>]*data-nav="' + section + r'"', html)
    assert 'href="#content"' in html
    assert 'id="content" tabindex="-1"' in html
