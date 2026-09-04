#!/usr/bin/env python3
"""Generate the public SignalTrue pre-sales security and privacy overview."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "signaltrue-security-privacy-overview.pdf"

INK = colors.HexColor("#0F172A")
TEXT = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
BRAND = colors.HexColor("#0C6B5E")
BRAND_SOFT = colors.HexColor("#E8F4F1")
LINE = colors.HexColor("#CBD5E1")
PALE = colors.HexColor("#F8FAFC")
WARNING = colors.HexColor("#FEF3C7")


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_label": ParagraphStyle(
            "cover_label",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=BRAND,
            spaceAfter=10,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=30,
            leading=35,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=18,
        ),
        "cover_intro": ParagraphStyle(
            "cover_intro",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=13,
            leading=20,
            textColor=TEXT,
            spaceAfter=22,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=INK,
            spaceAfter=14,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=7,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=15.2,
            textColor=TEXT,
            spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12.5,
            textColor=MUTED,
            spaceAfter=5,
        ),
        "card_title": ParagraphStyle(
            "card_title",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=14,
            textColor=INK,
            spaceAfter=4,
        ),
        "card_body": ParagraphStyle(
            "card_body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=13,
            textColor=TEXT,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }


S = styles()


def card(title, body, background=PALE):
    table = Table(
        [[Paragraph(title, S["card_title"]), Paragraph(body, S["card_body"])]],
        colWidths=[49 * mm, 118 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return KeepTogether([table, Spacer(1, 5)])


def two_column_cards(items):
    cells = []
    for title, body in items:
        cells.append(
            Table(
                [[Paragraph(title, S["card_title"])], [Paragraph(body, S["card_body"])]],
                colWidths=[81 * mm],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), PALE),
                        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]
                ),
            )
        )
    rows = [cells[index : index + 2] for index in range(0, len(cells), 2)]
    if len(rows[-1]) == 1:
        rows[-1].append("")
    wrapper = Table(rows, colWidths=[84 * mm, 84 * mm], hAlign="LEFT")
    wrapper.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return wrapper


def bullet(text):
    return Paragraph(f"- {text}", S["body"])


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(BRAND)
    canvas.roundRect(18 * mm, height - 20 * mm, 8 * mm, 8 * mm, 1.5 * mm, fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(30 * mm, height - 15 * mm, "SignalTrue")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 16 * mm, width - 18 * mm, 16 * mm)
    footer = Paragraph(
        f"Public pre-sales overview | Version 2 September 2026 | Page {doc.page}",
        S["footer"],
    )
    _, footer_height = footer.wrap(width - 36 * mm, 10 * mm)
    footer.drawOn(canvas, 18 * mm, 7 * mm + footer_height / 2)
    canvas.restoreState()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=27 * mm,
        bottomMargin=22 * mm,
        title="SignalTrue Security and Privacy Overview",
        author="SignalTrue",
        subject="Public pre-sales security, privacy and responsible-use overview",
    )

    story = [
        Spacer(1, 17 * mm),
        Paragraph("PUBLIC PRE-SALES OVERVIEW", S["cover_label"]),
        Paragraph("Security, privacy and responsible use", S["cover_title"]),
        Paragraph(
            "SignalTrue provides team-level work-pattern evidence for workplace health, safety and work-design prevention. This overview gives procurement, privacy, security and worker representatives a portable summary of the current public product boundaries.",
            S["cover_intro"],
        ),
        card(
            "Purpose",
            "Observe material and persistent changes in team work patterns so an organization can investigate with workers, record a proportionate control and review what happened next.",
            BRAND_SOFT,
        ),
        card(
            "Not a conclusion",
            "A SignalTrue observation does not establish cause, diagnose a medical condition, infer sentiment, certify compliance or replace worker consultation and professional judgement.",
            WARNING,
        ),
        Spacer(1, 6 * mm),
        Paragraph("Core public commitments", S["h2"]),
        two_column_cards(
            [
                ("Metadata, not content", "Meeting times, durations, counts, response intervals and team mapping can be used. Message text, email bodies, documents and recordings are excluded."),
                ("Team-level reporting", "Results are intended for work-system investigation. Managers do not receive employee productivity rankings or individual health-risk scores."),
                ("Minimum group protections", "The reporting floor is five active people. Some sensitive indicators require eight, and a customer can configure a higher threshold."),
                ("Human decisions", "Workers and accountable owners add context, decide what to change and review the evidence. SignalTrue does not close the case automatically."),
            ]
        ),
        Spacer(1, 4 * mm),
        Paragraph(
            "Public trust centre: <link href='https://www.signaltrue.ai/trust' color='#0C6B5E'>signaltrue.ai/trust</link>",
            S["small"],
        ),
        PageBreak(),
        Paragraph("Data and technical boundaries", S["h1"]),
        Paragraph(
            "The final data flow is deployment-specific. Before production telemetry is enabled, the customer and SignalTrue confirm the purpose, scope, sources, permissions, locations, roles, retention and worker-communication requirements in writing.",
            S["body"],
        ),
        Paragraph("Information SignalTrue may use", S["h2"]),
        bullet("Calendar event timestamps, duration, recurrence and participant counts."),
        bullet("Communication timing and activity counts without message bodies or private notes."),
        bullet("Mapped team membership needed to aggregate eligible work groups."),
        bullet("Customer-provided context, control ownership and review dates."),
        Paragraph("Information excluded from the public product purpose", S["h2"]),
        bullet("Slack or chat message text, email bodies, document contents and meeting recordings."),
        bullet("Screen, keystroke, webcam, emotion, mood or sentiment tracking."),
        bullet("Individual productivity leaderboards, psychological profiles or automated employment decisions."),
        Paragraph("Technical controls described publicly", S["h2"]),
        two_column_cards(
            [
                ("Encryption", "Data is encrypted in transit and at rest. Deployment-specific evidence is confirmed during security review."),
                ("Access control", "Role boundaries separate source configuration, evidence review, action records and executive summaries."),
                ("Aggregation", "Minimum group-size and data-quality checks are applied before a team-level observation is reportable."),
                ("Purpose limitation", "The agreed risk question, eligible teams, allowed fields, prohibited uses and output recipients are recorded before access is connected."),
            ]
        ),
        Paragraph("Deployment details that must be confirmed", S["h2"]),
        bullet("Hosting, processing, logs, backups, support access and subprocessor locations."),
        bullet("OAuth scopes, connector permissions, environment separation and incident contacts."),
        bullet("Retention periods, deletion workflow and contract-exit handling."),
        bullet("Whether optional AI processing is enabled and which approved provider and region apply."),
        Paragraph(
            "No storage region, certification or regulatory status should be inferred from this public overview. The signed agreement and deployment record control where details differ.",
            S["small"],
        ),
        PageBreak(),
        Paragraph("Procurement and responsible-use checklist", S["h1"]),
        Paragraph(
            "Use this checklist to identify the evidence your organization needs before a pilot. SignalTrue can provide deployment-specific answers and supporting material during security review.",
            S["body"],
        ),
        card("Purpose and lawful-use record", "Risk question, scope, accountable owner, intended recipients and prohibited individual-monitoring or employment-decision uses."),
        card("Data map", "Sources, fields, transformations, team mapping, minimum group rules, derived metrics and report recipients."),
        card("Access matrix", "Roles permitted to authorize sources, configure scope, inspect evidence, record controls or receive executive summaries."),
        card("Retention and deletion", "Deployment-specific retention periods, deletion workflow, backups, support access and contract-exit process."),
        card("Hosting and subprocessors", "Applicable service providers, locations, incident contacts and any optional AI-processing mode."),
        card("DPIA and DPA support", "Information needed for the customer's own impact assessment, worker consultation and data-processing agreement."),
        Spacer(1, 4 * mm),
        Paragraph("Evidence-to-action method", S["h2"]),
        two_column_cards(
            [
                ("1. Qualify", "Confirm coverage, group thresholds, baseline maturity and known exclusions."),
                ("2. Inspect", "Show current value, baseline, change, persistence, confidence and data quality."),
                ("3. Consult", "Let workers and managers verify context, possible causes and practical controls."),
                ("4. Review", "Record the owner and review date, then measure the same indicator again."),
            ]
        ),
        Spacer(1, 5 * mm),
        Paragraph("Contact", S["h2"]),
        Paragraph(
            "Privacy and data-protection questions: <link href='mailto:privacy@signaltrue.ai' color='#0C6B5E'>privacy@signaltrue.ai</link><br/>Commercial and security review: <link href='https://www.signaltrue.ai/psychosocial-risk-visibility-review' color='#0C6B5E'>signaltrue.ai/psychosocial-risk-visibility-review</link>",
            S["body"],
        ),
        Paragraph(
            "This document is an informational pre-sales summary, not a certification, legal opinion, signed security schedule or data-processing agreement.",
            S["small"],
        ),
    ]

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(OUTPUT)


if __name__ == "__main__":
    build()
