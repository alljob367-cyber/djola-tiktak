# -*- coding: utf-8 -*-
"""
Djola TikTak — Audit Produit Complet
ReportLab PDF Generation
"""

import hashlib, os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FONT REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/lxgw-wenkai/LXGWWenKai-Regular.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC')

pdfmetrics.registerFont(TTFont('Carlito', f'{FONT_DIR}/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', f'{FONT_DIR}/truetype/english/Carlito-Bold.ttf'))
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CASCADE PALETTE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_BG = colors.HexColor('#f2f2f1')
SECTION_BG = colors.HexColor('#f1f1ef')
CARD_BG = colors.HexColor('#eae9e6')
TABLE_STRIPE = colors.HexColor('#f4f4f2')
HEADER_FILL = colors.HexColor('#685f44')
COVER_BLOCK = colors.HexColor('#6b644d')
BORDER = colors.HexColor('#c5bda3')
ICON = colors.HexColor('#a89355')
ACCENT = colors.HexColor('#907422')
ACCENT_2 = colors.HexColor('#4c9fba')
TEXT_PRIMARY = colors.HexColor('#181716')
TEXT_MUTED = colors.HexColor('#7d7a73')
SEM_SUCCESS = colors.HexColor('#47895d')
SEM_WARNING = colors.HexColor('#8d733f')
SEM_ERROR = colors.HexColor('#a6544c')
SEM_INFO = colors.HexColor('#517daa')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
W = A4[0]
H = A4[1]
M_LEFT = 25*mm
M_RIGHT = 25*mm
M_TOP = 25*mm
M_BOTTOM = 25*mm
CONTENT_W = W - M_LEFT - M_RIGHT

styles = getSampleStyleSheet()

sH1 = ParagraphStyle('H1', fontName='NotoSerifSC-Bold', fontSize=18, leading=24,
    textColor=HEADER_FILL, spaceAfter=8, spaceBefore=16)
sH2 = ParagraphStyle('H2', fontName='NotoSerifSC-Bold', fontSize=14, leading=19,
    textColor=ACCENT, spaceAfter=6, spaceBefore=12)
sH3 = ParagraphStyle('H3', fontName='NotoSerifSC-Bold', fontSize=11, leading=15,
    textColor=TEXT_PRIMARY, spaceAfter=4, spaceBefore=8)
sBody = ParagraphStyle('Body', fontName='NotoSerifSC', fontSize=9.5, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6)
sBodyBold = ParagraphStyle('BodyBold', fontName='NotoSerifSC-Bold', fontSize=9.5, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6)
sBullet = ParagraphStyle('Bullet', fontName='NotoSerifSC', fontSize=9.5, leading=15,
    textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6, spaceAfter=3)
sMuted = ParagraphStyle('Muted', fontName='NotoSerifSC', fontSize=8, leading=12,
    textColor=TEXT_MUTED, spaceAfter=4)
sScore = ParagraphStyle('Score', fontName='NotoSerifSC-Bold', fontSize=28, leading=34,
    textColor=ACCENT, alignment=TA_CENTER, spaceAfter=4)
sScoreLabel = ParagraphStyle('ScoreLabel', fontName='NotoSerifSC', fontSize=10, leading=14,
    textColor=TEXT_MUTED, alignment=TA_CENTER)
sTOC0 = ParagraphStyle('TOC0', fontName='NotoSerifSC-Bold', fontSize=11, leading=20, leftIndent=0, textColor=TEXT_PRIMARY)
sTOC1 = ParagraphStyle('TOC1', fontName='NotoSerifSC', fontSize=10, leading=18, leftIndent=20, textColor=TEXT_MUTED)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOC TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', sBullet)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6, spaceBefore=6)

def score_table(score, label, details=None):
    data = [[Paragraph(str(score), sScore), Paragraph(label, sScoreLabel)]]
    t = Table(data, colWidths=[80, CONTENT_W - 80])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements = [t, Spacer(1, 8)]
    if details:
        elements.append(Paragraph(details, sMuted))
    return elements

def rating_table(rows):
    data = [['Fonctionnalite', 'Note /10', 'Statut']]
    for r in rows:
        status_color = SEM_SUCCESS if r[2] == 'Operationnel' else (SEM_WARNING if r[2] == 'Partiel' else SEM_ERROR)
        data.append([r[0], str(r[1]), r[2]])
    t = Table(data, colWidths=[CONTENT_W*0.50, CONTENT_W*0.20, CONTENT_W*0.30])
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]
    # Color status column
    for i, r in enumerate(rows):
        sc = SEM_SUCCESS if r[2] == 'Operationnel' else (SEM_WARNING if r[2] == 'Partiel' else SEM_ERROR)
        style_cmds.append(('TEXTCOLOR', (2, i+1), (2, i+1), sc))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD STORY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story = []

