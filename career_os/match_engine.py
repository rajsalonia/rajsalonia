"""Evidence-first shortlist for the Opportunity OS personal career workspace.

Rules are deterministic and auditable. A 'fit' is NOT acceptance probability,
a listing status check, or confirmation that India work authorization is accepted.
Private Gmail messages, recruiter contacts and resume bytes are not model features.
"""
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

TRACKS = {
    "backend": (r"\bpython\b", r"\bfastapi\b", r"\bbackend\b", r"\bapi\b", r"\bsql\b"),
    "ai": (r"\bai\b", r"\bllm\b", r"\brag\b", r"\bmachine.learning\b", r"\bagent(?:ic)?\b"),
    "cloud": (r"\bcloud\b", r"\baws\b", r"\bdevops\b", r"\bsre\b", r"\bdocker\b", r"\binfrastructure\b"),
}
FOREIGN_ONLY = re.compile(
    r"\b(?:united states|usa|us[- ]only|canada[- ]only|uk[- ]only|europe[- ]only|emea[- ]only|"
    r"must (?:be |reside |live )?(?:located |based |living )?in (?:the )?(?:united states|us|usa|canada|uk|europe))\b",
    re.I)
INDIA_LOCATION = re.compile(r"\b(?:india|indian|delhi|ncr|noida|gurugram|gurgaon|"
    r"bengaluru|bangalore|pune|hyderabad|mumbai|chennai|kolkata|kochi)\b", re.I)
WORLDWIDE = re.compile(r"\b(?:worldwide|globally|anywhere in the world)\b", re.I)
GRAD_CONFLICT = re.compile(r"\b(?:202[4567])\s*(?:graduates? only|batch only)\b", re.I)
WINTER = re.compile(r"\bwinter\b", re.I)
SENIOR = re.compile(r"\b(?:senior|staff|principal|director|vp|lead engineer|engineering manager)\b", re.I)


def season_evidence(item, today=None):
    today = today or datetime.now(ZoneInfo("Asia/Kolkata")).date()
    start = today.year if today.month >= 7 else today.year - 1
    end = start + 1
    title = str(item.get("title") or "")
    desc = str((item.get("extracted") or {}).get("description") or item.get("description") or "")[:6000]
    text = title + " " + desc
    if re.search(r"\bwinter\s+20\d{2}\b", text, re.I) and not re.search(rf"\bwinter\s+{start}\b", text, re.I):
        return "not_this_winter"
    if WINTER.search(text):
        return f"winter {start}–{end}"
    if any(re.search(pattern, text, re.I) for pattern in (
        rf"\b(?:november|december|nov|dec)\s+{start}\b",
        rf"\b(?:january|february|jan|feb)\s+{end}\b",
        rf"\b{start}[-/– ]+(?:{end}|{str(end)[-2:]})\b",
        rf"\b{start}[-/]1[12]\b",
        rf"\b{end}[-/]0?[12]\b",
    )):
        return f"possible winter {start}–{end}"
    return "not stated"


def remote_evidence(item):
    extracted = item.get("extracted") or {}
    mode = str(extracted.get("work_mode") or "Not disclosed")
    location = str(item.get("location") or "")
    desc = str(extracted.get("description") or "")[:8500]
    text = location + "\n" + desc
    if mode != "Remote":
        return {"scope": "Not remote" if mode in {"Hybrid", "On-site"} else "Unspecified",
                "india_eligible": False, "evidence": "Remote mode is not established"}
    if FOREIGN_ONLY.search(location) and not INDIA_LOCATION.search(location):
        return {"scope": "Regional restriction", "india_eligible": False,
                "evidence": "Location names a non-India region; verify any exceptions"}
    if re.search(r"\b(?:remote\s*[-,/·:]?\s*india|india\s*[-,/·:]?\s*remote|remote in india|"
                 r"india[- ]based remote|remote within india|work from india|india only)\b", text, re.I):
        return {"scope": "India explicitly mentioned", "india_eligible": True,
                "evidence": "Remote work and India stated together; check detailed eligibility"}
    if WORLDWIDE.search(location):
        return {"scope": "Worldwide claimed", "india_eligible": False,
                "evidence": "Worldwide scope is claimed but India work arrangements still need verification"}
    if INDIA_LOCATION.search(location):
        return {"scope": "India appears in location", "india_eligible": False,
                "evidence": "Check whether remote work is actually permitted from India"}
    return {"scope": "India not confirmed", "india_eligible": False,
            "evidence": "No affirmative India-eligible remote restriction found"}


