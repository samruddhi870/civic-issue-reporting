# DFD 9.0 - CSV & Report Export Service
import csv
import io
from datetime import datetime, timezone
from models import Issue

def generate_issues_csv(issues=None):
    """
    Generates a RFC 4180-compliant CSV string containing all civic issues and SLA performance data.
    """
    if issues is None:
        issues = Issue.query.order_by(Issue.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header Row
    writer.writerow([
        "Ticket Number",
        "Category",
        "Severity",
        "Title",
        "Department",
        "Assigned Officer",
        "Status",
        "SLA Hours",
        "SLA Deadline (UTC)",
        "Created At (UTC)",
        "Resolved At (UTC)",
        "Closed At (UTC)",
        "SLA Compliant (On-Time)",
        "Overdue (Yes/No)",
        "Escalation Level",
        "Upvotes",
        "Priority Score",
        "Citizen Rating (1-5)",
        "Latitude",
        "Longitude",
        "Address",
        "Ward/Area"
    ])

    now = datetime.now(timezone.utc)

    for issue in issues:
        # Determine On-Time resolution status
        if issue.status in ["Resolved", "Closed"] and issue.resolved_at:
            res_utc = issue.resolved_at.replace(tzinfo=timezone.utc) if issue.resolved_at.tzinfo is None else issue.resolved_at
            dead_utc = issue.sla_deadline.replace(tzinfo=timezone.utc) if issue.sla_deadline.tzinfo is None else issue.sla_deadline
            sla_compliant = "Yes" if res_utc <= dead_utc else "No"
            is_overdue = "No"
        else:
            dead_utc = issue.sla_deadline.replace(tzinfo=timezone.utc) if issue.sla_deadline.tzinfo is None else issue.sla_deadline
            sla_compliant = "Pending"
            is_overdue = "Yes" if now > dead_utc else "No"

        rating_str = str(issue.feedback.rating) if issue.feedback else "N/A"

        writer.writerow([
            issue.ticket_number,
            issue.category,
            issue.severity,
            issue.title,
            issue.department.name if issue.department else "Unassigned",
            issue.assigned_officer.full_name if issue.assigned_officer else "Unassigned",
            issue.status,
            issue.sla_hours,
            issue.sla_deadline.isoformat() if issue.sla_deadline else "",
            issue.created_at.isoformat() if issue.created_at else "",
            issue.resolved_at.isoformat() if issue.resolved_at else "",
            issue.closed_at.isoformat() if issue.closed_at else "",
            sla_compliant,
            is_overdue,
            issue.escalation_level,
            issue.upvote_count,
            round(issue.priority_score, 1),
            rating_str,
            issue.latitude,
            issue.longitude,
            issue.address or "",
            issue.ward_area or ""
        ])

    output.seek(0)
    return output.getvalue()


def generate_issues_pdf(issues=None):
    """
    DFD 9.0 - Generates an executive PDF report summarizing municipal SLA compliance and caseload.
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from models import Department

    if issues is None:
        issues = Issue.query.order_by(Issue.created_at.desc()).all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        alignment=0
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b')
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#026bc9')
    )
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    cell_header = ParagraphStyle(
        'CellHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    elements = []

    # Title & Metadata
    now_str = datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")
    elements.append(Paragraph("CIVICCONNECT MUNICIPAL GOVERNANCE", title_style))
    elements.append(Paragraph(f"Executive SLA Compliance & Grievance Resolution Audit Report &bull; Generated: {now_str}", subtitle_style))
    elements.append(Spacer(1, 14))

    # Calculate Executive KPIs
    total = len(issues)
    resolved = sum(1 for i in issues if i.status in ["Resolved", "Closed"])
    active = total - resolved
    now = datetime.now(timezone.utc)
    overdue = sum(1 for i in issues if i.status not in ["Resolved", "Closed"] and (i.sla_deadline.replace(tzinfo=timezone.utc) if i.sla_deadline.tzinfo is None else i.sla_deadline) < now)

    on_time = 0
    for i in issues:
        if i.status in ["Resolved", "Closed"]:
            if i.resolved_at:
                res_u = i.resolved_at.replace(tzinfo=timezone.utc) if i.resolved_at.tzinfo is None else i.resolved_at
                dead_u = i.sla_deadline.replace(tzinfo=timezone.utc) if i.sla_deadline.tzinfo is None else i.sla_deadline
                if res_u <= dead_u:
                    on_time += 1
            else:
                on_time += 1

    compliance_pct = round((on_time / resolved * 100.0), 1) if resolved > 0 else 100.0

    # Summary KPI Table
    kpi_data = [
        [
            Paragraph("<b>Total Grievances</b>", cell_style),
            Paragraph(str(total), cell_style),
            Paragraph("<b>Active In-Queue</b>", cell_style),
            Paragraph(str(active), cell_style),
        ],
        [
            Paragraph("<b>Resolved & Closed</b>", cell_style),
            Paragraph(str(resolved), cell_style),
            Paragraph("<b>SLA Overdue/Breached</b>", cell_style),
            Paragraph(str(overdue), cell_style),
        ],
        [
            Paragraph("<b>SLA Compliance Rate</b>", cell_style),
            Paragraph(f"<b>{compliance_pct}%</b>", cell_style),
            Paragraph("<b>Escalation Policy</b>", cell_style),
            Paragraph("75% / 100% / 200%", cell_style),
        ]
    ]

    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 16))

    # Recent Grievance Audit Trail Table
    elements.append(Paragraph("Recent Civic Issues & Turnaround Audit Trail", heading_style))
    elements.append(Spacer(1, 6))

    table_data = [
        [
            Paragraph("Ticket", cell_header),
            Paragraph("Category", cell_header),
            Paragraph("Title", cell_header),
            Paragraph("Department", cell_header),
            Paragraph("Status", cell_header),
            Paragraph("SLA", cell_header),
        ]
    ]

    for iss in issues[:25]:  # Top 25 rows for concise executive summary
        table_data.append([
            Paragraph(iss.ticket_number, cell_style),
            Paragraph(iss.category, cell_style),
            Paragraph(iss.title[:28] + ("..." if len(iss.title) > 28 else ""), cell_style),
            Paragraph(iss.department.name[:20] if iss.department else "General", cell_style),
            Paragraph(iss.status, cell_style),
            Paragraph(f"{iss.sla_hours}h", cell_style),
        ])

    issue_table = Table(table_data, colWidths=[75, 95, 160, 110, 60, 40])
    issue_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#026bc9')),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 1), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
    ]))
    elements.append(issue_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