# --- COVER PAGE ---
story.append(Spacer(1, 80*mm))
story.append(Paragraph('RAPPORT D\'AUDIT PRODUIT', ParagraphStyle('CoverLabel',
    fontName='NotoSerifSC', fontSize=12, leading=16, textColor=ACCENT,
    letterSpacing=4, alignment=TA_CENTER)))
story.append(Spacer(1, 8*mm))
story.append(Paragraph('Djola TikTak', ParagraphStyle('CoverTitle',
    fontName='NotoSerifSC-Bold', fontSize=36, leading=44, textColor=TEXT_PRIMARY,
    alignment=TA_CENTER)))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('Plateforme de Prise de Rendez-vous', ParagraphStyle('CoverSub',
    fontName='NotoSerifSC', fontSize=16, leading=22, textColor=TEXT_MUTED,
    alignment=TA_CENTER)))
story.append(Spacer(1, 20*mm))
story.append(HRFlowable(width='40%', thickness=2, color=ACCENT, spaceAfter=12, spaceBefore=0))
story.append(Paragraph('Note globale : 62 / 100', ParagraphStyle('BigScore',
    fontName='NotoSerifSC-Bold', fontSize=20, leading=28, textColor=ACCENT,
    alignment=TA_CENTER)))
story.append(Spacer(1, 8*mm))
story.append(Paragraph('Valeur marchande estimee : 15 000 000 - 25 000 000 FCFA', ParagraphStyle('CoverMeta',
    fontName='NotoSerifSC', fontSize=11, leading=16, textColor=TEXT_MUTED,
    alignment=TA_CENTER)))
story.append(Spacer(1, 40*mm))
story.append(Paragraph('Aout 2025 | Audit confidentiel', ParagraphStyle('CoverFooter',
    fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_MUTED,
    alignment=TA_CENTER)))

story.append(PageBreak())

# --- TABLE OF CONTENTS ---
toc = TableOfContents()
toc.levelStyles = [sTOC0, sTOC1]
story.append(Paragraph('TABLE DES MATIERES', sH1))
story.append(Spacer(1, 6*mm))
story.append(toc)
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 1: SYNTHESE EXECUTIVE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('1. Synthese executive', sH1, 0))
story.append(Paragraph(
    'Djola TikTak est une plateforme SaaS de prise de rendez-vous destinee aux professionnels '
    'africains (restaurants, coiffeurs, consultants, boutiques, agences, sante, formation). '
    'L\'application est construite avec Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase '
    '(PostgreSQL) et deployee sur Vercel. Elle offre un systeme de booking public, un dashboard '
    'de gestion complet, un systeme de facturation par plans avec paiements Chariow et Mobile Money '
    '(Orange Money, MTN MoMo), et un panneau d\'administration.', sBody))

story.append(Paragraph(
    'L\'audit revele un produit fonctionnel avec une architecture moderne et une couverture '
    'fonctionnelle etendue (19 pages, 22 routes API, 13 tables de donnees). Cependant, plusieurs '
    'fonctionnalites critiques sont incompletes : le systeme de notifications (rappels email, SMS, '
    'WhatsApp, vocaux) est entierement un stub, les cron jobs ne sont pas planifies, et des '
    'vulnerabilites de securite existent. Le score global attribue est de <b>62/100</b>, refletant '
    'un MVP solide mais necessitant des corrections importantes avant une mise en production a grande '
    'echelle. La valeur marchande estimee se situe entre 15 et 25 millions de FCFA.', sBody))

story.append(Spacer(1, 6*mm))
story.extend(score_table('62', 'NOTE GLOBALE SUR 100'))

# Score breakdown
score_data = [
    ['Fonctionnalites', '14 / 20', '70%'],
    ['Architecture technique', '13 / 20', '65%'],
    ['Securite', '8 / 20', '40%'],
    ['UX / Design', '14 / 20', '70%'],
    ['Facturation', '13 / 20', '65%'],
]
st = Table(score_data, colWidths=[CONTENT_W*0.40, CONTENT_W*0.30, CONTENT_W*0.30])
st.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
]))
story.append(st)
story.append(Spacer(1, 8*mm))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 2: AUDIT FONCTIONNALITE PAR FONCTIONNALITE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('2. Audit fonctionnalite par fonctionnalite', sH1, 0))