def assess(item, *, today=None):
    category = str(item.get("category") or "")
    title = str(item.get("title") or "")
    eligibility = item.get("eligibility") or {}
    code = str(eligibility.get("code") or "unknown")
    rec = item.get("recommendation") or {}
    extracted = item.get("extracted") or {}
    description = str(extracted.get("description") or item.get("description") or "")
    text = title + " " + description
    remote = remote_evidence(item)
    winter = season_evidence(item, today)
    stage = str(item.get("stage") or "Discovered")
    excluded = (category.lower() != "internship" or code in {"closed", "ineligible"}
                or bool(item.get("archived")) or bool(item.get("dismissed"))
                or stage in {"Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn", "Closed"}
                or bool(SENIOR.search(title)))
    track_hits = {key: sum(bool(re.search(pattern, text, re.I)) for pattern in patterns)
                  for key, patterns in TRACKS.items()}
    track = max(TRACKS, key=lambda k: track_hits[k])
    if track_hits[track] == 0:
        track = "general"
    score = min(99, max(0, int(rec.get("score") or 0)))
    if code == "unknown":
        score = min(score, 72)
    if remote["scope"] == "Regional restriction":
        score = min(score, 35)
    reasons = list(rec.get("reasons") or [])[:2]
    checks = []
    grad = (extracted.get("fields") or {}).get("graduation_years") or {}
    years = grad.get("value") or []
    if years and 2028 not in years:
        checks.append("Employer year requirement may exclude 2028")
        excluded = True
    elif not years:
        checks.append("2028 graduation-year eligibility not stated")
    else:
        reasons.append("Graduation-year evidence includes 2028")
    if code == "unknown":
        checks.append("Employer requirements need manual review")
    if extracted.get("work_mode") == "Remote" and not remote["india_eligible"]:
        checks.append("Remote work from India not confirmed")
    if not (extracted.get("fields") or {}).get("compensation", {}).get("value"):
        checks.append("Stipend not disclosed")
    if item.get("stale"):
        checks.append("Source freshness needs review")
    if not (extracted.get("deadline") or {}).get("date"):
        checks.append("Official application deadline not stated")
    if WINTER.search(text) and winter == "not_this_winter":
        checks.append("Winter wording refers to a different year")
    level = "not_recommended" if excluded else "strong" if score >= 65 and code in ("eligible", "likely") else "review"
    return {"key": item.get("key"), "score": score, "level": level, "track": track,
            "track_hits": track_hits, "winter": winter, "remote": remote,
            "checks": checks[:6], "reasons": reasons[:3],
            "excluded": excluded, "kind": "Rules-based relevance, not hiring probability"}


def shortlist(items, *, today=None, limit=45):
    reviewed = []
    for item in items:
        fit = assess(item, today=today)
        if fit["excluded"]:
            continue
        reviewed.append({**item, "fit": fit})
    reviewed.sort(key=lambda x: (x["fit"]["level"] == "strong",
                               x["fit"]["score"], not x.get("stale"),
                               str(x.get("first_seen") or "")), reverse=True)
    top = reviewed[:max(1, min(100, int(limit)))]
    return {
        "items": top,
        "total": len(reviewed),
        "counts": {
            "strong": sum(x["fit"]["level"] == "strong" for x in reviewed),
            "winter": sum(x["fit"]["winter"].startswith(("winter ", "possible winter")) for x in reviewed),
            "remote_india_stated": sum(x["fit"]["remote"]["india_eligible"] for x in reviewed),
            "review": sum(x["fit"]["level"] == "review" for x in reviewed),
        },
        "explanation": "Evidence-aware personal relevance; no employer outcome or verified availability implied.",
        "remote_warning": "Remote is India-explicit only when the employer source says so; it still needs manual confirmation.",
    }
