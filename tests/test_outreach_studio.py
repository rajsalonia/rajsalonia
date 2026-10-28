"""Unit tests for private spreadsheet intake and draft preparation."""
import pytest
from outreach_studio import read_contact_sheet, compose_draft

def test_extract_header_variants():
    csv_data=b"Company Name,Email Address,Full Name\nDemoCo,hr@example.org,Alex\n"
    rows=read_contact_sheet("contacts.csv",csv_data)["rows"]
    assert len(rows)==1
    assert rows[0]["company"]=="DemoCo"
    assert rows[0]["email"]=="hr@example.org"
    assert rows[0]["ready"] is True

def test_never_invents_company_or_email():
    rows=read_contact_sheet("contacts.csv",b"Company,Email\n,not-an-email\n")["rows"]
    assert rows[0]["ready"] is False

def test_draft_is_review_first():
    draft=compose_draft({"company":"DemoCo","email":"hr@example.org","name":"Alex"},season="winter",focus="backend")
    assert "2028" in draft["body"]
    assert "FastAPI" in draft["body"]
    assert "whether" in draft["body"]
    assert draft["attach_original_resume"] is False
    assert "not sent" in draft["warning"]

def test_invalid_file_rejected():
    with pytest.raises(ValueError):
        read_contact_sheet("contacts.xls", b"not an xlsx")