# 2.1 Auth
story.append(heading('2.1 Systeme d\'authentification (8/10)', sH2, 1))
story.append(Paragraph(
    'Le systeme d\'authentification repose sur Supabase Auth avec email et mot de passe. '
    'L\'inscription collecte le nom d\'entreprise, le telephone et l\'email, puis cree un profil '
    'automatiquement via un trigger PostgreSQL. La verification email est implementee avec '
    'une page dediee et un bouton de renvoi. La connexion utilise les cookies SSR avec un '
    'middleware qui protege les routes du dashboard. Un mecanisme de timeout a 4 secondes '
    'prevent les erreurs 504 sur Vercel Edge. Un endpoint auto-confirm existe pour le '
    'developpement. Points forts : sessions securisees, middleware robuste, redirection '
    'automatique. Points faibles : pas d\'authentification 2FA, pas de connexion OAuth '
    '(Google, Facebook), l\'endpoint auto-confirm n\'a aucune securite.', sBody))

# 2.2 Booking
story.append(heading('2.2 Systeme de reservation (8/10)', sH2, 1))
story.append(Paragraph(
    'Le systeme de reservation est l\'une des fonctionnalites les plus abouties. Il comprend '
    'un moteur de disponibilite qui genere des creneaux de 15 minutes en tenant compte '
    'des horaires hebdomadaires, des slots bloques et des rendez-vous existants. La prevention '
    'des chevauchements est double : contrainte GiST en base de donnees et verification '
    'application avant creation. Le flux public en 4 etapes (service, date, infos client, '
    'confirmation) est fluide et bien anime avec Framer Motion. La page publique par '
    'slug affiche une carte de visite professionnelle avec services, liens sociaux et '
    'modes de paiement. Points forts : engine de dispo solide, anti-double-booking, '
    'deduplication clients. Points faibles : pas de pagination sur les rendez-vous, '
    'pas de sync calendrier externe.', sBody))

# 2.3 Dashboard
story.append(heading('2.3 Dashboard de gestion (7/10)', sH2, 1))
story.append(Paragraph(
    'Le dashboard offre une interface complete avec sidebar repliable sur desktop et '
    'navigation inferieure sur mobile. La page d\'accueil affiche des statistiques (RDV du jour, '
    'de la semaine, nombre de clients et services) et les prochains rendez-vous. La gestion '
    'des services supporte le CRUD complet avec upload d\'images et toggle actif/inactif. '
    'Les rendez-vous peuvent etre filtres par statut (5 statuts) et mis a jour. La gestion '
    'des clients inclut la recherche et la deduplication par nom+telephone. Les'
    'disponibilites sont editees jour par jour avec des blocages de dates. Points forts : '
    'interface riche, animations fluides, mobile-first, plan gating integre. Points faibles : '
    'pas d\'export de donnees, pas de vue calendrier, les stats sont basiques.', sBody))

# 2.4 Billing
story.append(heading('2.5 Systeme de facturation (7/10)', sH2, 1))
story.append(Paragraph(
    'Le systeme de facturation comporte 3 plans (Starter 3 000 FCFA, Pro 10 000 FCFA, '
    'Business 25 000 FCFA/mois) avec facturation mensuelle ou annuelle (-17%). Deux '
    'providers de paiement sont integres : Chariow (paiement en ligne) et Mobile Money '
    'manuel (Orange Money, MTN MoMo). Les limites par plan sont stockees en base et '
    'verifiees coté serveur via un utilitaire plan-gate avec bypass admin. Le dashboard '
    'de facturation affiche les metres d\'utilisation, l\'historique des paiements et les '
    'alertes de consommation. Les webhooks Chariow gerent automatiquement l\'activation '
    'et l\'annulation des abonnements. Points forts : architecture billing solide, '
    'double methode de paiement, gating serveur. Points faibles : webhook Chariow sans '
    'verification de signature, pas de periode d\'essai automatique apres inscription.', sBody))

# 2.5 Notifications
story.append(heading('2.5 Systeme de notifications (2/10)', sH2, 1))
story.append(Paragraph(
    'C\'est le point le plus faible du produit. Les 4 providers de notification (Email, '
    'SMS, WhatsApp, Voix) sont des stubs qui ne font que logger dans la console. Le cron '
    'job de rappels cree des enregistrements en base mais n\'appelle jamais le ReminderService. '
    'Aucun cron n\'est configure dans vercel.json (tableau vide). L\'integration ElevenLabs '
    'genere de l\'audio mais sans mecanisme de livraison (pas de Twilio ou equivalent). '
    'En resume : la fonctionnalite de rappels est entierement simulée, zero notification '
    'reelle n\'est envoyée aux clients ou aux professionnels.', sBody))

# 2.6 Admin
story.append(heading('2.6 Panneau d\'administration (7/10)', sH2, 1))
story.append(Paragraph(
    'Le panneau admin offre des metriques plateforme (profils, RDV, revenus, taux de '
    'croissance), la gestion des paiements manuels avec confirmation/rejet, et l\'acces '
    'est restreint via la variable d\'environnement ADMIN_EMAILS. L\'interface est claire '
    'avec des cartes de statistiques et des tableaux de donnees recentes. Le cron d\'expiration '
    'des abonnements est implemente. Points faibles : pas de gestion des utilisateurs, '
    'pas de systeme de feedback, pas de logs d\'activite admin.', sBody))

