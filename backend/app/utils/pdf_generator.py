import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pdf_report(
    assessment, 
    patient, 
    questionnaire, 
    output_path: str,
    signal_plot_path: str = None, 
    spec_plot_path: str = None
) -> str:
    """
    Generates a professional PDF clinical report for a Knee OA Assessment.
    Returns: File path of the generated PDF.
    """
    doc = SimpleDocTemplate(
        output_path, 
        pagesize=letter,
        rightMargin=40, 
        leftMargin=40, 
        topMargin=40, 
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles for Healthcare Theme
    primary_color = colors.HexColor('#2563EB')   # Cobalt Blue
    secondary_color = colors.HexColor('#0EA5E9') # Light Blue
    dark_neutral = colors.HexColor('#1E293B')    # Slate 800
    light_neutral = colors.HexColor('#F8FAFC')   # Slate 50
    border_color = colors.HexColor('#E2E8F0')    # Slate 200
    
    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=secondary_color,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_neutral
    )
    
    bold_body_style = ParagraphStyle(
        'BoldBodyText',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    q_header_style = ParagraphStyle(
        'QHeaderStyle',
        parent=bold_body_style,
        textColor=colors.white
    )
    
    recommendation_style = ParagraphStyle(
        'RecText',
        parent=body_style,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0F172A')
    )
    
    story = []
    
    # --- Header Banner ---
    header_data = [
        [
            Paragraph("OA Insight", title_style),
            Paragraph(f"<b>Assessment ID:</b> {assessment.id[:8]}...<br/><b>Date:</b> {assessment.assessment_date.strftime('%Y-%m-%d %H:%M')}", body_style)
        ],
        [
            Paragraph("LOW-COST KNEE OSTEOARTHRITIS ASSESSMENT SYSTEM", subtitle_style),
            ""
        ]
    ]
    header_table = Table(header_data, colWidths=[4.0 * inch, 3.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('SPAN', (0,1), (1,1)),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    
    # --- Patient Profile ---
    patient_dob = patient.dob if patient.dob else "N/A"
    patient_gender = patient.gender if patient.gender else "N/A"
    
    profile_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_style), 
            Paragraph(f"{patient.first_name} {patient.last_name}", body_style),
            Paragraph("<b>Gender / DOB:</b>", body_style),
            Paragraph(f"{patient_gender} / {patient_dob}", body_style)
        ],
        [
            Paragraph("<b>Patient Email:</b>", body_style),
            Paragraph(patient.email, body_style),
            Paragraph("<b>Report Type:</b>", body_style),
            Paragraph("Clinical Diagnostic Support", body_style)
        ]
    ]
    
    profile_table = Table(profile_data, colWidths=[1.5*inch, 2.25*inch, 1.5*inch, 2.25*inch])
    profile_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_neutral),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(profile_table)
    story.append(Spacer(1, 15))
    
    # --- Diagnostic Results Box (Severity) ---
    severity_str = assessment.severity if assessment.severity else "N/A"
    confidence_str = f"{assessment.confidence}%" if assessment.confidence else "N/A"
    risk_score_str = f"{assessment.risk_score}/100" if assessment.risk_score else "N/A"
    
    # Map colors
    severity_colors = {
        "Normal": colors.HexColor('#DCFCE7'),      # Light green
        "Mild OA": colors.HexColor('#FEF9C3'),     # Light yellow
        "Moderate OA": colors.HexColor('#FFEDD5'), # Light orange
        "Severe OA": colors.HexColor('#FEE2E2'),   # Light red
    }
    text_colors = {
        "Normal": colors.HexColor('#166534'),
        "Mild OA": colors.HexColor('#854D0E'),
        "Moderate OA": colors.HexColor('#C2410C'),
        "Severe OA": colors.HexColor('#991B1B'),
    }
    
    bg_col = severity_colors.get(severity_str, light_neutral)
    text_col = text_colors.get(severity_str, primary_color)
    
    diag_style = ParagraphStyle(
        'DiagVal',
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=text_col,
        alignment=1 # Center
    )
    
    label_style = ParagraphStyle(
        'DiagLbl',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=dark_neutral,
        alignment=1 # Center
    )
    
    diag_data = [
        [
            Paragraph("CLINICAL OA SEVERITY CLASSIFICATION", label_style),
            Paragraph("AI MODEL CONFIDENCE", label_style),
            Paragraph("COMPOSITE RISK INDEX", label_style)
        ],
        [
            Paragraph(f"{severity_str}", diag_style),
            Paragraph(f"{confidence_str}", diag_style),
            Paragraph(f"{risk_score_str}", diag_style)
        ]
    ]
    
    diag_table = Table(diag_data, colWidths=[2.5*inch, 2.5*inch, 2.5*inch])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_col),
        ('BOX', (0,0), (-1,-1), 1.5, text_col),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 15))
    
    # --- Questionnaire Scores ---
    story.append(Paragraph("Patient-Reported Measures (PRM) Scores", h1_style))
    
    womac_val = f"{assessment.womac_score}/96" if assessment.womac_score else "N/A"
    koos_val = f"{assessment.koos_score}/100" if assessment.koos_score else "N/A"
    
    q_data = [
        [
            Paragraph("<b>Clinical Score Metric</b>", q_header_style),
            Paragraph("<b>Computed Score</b>", q_header_style),
            Paragraph("<b>Clinical Interpretation (Standard)</b>", q_header_style)
        ],
        [
            Paragraph("WOMAC Osteoarthritis Index", body_style),
            Paragraph(womac_val, bold_body_style),
            Paragraph("Sum of pain (20), stiffness (8), and mobility difficulty (68). Higher is worse.", body_style)
        ],
        [
            Paragraph("KOOS Joint Outcome Score", body_style),
            Paragraph(koos_val, bold_body_style),
            Paragraph("Normalized index from 0 to 100. 100 = No symptoms; 0 = Extreme symptoms.", body_style)
        ],
        [
            Paragraph("Subscores - Pain Index", body_style),
            Paragraph(f"{questionnaire.pain_score}/20", body_style),
            Paragraph("Sum of 5 standard Likert-scale joint pain responses.", body_style)
        ],
        [
            Paragraph("Subscores - Stiffness Index", body_style),
            Paragraph(f"{questionnaire.stiffness_score}/8", body_style),
            Paragraph("Sum of 2 morning and diurnal stiffness responses.", body_style)
        ],
        [
            Paragraph("Subscores - Physical Mobility", body_style),
            Paragraph(f"{questionnaire.mobility_score}/100", body_style),
            Paragraph("Normalized functional capability level. Higher is better.", body_style)
        ],
    ]
    
    q_table = Table(q_data, colWidths=[2.2*inch, 1.3*inch, 4.0*inch])
    q_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_neutral]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(q_table)
    story.append(Spacer(1, 15))
    
    # --- Explainable AI (XAI) Model Attribution & Risk Drivers ---
    xai_section = []
    xai_section.append(Paragraph("Explainable AI (XAI) Model Attribution &amp; Risk Drivers", h1_style))
    
    # Extract XAI insights from questionnaire raw_responses
    raw_responses = {}
    if questionnaire and hasattr(questionnaire, 'raw_responses') and questionnaire.raw_responses:
        if isinstance(questionnaire.raw_responses, str):
            try:
                raw_responses = json.loads(questionnaire.raw_responses)
            except (json.JSONDecodeError, TypeError):
                raw_responses = {}
        elif isinstance(questionnaire.raw_responses, dict):
            raw_responses = questionnaire.raw_responses
    
    xai_data = raw_responses.get("xai_insights", {})
    clinical_pct = xai_data.get("clinical_contribution", 60)
    acoustic_pct = xai_data.get("acoustic_contribution", 40)
    risk_factors = xai_data.get("risk_factors", [])
    
    # -- XAI Contribution Ratio Bar --
    xai_section.append(Paragraph("<b>Decision Source Contribution Ratio</b>", bold_body_style))
    xai_section.append(Spacer(1, 4))
    
    # Calculate proportional column widths for stacked bar (total 7.5 inches)
    total_bar_width = 7.5
    clinical_width = max(0.5, round(total_bar_width * (clinical_pct / 100.0), 2))
    acoustic_width = max(0.5, total_bar_width - clinical_width)
    
    clinical_bar_style = ParagraphStyle(
        'ClinicalBar',
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=1
    )
    acoustic_bar_style = ParagraphStyle(
        'AcousticBar',
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=1
    )
    
    bar_data = [[
        Paragraph(f"{round(clinical_pct)}% Clinical Survey", clinical_bar_style),
        Paragraph(f"{round(acoustic_pct)}% Acoustic Signal", acoustic_bar_style)
    ]]
    
    bar_table = Table(bar_data, colWidths=[clinical_width * inch, acoustic_width * inch])
    bar_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), primary_color),
        ('BACKGROUND', (1, 0), (1, 0), secondary_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    xai_section.append(bar_table)
    xai_section.append(Spacer(1, 10))
    
    # -- Risk Factors List --
    if risk_factors:
        xai_section.append(Paragraph("<b>Key Identified Severity Risk Factors</b>", bold_body_style))
        xai_section.append(Spacer(1, 4))
        
        risk_bullet_style = ParagraphStyle(
            'RiskBullet',
            parent=body_style,
            fontSize=9,
            leading=13,
            leftIndent=12,
            bulletIndent=0,
            bulletFontName='Helvetica-Bold',
            bulletFontSize=9,
            textColor=dark_neutral
        )
        
        risk_rows = []
        for factor in risk_factors:
            risk_rows.append([
                Paragraph("\u2022", ParagraphStyle('Bullet', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#EF4444'), alignment=1)),
                Paragraph(factor, body_style)
            ])
        
        risk_table = Table(risk_rows, colWidths=[0.3 * inch, 7.2 * inch])
        risk_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('BACKGROUND', (0, 0), (-1, -1), light_neutral),
            ('BOX', (0, 0), (-1, -1), 0.5, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, border_color),
        ]))
        xai_section.append(risk_table)
    else:
        xai_section.append(Paragraph("<i>No specific risk factors identified for this assessment.</i>", body_style))
    
    story.append(KeepTogether(xai_section))
    story.append(Spacer(1, 15))
    
    # --- Acoustic Analysis ---
    story.append(Paragraph("Knee Acoustic Emission (KAE) Signal Processing", h1_style))
    
    # Handle Image insertion
    # Ensure images fit on the page (width ~ 3.5 inches each if side-by-side, or 7 inches stacked)
    elements_acoustic = []
    
    if signal_plot_path and os.path.exists(signal_plot_path) and spec_plot_path and os.path.exists(spec_plot_path):
        img_sig = Image(signal_plot_path, width=3.6*inch, height=2.1*inch)
        img_spec = Image(spec_plot_path, width=3.6*inch, height=2.1*inch)
        
        img_table = Table([[img_sig, img_spec]], colWidths=[3.75*inch, 3.75*inch])
        img_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        elements_acoustic.append(img_table)
    else:
        elements_acoustic.append(Paragraph("<i>Acoustic signals processed. Plot images unavailable for this report copy.</i>", body_style))
        
    story.append(KeepTogether(elements_acoustic))
    story.append(Spacer(1, 15))
    
    # --- Recommendations and Doctor Notes ---
    rec_box = []
    rec_box.append(Paragraph("Clinical Recommendations & Diagnostic Notes", h1_style))
    
    recommendation_text = assessment.recommendations if assessment.recommendations else "No specific recommendations generated."
    
    rec_data = [
        [
            Paragraph(f"<b>Rehabilitation & Action Plan:</b><br/>{recommendation_text}", recommendation_style)
        ]
    ]
    rec_table = Table(rec_data, colWidths=[7.5*inch])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')), # Light blue-50 background
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BFDBFE')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    rec_box.append(rec_table)
    
    story.append(KeepTogether(rec_box))
    
    # --- Footer Sign-off ---
    story.append(Spacer(1, 20))
    sign_off_data = [
        [
            Paragraph("<b>Assessing Clinician:</b> ___________________________", body_style),
            Paragraph("<b>Signature / Stamp:</b> ___________________________", body_style)
        ],
        [
            Paragraph("Computer generated report. Valid without physical signature.", ParagraphStyle('gray', parent=body_style, textColor=colors.HexColor('#64748B'))),
            ""
        ]
    ]
    sign_off_table = Table(sign_off_data, colWidths=[3.75*inch, 3.75*inch])
    sign_off_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether(sign_off_table))
    
    # Build Document
    doc.build(story)
    return output_path