# Tableau recapitulatif
story.append(Spacer(1, 6*mm))
story.append(heading('Tableau recapitulatif des fonctionnalites', sH3))
story.append(Spacer(1, 4*mm))
story.append(rating_table([
    ['Authentification (login, register, forgot)', 8, 'Operationnel'],
    ['Reservation publique (4 etapes)', 8, 'Operationnel'],
    ['Dashboard gestion (services, RDV, clients)', 7, 'Operationnel'],
    ['Disponibilites et blocages', 7, 'Operationnel'],
    ['Profil public par slug', 8, 'Operationnel'],
    ['Facturation / Plans / Limites', 7, 'Operationnel'],
    ['Paiement Chariow', 6, 'Partiel'],
    ['Paiement Mobile Money', 6, 'Partiel'],
    ['Notifications / Rappels', 2, 'Stub'],
    ['Panneau administration', 7, 'Operationnel'],
    ['PWA installable', 5, 'Operationnel'],
    ['Theming (7 themes)', 6, 'Operationnel'],
    ['Gating par plan', 8, 'Operationnel'],
    ['Upload fichiers', 6, 'Operationnel'],
    ['Page de pricing', 8, 'Operationnel'],
]))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 3: ARCHITECTURE TECHNIQUE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('3. Architecture technique (13/20)', sH1, 0))

story.append(heading('3.1 Stack technique', sH2, 1))
story.append(Paragraph(
    'Le stack est moderne et bien choisi : Next.js 16 (App Router), React 19, TypeScript 5, '
    'Tailwind CSS 4, Supabase (PostgreSQL), Vercel pour le deploiement. Le package manager '
    'est Bun, les composants UI viennent de shadcn/ui (~45 composants), les animations '
    'de Framer Motion, les icones de Lucide React. L\'architecture App Router permet '
    'les Server Components et le streaming. Le PWA est configuré avec manifest et '
    'service worker.', sBody))

story.append(heading('3.2 Base de donnees', sH2, 1))
story.append(Paragraph(
    'Supabase PostgreSQL avec 13 tables (7 core + 6 subscription). Les RLS (Row Level '
    'Security) sont activees sur toutes les tables. Les contraintes d\'integrite '
    'incluent : contrainte GiST anti-chevauchement, index uniques pour la deduplication '
    'clients, triggers de mise a jour automatique, 6 fonctions RPC (start_trial, '
    'activate_subscription, expire_subscriptions, get_usage_summary, consume_voice_credit, '
    'complete_voice_credit). Cependant, Prisma est configure pour SQLite en local mais '
    'n\'est pas utilise en production, ce qui cree une incoherence.', sBody))

story.append(heading('3.3 Points techniques positifs', sH2, 1))
story.append(bullet('Middleware avec timeout 4s pour eviter les 504 Vercel Edge'))
story.append(bullet('Plan gating serveur avec fallback defaults si la DB n\'est pas encore migree'))
story.append(bullet('Bypass admin complet via ADMIN_EMAILS'))
story.append(bullet('Service role client Supabase pour les endpoints non-authentifies (booking public)'))
story.append(bullet('Validation Zod sur tous les inputs API'))
story.append(bullet('Deduplication clients par nom + telephone'))
story.append(bullet('Structure monorepo propre avec separation API/pages/components/lib'))

story.append(heading('3.4 Problemes techniques', sH2, 1))
story.append(bullet('Dependances inutilisees : next-auth, @mdxeditor/editor, react-markdown, recharts, @dnd-kit, @tanstack/react-query, @tanstack/react-table, zustand, pg, next-intl'))
story.append(bullet('Prisma configure pour SQLite mais jamais utilise en production'))
story.append(bullet('Pas de rate limiting sur aucun endpoint'))
story.append(bullet('Pas de pagination sur les listes API'))
story.append(bullet('Bulk update des disponibilites non-atomique (delete + insert sans transaction)'))
story.append(bullet('Cron jobs definis mais jamais planifies dans vercel.json'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 4: SECURITE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('4. Securite (8/20)', sH1, 0))

story.append(Paragraph(
    'La securite est le domaine le plus critique a corriger. Bien que des mesures solides '
    'existent (RLS, auth checks, plan gating, Zod validation), plusieurs vulnerabilites '
    'graves ont ete identifiees qui doivent etre corrigees avant tout lancement public.', sBody))

story.append(heading('4.1 Vulnerabilites critiques', sH2, 1))
story.append(Paragraph(
    '<b>1. Endpoint auto-confirm sans authentification (CRITIQUE)</b> : L\'endpoint /api/auth/auto-confirm '
    'permet a quiconque de confirmer l\'email de n\'importe quel utilisateur en passant simplement '
    'une adresse email. Aucune verification d\'identite n\'est effectuee. Cela signifie qu\'un '
    'attaquant peut creer un compte avec n\'importe quel email, puis le confirmer sans '
    'acceder a la boite mail.', sBody))
story.append(Paragraph(
    '<b>2. Webhook Chariow sans verification de signature (CRITIQUE)</b> : La fonction verifyWebhook() '
    'retourne toujours true. Un attaquant peut simuler des webhooks Chariow pour activer '
    'des abonnements gratuitement. Cela compromet tout le systeme de facturation.', sBody))
story.append(Paragraph(
    '<b>3. Pas de rate limiting (HAUT)</b> : Les endpoints de booking public, d\'inscription et de '
    'connexion sont vulnerables aux attaques par force brute et aux abus. Un bot peut '
    'creer des milliers de rendez-vous ou de comptes.', sBody))

story.append(heading('4.2 Mesures en place', sH2, 1))
story.append(bullet('RLS activees sur toutes les 13 tables avec politiques granulaires'))
story.append(bullet('Verification authentification sur chaque endpoint protege'))
story.append(bullet('Verification d\'appartenance (ownership check) sur toutes les operations CRUD'))
story.append(bullet('Validation Zod des inputs sur tous les endpoints'))
story.append(bullet('Cron endpoints proteges par CRON_SECRET header'))
story.append(bullet('Upload de fichiers : whitelist de buckets, limite 5MB, types autorises'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 5: UX / DESIGN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('5. UX / Design (14/20)', sH1, 0))

story.append(Paragraph(
    'L\'interface utilisateur est bien construite avec une approche mobile-first. Le design systeme '
    'utilise shadcn/ui (composants Radix) avec une palette emerald/green coherente. Les animations '
    'Framer Motion apportent du dynamisme (transitions de pages, indicateurs de sidebar, '
    'etats de chargement). La sidebar desktop est repliable, la navigation mobile est en barre '
    'inferieure fixe. Sept themes sont disponibles (default, dark, emerald, ocean, sunset, '
    'rose, midnight) avec des variables CSS completes. Le mode sombre est supporte via '
    'next-themes. Tous les textes sont en francais (locale fr_CM) avec formatage des dates '
    'et de la monnaie (FCFA) adaptes au marche africain.', sBody))

story.append(heading('5.1 Points forts', sH2, 1))
story.append(bullet('Mobile-first avec bottom nav et responsive breakpoints'))
story.append(bullet('Animations fluides (page transitions, form animations, loading states)'))
story.append(bullet('7 themes avec variables CSS completes et dark mode'))
story.append(bullet('Skeletons de chargement sur toutes les pages'))
story.append(bullet('Toasts Sonner pour les feedbacks utilisateur'))
story.append(bullet('Banniere d\'abonnement expire dans le dashboard'))

story.append(heading('5.2 Points a ameliorer', sH2, 1))
story.append(bullet('Pas de vue calendrier (seulement liste de RDV)'))
story.append(bullet('Pas d\'export de donnees (CSV, PDF)'))
story.append(bullet('Liens CGU et politique de confidentialite non fonctionnels'))
story.append(bullet('Pas de systeme d\'onboarding guide pour les nouveaux utilisateurs'))
story.append(bullet('Image next/image non utilisee partout (service images en raw img)'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 6: ANALYSE DES COUTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('6. Analyse des couts avant les premiers utilisateurs', sH1, 0))

story.append(Paragraph(
    'Voici l\'analyse detaillee de tous les couts engages avant d\'acquerir le premier utilisateur '
    'payant, en tenant compte des couts de developpement, d\'infrastructure et operationnels.', sBody))

story.append(heading('6.1 Couts de developpement (investissement initial)', sH2, 1))
costs_dev = [
    ['Poste', 'Cout estime (FCFA)', 'Duree'],
    ['Developpement frontend (19 pages)', '4 000 000 - 6 000 000', '4-6 semaines'],
    ['Developpement backend (22 API routes)', '3 000 000 - 5 000 000', '3-5 semaines'],
    ['Systeme de facturation (Chariow + Mobile Money)', '1 500 000 - 2 500 000', '2-3 semaines'],
    ['UX/UI Design + Themes', '800 000 - 1 500 000', '1-2 semaines'],
    ['Tests et correction de bugs', '500 000 - 1 000 000', '1 semaine'],
    ['TOTAL DEVELOPPEMENT', '9 800 000 - 16 000 000', '11-17 semaines'],
]
td = Table(costs_dev, colWidths=[CONTENT_W*0.40, CONTENT_W*0.35, CONTENT_W*0.25])
td.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('BACKGROUND', (0,-1), (-1,-1), CARD_BG),
    ('FONTNAME', (0,-1), (-1,-1), 'NotoSerifSC-Bold'),
]))
story.append(td)
story.append(Spacer(1, 6*mm))

story.append(heading('6.2 Couts mensuels d\'infrastructure', sH2, 1))
costs_infra = [
    ['Service', 'Forfait', 'Cout mensuel (FCFA)', 'Cout annuel (FCFA)'],
    ['Vercel (Hobby)', 'Gratuit (puis Pro $20/mois)', '0 - 12 000', '0 - 144 000'],
    ['Supabase (Free)', '500 MB DB, 50K MAU', '0', '0'],
    ['Supabase (Pro)', '8 GB DB, 100K MAU', '25 000 ($25)', '300 000'],
    ['Domaine (.cm)', 'Nom de domaine', '2 500', '30 000'],
    ['Chariow', 'Commission sur transactions', 'Variable', 'Variable'],
    ['ElevenLabs (voix)', 'Pay-per-use', 'Variable', 'Variable'],
]
ti = Table(costs_infra, colWidths=[CONTENT_W*0.25, CONTENT_W*0.30, CONTENT_W*0.25, CONTENT_W*0.20])
ti.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 5),
]))
story.append(ti)
story.append(Spacer(1, 6*mm))

story.append(heading('6.3 Resume financier', sH2, 1))
story.append(Paragraph(
    '<b>Cout total avant le premier utilisateur payant : 9,8 a 16 millions FCFA</b> (investissement '
    'initial de developpement). Les couts mensuels operationnels sont de <b>0 a 37 500 FCFA/mois</b> '
    '(en restant sur les forfaits gratuits) ou <b>25 000 a 37 500 FCFA/mois</b> avec Supabase Pro. '
    'Avec 10 abonnements Pro a 10 000 FCFA/mois, le revenu mensuel serait de 100 000 FCFA, '
    'couvrant largement les couts operationnels. Le seuil de rentabilite est atteint avec '
    'environ 3-4 abonnements Pro ou 2 abonnements Business par mois.', sBody))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 7: VALEUR MARCHANDE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('7. Valeur marchande estimee', sH1, 0))

story.append(Paragraph(
    'L\'estimation de la valeur marchande se base sur plusieurs methodes : le cout de '
    'reproduction (combien couterait de recreer l\'application), la valeur des actifs '
    'techniques (code, architecture, composants reutilisables), et le potentiel de '
    'revenus sur le marche cible (professionnels africains francophones).', sBody))

val_data = [
    ['Critere', 'Estimation (FCFA)', 'Justification'],
    ['Cout de reproduction', '10 000 000 - 16 000 000', 'Based on 11-17 semaines de dev senior'],
    ['Valeur du code source', '8 000 000 - 12 000 000', '19 pages, 22 API, 13 tables, billing complet'],
    ['Valeur du design systeme', '1 000 000 - 2 000 000', '7 themes, 45+ composants, mobile-first'],
    ['Potentiel de marche (3 ans)', '5 000 000 - 15 000 000', 'Marche africain en croissance'],
    ['Fourchette basse', '15 000 000', 'Scenario pessimiste'],
    ['Fourchette haute', '25 000 000', 'Scenario optimiste avec traction'],
]
vt = Table(val_data, colWidths=[CONTENT_W*0.30, CONTENT_W*0.30, CONTENT_W*0.40])
vt.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (1,0), (1,-1), 'RIGHT'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('BACKGROUND', (0,-2), (-1,-1), CARD_BG),
    ('FONTNAME', (0,-2), (-1,-2), 'NotoSerifSC-Bold'),
    ('BACKGROUND', (0,-1), (-1,-1), CARD_BG),
    ('FONTNAME', (0,-1), (-1,-1), 'NotoSerifSC-Bold'),
]))
story.append(vt)
story.append(Spacer(1, 6*mm))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 8: PROPOSITIONS D'AMELIORATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('8. Propositions d\'amelioration pour battre la concurrence', sH1, 0))

story.append(heading('8.1 Corrections critiques (a faire immediatement)', sH2, 1))
story.append(Paragraph(
    '<b>Priorite 1 - Securiser l\'endpoint auto-confirm</b> : Ajouter une verification que seul un '
    'utilisateur authentifie avec le role admin peut appeler cet endpoint, ou mieux, '
    'le supprimer et utiliser l\'API Admin de Supabase avec le service role key de maniere '
    'securisee. Cette vulnerabilite permet a quiconque de creer des comptes verifies.', sBody))
story.append(Paragraph(
    '<b>Priorite 2 - Implementer la verification de signature webhook Chariow</b> : Utiliser '
    'le secret CHARIOW_WEBHOOK_SECRET pour verifier le HMAC-SHA256 de chaque webhook entrant. '
    'Sans cela, le systeme de facturation entier peut etre contourne.', sBody))
story.append(Paragraph(
    '<b>Priorite 3 - Ajouter le rate limiting</b> : Implementer un rate limiter sur les endpoints '
    'publics (booking, register, login) avec une librairie comme upstash/ratelimit ou un '
    'middleware Vercel. Limiter a 10 requetes/minute pour les endpoints sensibles.', sBody))

story.append(heading('8.2 Fonctionnalites pour battre la concurrence', sH2, 1))
story.append(Paragraph(
    '<b>1. Notifications reelles (impact maximum)</b> : Integrer Brevo (ex-Sendinblue) pour les emails, '
    'Twilio ou Africa\'s Talking pour les SMS et la voix. C\'est la fonctionnalite la plus '
    'attendue par les utilisateurs et celle qui differencie le plus. Les concurrents '
    'comme Calendly et Doodle ont des rappels fonctionnels. L\'absence de rappels reels '
    'est un bloqueur d\'adoption majeur. Cout estime : 500 000 - 1 000 000 FCFA.', sBody))
story.append(Paragraph(
    '<b>2. Synchronisation calendrier (Google Calendar, Outlook)</b> : Permettre aux '
    'professionnels de synchroniser leurs rendez-vous avec leur calendrier principal. '
    'C\'est une fonctionnalite attendue par tous les professionnels qui utilisent deja un '
    'calendrier. Utiliser l\'API Google Calendar et l\'API Microsoft Graph. Les concurrents '
    'comme Calendly et Square Appointments offrent cette fonctionnalite.', sBody))
story.append(Paragraph(
    '<b>3. Application mobile native</b> : Le PWA est un bon debut, mais une application mobile '
    'native (React Native ou Flutter) avec notifications push natives et raccourcis '
    'serait un avantage competitif majeur sur le marche africain ou les utilisateurs sont '
    'majoritairement sur mobile. Les notifications push natives sont plus fiables que les '
    'notifications web push.', sBody))
story.append(Paragraph(
    '<b>4. Systeme d\'avis et recommandations</b> : Permettre aux clients de laisser des avis '
    'apres un rendez-vous. Afficher une note moyenne sur la page publique du professionnel. '
    'Cela cree de la confiance et ameliore le SEO. Aucun concurrent local ne le fait.', sBody))
story.append(Paragraph(
    '<b>5. Gestion d\'equipe multi-professionnel</b> : La limite max_employees existe mais la '
    'fonctionnalite n\'est pas implementee. Permettre a un profil Pro (3 professionnels) '
    'ou Business (10 professionnels) d\'ajouter des collaborateurs avec leur propre '
    'calendrier. C\'est essentiel pour les salons, les cliniques et les restaurants.', sBody))
story.append(Paragraph(
    '<b>6. Analytics avances et rapports</b> : Ajouter des graphiques de tendances (RDV par '
    'semaine, mois, revenus), des taux de completion, de no-show, et des rapports '
    'exportables. Utiliser Recharts (deja en dependances). Cela justifie le plan Business.', sBody))
story.append(Paragraph(
    '<b>7. Modeles de rendez-vous recurrents</b> : Permettre aux clients de reserver le meme creneau '
    'chaque semaine ou chaque mois (ex : cours de sport le mardi a 18h). C\'est une '
    'fonctionnalite tres demandee pour les cours, les seances de suivi et les rendez-vous '
    'medicaux reguliers.', sBody))

story.append(heading('8.3 Ameliorations techniques', sH2, 1))
story.append(bullet('Supprimer les 10+ dependances inutilisees (next-auth, recharts, zustand, etc.) pour reduire la taille du bundle'))
story.append(bullet('Corriger l\'incoherence Prisma (SQLite en local, Supabase en prod) - choisir un seul ORM'))
story.append(bullet('Ajouter la pagination sur toutes les listes API (RDV, clients, services)'))
story.append(bullet('Rendre la mise a jour des disponibilites atomique avec une transaction PostgreSQL'))
story.append(bullet('Configurer les cron jobs dans vercel.json pour les rappels et l\'expiration'))
story.append(bullet('Ajouter l\'internationalisation (next-intl est deja en dependances) pour cibler l\'Afrique de l\'Ouest et l\'Afrique de l\'Est'))
story.append(bullet('Implementer les pages CGU et politique de confidentialite (liens actuellement casses)'))
story.append(bullet('Ajouter OAuth (Google, Facebook) pour simplifier l\'inscription'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 9: ANALYSE CONCURRENCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('9. Analyse concurrentielle', sH1, 0))

comp_data = [
    ['Critere', 'Djola TikTak', 'Calendly', 'Doodle', 'Square Appointments'],
    ['Prix local (FCFA)', '3 000 - 25 000', 'Gratuit / $16', 'Gratuit / $7', '$15 - $27'],
    ['Mobile Money', 'Oui (OM, MTN)', 'Non', 'Non', 'Non'],
    ['Rappels IA vocaux', 'En dev (stub)', 'Non', 'Non', 'Non'],
    ['Multi-langue', 'Francais uniquement', 'Multi', 'Multi', 'Multi'],
    ['PWA', 'Oui', 'Non', 'Non', 'Non'],
    ['Page publique', 'Oui (slug)', 'Oui', 'Oui', 'Oui'],
    ['Equipe multi-pro', 'En dev', 'Oui (Team)', 'Non', 'Oui'],
    ['Calendrier sync', 'Non', 'Oui', 'Oui', 'Oui'],
    ['Paiement local', 'Oui (Chariow)', 'Stripe/PayPal', 'Stripe/PayPal', 'Stripe'],
    ['Avantage cle', 'Mobile Money + IA', 'Maturite', 'Simplicite', 'Ecosysteme'],
]
ct = Table(comp_data, colWidths=[CONTENT_W*0.22, CONTENT_W*0.195, CONTENT_W*0.195, CONTENT_W*0.195, CONTENT_W*0.195])
ct.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
    ('FONTSIZE', (0,0), (-1,-1), 8),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 4),
    ('BACKGROUND', (0,1), (1,-1), colors.HexColor('#f0f7f0')),  # highlight Djola column
]))
story.append(ct)
story.append(Spacer(1, 6*mm))
story.append(Paragraph(
    'Le principal avantage competitif de Djola TikTak est l\'integration du Mobile Money '
    '(Orange Money et MTN MoMo), qui est le mode de paiement dominant en Afrique '
    'francophone. Calendly, Doodle et Square ne supportent pas ces methodes de paiement, '
    'ce qui cree une barriere a l\'entree pour les professionnels africains. Le second avantage '
    'est la promesse de rappels vocaux IA (via ElevenLabs), unique sur ce marche. Pour battre '
    'la concurrence, Djola TikTak doit : (1) rendre les notifications operationnelles, '
    '(2) ajouter la synchronisation calendrier, (3) developper l\'application mobile native, '
    'et (4) exploiter son avantage Mobile Money comme argument marketing principal.', sBody))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAPTER 10: CONCLUSION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('10. Conclusion et feuille de route', sH1, 0))

story.append(Paragraph(
    'Djola TikTak est un MVP fonctionnel avec une base technique solide et un positionnement '
    'strategique fort sur le marche africain grace au Mobile Money. Cependant, pour atteindre '
    'la maturite produit necessaire a une adoption a grande echelle, 3 actions sont '
    'indispensables : (1) corriger les 3 vulnerabilites de securite critiques, (2) deployer '
    'un vrai systeme de notifications, et (3) ajouter la synchronisation calendrier. Avec '
    'ces corrections, le produit pourrait atteindre une note de 80/100 et etre pret pour '
    'une commercialisation agressive.', sBody))

roadmap = [
    ['Phase', 'Action', 'Delai', 'Impact'],
    ['Phase 1 (Urgent)', 'Corriger les 3 vuln. securite', '1 semaine', 'Critique'],
    ['Phase 1', 'Deployer rappels email (Brevo)', '1 semaine', 'Eleve'],
    ['Phase 2', 'Rate limiting + pagination API', '1 semaine', 'Moyen'],
    ['Phase 2', 'Sync Google Calendar', '2 semaines', 'Eleve'],
    ['Phase 3', 'Notifications SMS + WhatsApp', '2 semaines', 'Eleve'],
    ['Phase 3', 'App mobile native (React Native)', '6-8 semaines', 'Tres eleve'],
    ['Phase 4', 'Systeme d\'avis clients', '1 semaine', 'Moyen'],
    ['Phase 4', 'Analytics avances + exports', '2 semaines', 'Moyen'],
]
rt = Table(roadmap, colWidths=[CONTENT_W*0.20, CONTENT_W*0.40, CONTENT_W*0.15, CONTENT_W*0.25])
rt.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'NotoSerifSC-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'NotoSansSC'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (2,0), (-1,-1), 'CENTER'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_STRIPE]),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
]))
story.append(Spacer(1, 4*mm))
story.append(rt)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD PDF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT = '/home/z/my-project/download/Djola_TikTak_Audit_Produit.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = TocDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=M_LEFT, rightMargin=M_RIGHT,
    topMargin=M_TOP, bottomMargin=M_BOTTOM,
    title='Audit Produit - Djola TikTak',
    author='Z.ai',
    subject='Audit complet du produit Djola TikTak',
)

doc.multiBuild(story)
print(f'PDF genere : {OUTPUT}')
