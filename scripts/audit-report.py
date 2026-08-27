#!/usr/bin/env python3
"""Djola TikTak - Audit General du Produit - Rapport PDF"""
import os, sys, hashlib, platform
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm, inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

IS_MAC = platform.system() == 'Darwin'
FD = os.path.expanduser('~/.openclaw/workspace/fonts') if IS_MAC else '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NSC', f'{FD}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NSCB', f'{FD}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FS', f'{FD}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FSB', f'{FD}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FSI', f'{FD}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FSBI', f'{FD}/truetype/freefont/FreeSerifBoldItalic.ttf'))
registerFontFamily('NSC', normal='NSC', bold='NSCB')
registerFontFamily('FS', normal='FS', bold='FSB', italic='FSI', boldItalic='FSBI')

PAGE_BG=colors.HexColor('#f1f1f0');SECTION_BG=colors.HexColor('#efeeed');CARD_BG=colors.HexColor('#f0efec')
TABLE_STRIPE=colors.HexColor('#ecebe9');HEADER_FILL=colors.HexColor('#756c53');COVER_BLOCK=colors.HexColor('#817963')
BORDER_C=colors.HexColor('#cbc7be');ICON_C=colors.HexColor('#716541');ACCENT=colors.HexColor('#897129')
ACCENT2=colors.HexColor('#6042bb');TEXT_P=colors.HexColor('#22221f');TEXT_M=colors.HexColor('#79766f')
SEM_OK=colors.HexColor('#3c8b56');SEM_WARN=colors.HexColor('#997c42');SEM_ERR=colors.HexColor('#ac4b43')

PW,PH=A4;LM=60;RM=50;TM=60;BM=60;CW=PW-LM-RM

class TocDoc(SimpleDocTemplate):
    def afterFlowable(self,f):
        if hasattr(f,'bn'):
            self.notify('TOCEntry',(getattr(f,'bl',0),getattr(f,'bt',''),self.page,getattr(f,'bk','')))

h1=ParagraphStyle('h1',fontName='NSCB',fontSize=18,leading=26,textColor=TEXT_P,spaceAfter=10,spaceBefore=20)
h2=ParagraphStyle('h2',fontName='NSCB',fontSize=14,leading=20,textColor=HEADER_FILL,spaceAfter=8,spaceBefore=14)
bd=ParagraphStyle('bd',fontName='NSC',fontSize=10.5,leading=18,textColor=TEXT_P,alignment=TA_LEFT,spaceAfter=6)
bl=ParagraphStyle('bl',fontName='NSC',fontSize=10.5,leading=18,textColor=TEXT_P,leftIndent=24,bulletIndent=10,spaceAfter=4)
tc=ParagraphStyle('tc',fontName='NSC',fontSize=9.5,leading=14,textColor=TEXT_P)
tcb=ParagraphStyle('tcb',fontName='NSCB',fontSize=9.5,leading=14,textColor=TEXT_P)
th=ParagraphStyle('th',fontName='NSCB',fontSize=9.5,leading=14,textColor=colors.white)
tl0=ParagraphStyle('tl0',fontName='NSCB',fontSize=12,leading=20,leftIndent=0,textColor=TEXT_P)
tl1=ParagraphStyle('tl1',fontName='NSC',fontSize=10.5,leading=18,leftIndent=20,textColor=TEXT_M)

def hdg(t,s,l=0):
    k=f'h_{hashlib.md5(t.encode()).hexdigest()[:8]}'
    p=Paragraph(f'<a name="{k}"/>{t}',s)
    p.bn=k;p.bl=l;p.bt=t;p.bk=k
    return p

def sc(v):
    c=SEM_OK if v>=70 else(SEM_WARN if v>=50 else SEM_ERR)
    return Paragraph(f'<b>{v}/100</b>',ParagraphStyle('s',fontName='NSCB',fontSize=10,leading=14,textColor=c,alignment=TA_CENTER))

def vd(v):
    if v>=80:t,c='Excellent',SEM_OK
    elif v>=65:t,c='Bon',SEM_OK
    elif v>=50:t,c='Moyen',SEM_WARN
    elif v>=35:t,c='Faible',SEM_ERR
    else:t,c='Critique',SEM_ERR
    return Paragraph(t,ParagraphStyle('v',fontName='NSC',fontSize=9,leading=13,textColor=c,alignment=TA_CENTER))

def bld(hdrs,rows,cw=None):
    h=[Paragraph(x,th) for x in hdrs]
    d=[h]+[[Paragraph(str(c),tc) if not isinstance(c,Paragraph) else c for c in r] for r in rows]
    if not cw:cw=[CW/len(hdrs)]*len(hdrs)
    t=Table(d,colWidths=cw,repeatRows=1)
    st=[('BACKGROUND',(0,0),(-1,0),HEADER_FILL),('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('GRID',(0,0),(-1,-1),0.5,BORDER_C),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6)]
    for i in range(2,len(d),2):st.append(('BACKGROUND',(0,i),(-1,i),TABLE_STRIPE))
    t.setStyle(TableStyle(st))
    return t

def bul(t):return Paragraph(f'\u2022 {t}',bl)

def pagef(c,d):
    c.saveState();c.setFont('NSC',8);c.setFillColor(TEXT_M)
    c.drawRightString(PW-RM,BM-15,str(d.page))
    c.drawString(LM,BM-15,'Djola TikTak - Audit Produit')
    c.restoreState()

OUT='/home/z/my-project/download/Djola_TikTak_Audit_Produit.pdf'
os.makedirs(os.path.dirname(OUT),exist_ok=True)

doc=TocDoc(OUT,pagesize=A4,leftMargin=LM,rightMargin=RM,topMargin=TM,bottomMargin=BM,
    title='Audit General - Djola TikTak',author='Z.ai',subject='Audit technique et commercial Djola TikTak')

st=[]

# TOC
toc=TableOfContents();toc.levelStyles=[tl0,tl1]
st.append(Paragraph('Table des matieres',h1));st.append(toc);st.append(PageBreak())

# CH1 SYNTHESIS
st.append(hdg('1. Synthese executive',h1,0))
st.append(Paragraph(
'Djola TikTak est une application SaaS de prise de rendez-vous destinee aux professionnels et petits commerces en Afrique Centrale, '
'principalement au Cameroun. La plateforme permet aux coiffeurs, restaurateurs, consultants et autres artisans de gerer leurs '
'reservations en ligne via une interface mobile-first progressive web app (PWA). Ce rapport presente un audit complet et detaille '
'du produit, fonctionnalite par fonctionnalite, avec une note sur 100 pour chaque module, une estimation de la valeur marchande, '
'une analyse des couts avant les premiers utilisateurs, et des propositions d amelioration pour surpasser la concurrence.',bd))
st.append(Spacer(1,12))
st.append(hdg('1.1 Note globale',h2,1))
st.append(Paragraph(
'Apres analyse de l ensemble du codebase (42 composants, 28 endpoints API, 17 routes, 18 fichiers lib), '
'la note globale est de <b>58/100</b>. Le produit est viable en MVP mais souffre de faiblesses critiques : '
'rappels non fonctionnels, absence de tests, securite a renforcer, et fonctionnalites placeholder.',bd))

scores=[
    ("Authentification",72),("Gestion des Services",75),("Gestion des Clients",68),
    ("Rendez-vous Dashboard",78),("Disponibilites",82),("Reservation Publique",80),
    ("Facturation",65),("Paiements",60),("Rappels",25),("Administration",70),
    ("PWA Mobile",72),("Securite",45),("Performance",62),("UI/UX",68),("Qualite Code",55),
]
sr=[[Paragraph(n,tc),sc(s),vd(s)] for n,s in scores]
st.append(Spacer(1,10))
st.append(bld(['Module','Note','Verdict'],sr,[CW*0.50,CW*0.25,CW*0.25]))
st.append(Spacer(1,18))

# CH2 DETAILED AUDIT
st.append(hdg('2. Audit fonctionnel detaille',h1,0))

sections2=[
("2.1 Authentification",72,
"Le systeme repose sur Supabase Auth, choix solide. Le middleware utilise Promise.race avec timeout 4s contre les 504 Vercel Edge. "
"L inscription cree directement le profil professionnel. Verification email, mot de passe oublie et auto-confirmation admin presents. "
"Cependant, pas de 2FA, pas de OAuth actif (callback existe mais non configure), getSession au lieu de getUser dans le middleware "
"(moins securise en cas de token revoke), et pas de rate limiting sur les tentatives de connexion.",
"Supabase Auth fiable, middleware timeout anti-504, verification email, auto-confirm admin",
"Pas de 2FA, pas de OAuth actif, getSession vs getUser, pas de rate limiting"),

("2.2 Gestion des Services",75,
"Module CRUD complet avec validation Zod, upload d images via Supabase Storage, drag-and-drop (dnd-kit). "
"612 lignes de code, chaque service a nom, description, prix FCFA, duree (5min-8h), statut, image. "
"Gate de plan integre avec compteur visuel (3/5). Architecture solide mais fichier monolithique a decomposer.",
"CRUD complet, DnD, upload image, Zod, plan-gate, compteur visuel",
"Pas de categories, pas de variantes, fichier monolithique 612 lignes"),

("2.3 Gestion des Clients",68,
"CRUD complet avec recherche ILIKE multi-champs (nom, telephone, email). Deduplication par nom+telephone : "
"si un client existe, ses infos sont mises a jour plutot que creees en doublon. Gate de plan a 200 clients (Starter). "
"Manque historique RDV par client, tags, export CSV, et la suppression est definitive (pas de soft-delete).",
"Recherche multi-champs, deduplication, plan-gate, soft-update",
"Pas d historique RDV, pas de tags, suppression definitive, pas d export"),

("2.4 Rendez-vous (Dashboard)",78,
"Coeur fonctionnel. Verification anti-chevauchement, calcul auto de ends_at, jointures service+client. "
"Filtres par statut (pending/confirmed/cancelled/completed/no_show) et plage de dates. "
"Gate plan : 50/jour (Starter), 100 (Pro), illimite (Business). Vue calendrier. "
"Manque recurrence, waiting list, timezone par RDV, et notes internes.",
"Anti-chevauchement, filtres, plan-gate, vue calendrier",
"Pas de recurrence, pas de waiting list, pas de timezone par RDV"),

("2.5 Disponibilites",82,
"Meilleur module technique. Algorithme propre : filtre regles hebdo, soustrait bloques et RDV, genere slots "
"a intervalle 15min. Exclusion des slots passes. Toggle par jour, blocked_slots, noms FR. "
"Defaut : timezone non gere dans le moteur (dates en UTC), pas de buffer entre RDV.",
"Algorithme propre, slots 15min, blocked_slots, journees toggle, FR",
"Timezone non gere, pas de buffer, pas de multi-professionnel"),

("2.6 Reservation Publique",80,
"Fichier le plus volumineux (1138 lignes). Flow 5 etapes avec Framer Motion : service, date, horaire, "
"coordonnees, confirmation + paiement conditionnel (Orange Money/MTN). URL /[slug]/booking personnalisee. "
"Webhook Chariow securise avec deduplication et gestion sale.completed/sale.refunded.",
"Flow 5 etapes, animations, paiement conditionnel, webhook robuste",
"Fichier monolithique 1138 lignes, pas de confirmation email/SMS"),

("2.7 Facturation",65,
"Architecture multi-couches avec pattern provider. 3 plans (3000/10000/25000 FCFA). Plan-gate server-side "
"avec bypass admin. Metres visuels, badges de statut, historique paiements. RLS sur tables SQL. "
"Manque : trial auto a l inscription, prorata, facture PDF, page confirmation annulation.",
"Architecture propre, 3 plans calibres, plan-gate, RLS",
"Pas de trial auto, pas de prorata, pas de facture PDF"),

("2.8 Paiements",60,
"3 methodes : Chariow (automatique), Orange Money et MTN MoMo (manuel). Webhook Chariow securise avec "
"verification signature, deduplication, webhook_events table. Flux manuel : affichage coordonnees + "
"confirmation admin. Defaut : pas de verification auto des paiements manuels (APIs Orange/MTN non integrees).",
"Webhook Chariow securise, deduplication, 3 methodes",
"Flux manuel non automatise, pas de reconciliation auto"),

("2.9 Rappels et Notifications",25,
"MODULE LE PLUS FAIBLE. Architecture provider bien pensee (4 canaux : email, SMS, WhatsApp, voix) mais "
"100% non fonctionnel. Provider email = placeholder (console.log). SMS/WhatsApp/Voix commentes. "
"Cron endpoint existe mais marque les rappels comme envoyes sans envoi reel. "
"Pour un produit de prise de RDV, c est un bloqueur majeur qui nuit a la valeur percue.",
"Architecture provider bien pensee, cron protege",
"100% non fonctionnel, zero rappel reel, providers placeholders"),

("2.10 Administration",70,
"Dashboard admin avec metriques, graphiques Recharts, liste utilisateurs avec statut abonnement. "
"Gestion paiements manuels (confirmer/rejeter). Acces via ADMIN_EMAILS. "
"Manque : logs d activite, gestion utilisateurs, export donnees, support client integre.",
"Metriques, graphiques, confirmation paiements",
"Pas de logs, pas de gestion utilisateurs, pas d export"),

("2.11 PWA Mobile",72,
"PWA avec manifest.json (icones 192/512/1024px, standalone, raccourcis). Service worker hybride : "
"cache-first assets, network-first pages. PWAInstallPrompt, meta Apple presentes. "
"Manque : pre-caching shell pages, page offline fallback, background sync.",
"Manifest complet, SW hybride, install prompt, meta Apple",
"Pas de pre-cache, pas de page offline, pas de background sync"),

("2.12 Themes (7 themes)",76,
"7 themes (default, dark, emerald, ocean, sunset, rose, midnight) en CSS oklch avec next-themes. "
"ThemeToggle popover. Differenciateur notable vs concurrents (light/dark seulement). "
"Implementation propre avec contrastes corrects. Manque couleur personnalisee.",
"7 themes, oklch moderne, persistance, differenciateur",
"Pas de couleur personnalisee"),
]

for title,score,text,strengths,weaknesses in sections2:
    st.append(Spacer(1,12))
    st.append(hdg(title,h2,1))
    st.append(Paragraph(text,bd))
    st.append(bul(f'Forces : {strengths}'))
    st.append(bul(f'Faiblesses : {weaknesses}'))
    st.append(bul(f'Note : <b>{score}/100</b>'))

# CH3 SECURITY
st.append(Spacer(1,18))
st.append(hdg('3. Audit de Securite',h1,0))
st.append(Paragraph(
"La securite est le point le plus preoccupant. Plusieurs vulnerabilites necessitent une attention immediate avant tout "
"deploiement en production. L analyse couvre authentification, autorisation, protection donnees et infrastructure.",bd))

st.append(hdg('3.1 Vulnerabilites',h2,1))
vsr=[
[Paragraph('Injection SQL via recherche',tc),Paragraph('/api/clients',tc),Paragraph('Critique',ParagraphStyle('x',fontName='NSC',fontSize=9,leading=13,textColor=SEM_ERR,alignment=TA_CENTER)),Paragraph('ILIKE accepte wildcards non echappes dans le parametre search',tc)],
[Paragraph('Pas de rate limiting',tc),Paragraph('Toutes routes API',tc),Paragraph('Critique',ParagraphStyle('x2',fontName='NSC',fontSize=9,leading=13,textColor=SEM_ERR,alignment=TA_CENTER)),Paragraph('Brute force possible sur login et creation de comptes',tc)],
[Paragraph('Cron secret faible',tc),Paragraph('/api/cron/*',tc),Paragraph('Moyen',ParagraphStyle('x3',fontName='NSC',fontSize=9,leading=13,textColor=SEM_WARN,alignment=TA_CENTER)),Paragraph('Comparaison en clair, pas de rotation, pas de HMAC',tc)],
[Paragraph('CORS non restreint',tc),Paragraph('next.config.ts',tc),Paragraph('Moyen',ParagraphStyle('x4',fontName='NSC',fontSize=9,leading=13,textColor=SEM_WARN,alignment=TA_CENTER)),Paragraph('Pas de configuration CORS explicite dans next.config',tc)],
[Paragraph('Upload sans sanitisation',tc),Paragraph('/api/upload',tc),Paragraph('Moyen',ParagraphStyle('x5',fontName='NSC',fontSize=9,leading=13,textColor=SEM_WARN,alignment=TA_CENTER)),Paragraph('MIME verifie mais pas le contenu (exe renomme en jpg possible)',tc)],
]
st.append(Spacer(1,8))
st.append(bld(['Vulnerabilite','Localisation','Severite','Description'],vsr,[CW*0.22,CW*0.18,CW*0.12,CW*0.48]))

st.append(Spacer(1,12))
st.append(Paragraph(
"En complement, getSession() dans le middleware ne verifie pas le token aupres du serveur Supabase, ce qui peut accepter "
"un token expire. C est compense par getUser() dans chaque endpoint API protege. Note securite : <b>45/100</b>.",bd))

st.append(hdg('3.2 Points positifs',h2,1))
st.append(bul('Politiques RLS actives sur toutes les tables Supabase'))
st.append(bul('Verification de signature webhook Chariow avec rejet 401'))
st.append(bul('Validation Zod sur tous les endpoints de creation'))
st.append(bul('Service-role client isole pour operations administratives'))
st.append(bul('Plan-gate server-side : limites verifiees cote serveur, pas seulement client'))

# CH4 PERFORMANCE
st.append(Spacer(1,18))
st.append(hdg('4. Performance et Architecture',h1,0))
st.append(Paragraph(
"La stack Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase est un choix excellent offrant bon equilibre "
"performance, developer experience et cout. Cependant, plusieurs decisions impactent la performance.",bd))

st.append(hdg('4.1 Decisions positives',h2,1))
st.append(bul('Next.js 16 App Router + output standalone : optimise pour Vercel serverless'))
st.append(bul('Supabase backend-as-a-service : elimine serveur dedie, reduit couts'))
st.append(bul('Middleware Promise.race 4s : solution anti-504 Vercel Edge ingenieuse'))
st.append(bul('PWA + service worker : ameliore experience sur reseaux mobiles lents (contexte africain)'))
st.append(bul('Tailwind CSS 4 + Zod : zero CSS mort, validation type-safe'))

st.append(hdg('4.2 Problemes',h2,1))
st.append(Paragraph(
"Fichiers monolithiques : booking (1138 lignes), settings (690), services (612). Code legacy present (Prisma, db.ts) "
"mais non utilise. reactStrictMode desactive, ignoreBuildErrors a true, ESLint permissif. "
"Zero tests (pas de Jest/Vitest). Landing page en client-side alors que c est du statique (SEO impacte). "
"Note performance : <b>62/100</b>.",bd))

# CH5 CODE QUALITY
st.append(Spacer(1,18))
st.append(hdg('5. Qualite du Code',h1,0))
st.append(Paragraph(
"La qualite est correcte pour un demarrage mais presente des incoherences pour la mise a l echelle. "
"TypeScript est utilise partout avec types dans types/database.ts, mais des types any subsistent dans les jointures.",bd))

st.append(hdg('5.1 Positifs',h2,1))
st.append(bul('Types definis pour toutes les entites (Profile, Service, Client, Appointment)'))
st.append(bul('Pattern provider paiements (chariow-provider.ts), plan-gate centralise'))
st.append(bul('Schemas Zod complets avec messages en francais'))
st.append(bul('SQL propre : migration RLS, index, fonctions'))

st.append(hdg('5.2 Problemes',h2,1))
st.append(bul('Code legacy non nettoye : Prisma, db.ts, subscription/chariow.ts obsoletes'))
st.append(bul('3 fichiers > 600 lignes (monolithiques)'))
st.append(bul('Types any dans jointures Supabase non strictement definis'))
st.append(bul('Zero tests unitaires ou d integration'))
st.append(bul('ESLint trop permissif, reactStrictMode desactive'))
st.append(bul('Note qualite code : <b>55/100</b>'))

# CH6 MARKET VALUE
st.append(Spacer(1,18))
st.append(hdg('6. Valeur Marchande et Couts',h1,0))

st.append(hdg('6.1 Valeur marchande estimee',h2,1))
st.append(Paragraph(
"L estimation repose sur trois methodes complementaires. Le cout de redeveloppement est base sur 1600-2400h "
"a 5000 FCFA/h pour un dev senior en Afrique Centrale, soit 8-12 millions FCFA. L approche actifs evalue "
"le code, design et base de donnees a 4-6 millions. La moyenne ponderee donne 5-7.5 millions FCFA "
"(environ 8 000 - 12 500 USD).",bd))

vr=[[Paragraph('Cout de redeveloppement',tc),Paragraph('8 000 000 - 12 000 000 FCFA',tc)],
     [Paragraph('Approche par actifs',tc),Paragraph('4 000 000 - 6 000 000 FCFA',tc)],
     [Paragraph('Multiple revenus (1.5x ARR)',tc),Paragraph('3 000 000 - 5 000 000 FCFA',tc)],
     [Paragraph('<b>Valeur estimee (moyenne)</b>',tcb),Paragraph('<b>5 000 000 - 7 500 000 FCFA</b>',ParagraphStyle('ve',fontName='NSCB',fontSize=10,leading=14,textColor=ACCENT,alignment=TA_CENTER))]]
st.append(Spacer(1,8))
st.append(bld(['Methode','Valeur'],vr,[CW*0.55,CW*0.45]))

st.append(Spacer(1,14))
st.append(hdg('6.2 Couts pre-lancement',h2,1))
st.append(Paragraph(
"L architecture choisie permet un lancement a cout quasi nul. Vercel Hobby et Supabase Free couvrent les besoins initiaux. "
"Le seul cout est le nom de domaine (1500-5000 FCFA/an). Les couts augmenteront significativement "
"seulement apres 200-500 utilisateurs actifs, moment ou les revenus depasseront largement les frais.",bd))

cr=[[Paragraph('Vercel (Hobby)',tc),Paragraph('0 FCFA/mois',tc),Paragraph('Gratuit',tc),Paragraph('100GB bande passante',tc)],
     [Paragraph('Supabase (Free)',tc),Paragraph('0 FCFA/mois',tc),Paragraph('Gratuit',tc),Paragraph('500MB BDD, 50K auth/mois',tc)],
     [Paragraph('Nom de domaine',tc),Paragraph('1 500 - 5 000 FCFA/an',tc),Paragraph('Annuel',tc),Paragraph('.cm, .com, .gq',tc)],
     [Paragraph('SMS/WhatsApp (futur)',tc),Paragraph('50 000 - 150 000 FCFA',tc),Paragraph('Variable',tc),Paragraph('Necessaire pour les rappels',tc)],
     [Paragraph('<b>Total pre-lancement</b>',tcb),Paragraph('<b>0 - 5 000 FCFA/mois</b>',ParagraphStyle('tot',fontName='NSCB',fontSize=10,leading=14,textColor=ACCENT,alignment=TA_CENTER)),Paragraph('',tc),Paragraph('Cout quasi nul',tc)]]
st.append(Spacer(1,8))
st.append(bld(['Poste','Cout','Type','Notes'],cr,[CW*0.22,CW*0.24,CW*0.14,CW*0.40]))

st.append(Spacer(1,14))
st.append(hdg('6.3 Projections de revenus',h2,1))
rr=[[Paragraph('Pessimiste',tc),Paragraph('200',tc),Paragraph('5%',tc),Paragraph('10',tc),Paragraph('45 000 FCFA/mois',tc),Paragraph('540 000 FCFA/an',tc)],
     [Paragraph('<b>Realiste</b>',tcb),Paragraph('500',tc),Paragraph('10%',tc),Paragraph('50',tc),Paragraph('<b>350 000 FCFA/mois</b>',ParagraphStyle('rv',fontName='NSCB',fontSize=9.5,leading=14,textColor=ACCENT,alignment=TA_CENTER)),Paragraph('4 200 000 FCFA/an',tc)],
     [Paragraph('Optimiste',tc),Paragraph('1 000',tc),Paragraph('15%',tc),Paragraph('150',tc),Paragraph('1 350 000 FCFA/mois',tc),Paragraph('16 200 000 FCFA/an',tc)]]
st.append(Spacer(1,8))
st.append(bld(['Scenario','Utilisateurs an 1','Conversion','Abonnes','Revenu/mois','Revenu/an'],rr,[CW*0.14,CW*0.16,CW*0.12,CW*0.14,CW*0.22,CW*0.22]))
st.append(Spacer(1,12))
st.append(Paragraph(
"Le scenario realiste projette 4.2M FCFA/an avec 50 abonnes. Le point mort est atteint des les premiers abonnes. "
"Les 3 plans (3000/10000/25000 FCFA) sont bien calibres pour le marche camerounais.",bd))

# CH7 IMPROVEMENTS
st.append(Spacer(1,18))
st.append(hdg('7. Propositions d Amelioration',h1,0))
st.append(Paragraph(
"Pour surpasser les concurrents (Calendly, Doodle, BookMeBus), Djola TikTak doit se differencier sur 3 axes : "
"hyper-localisation africaine, innovation experience client, et robustesse operationnelle.",bd))

st.append(hdg('7.1 Phase 1 - Corrections critiques (0-2 semaines)',h2,1))
st.append(bul('<b>Activer les rappels SMS/WhatsApp</b> : Integrer Twilio Africa ou Africa Talking. Reduction no-show 60-80%. Priorite maximale. Impact direct sur la valeur percue du produit.'))
st.append(bul('<b>Corriger vulnerabilites securite</b> : Echapper ILIKE, ajouter rate limiting (Vercel Edge), renforcer verification webhook. Protection donnees utilisateurs.'))
st.append(bul('<b>Activer trial automatique</b> : 7 jours essai gratuit Pro a l inscription. Standard SaaS manquant. Augmentation taux conversion 200-300%.'))
st.append(bul('<b>Email confirmation reservation</b> : Utiliser Resend ou Supabase Edge Functions. Professionnalisme et confiance client immediats.'))

st.append(hdg('7.2 Phase 2 - Differentiation (2-6 semaines)',h2,1))
st.append(bul('<b>Intégration WhatsApp Business API</b> : Reservation via chatbot WhatsApp. WhatsApp est l app la plus utilisee en Afrique. Aucun concurrent international ne le fait. Impact : acquisition massive.'))
st.append(bul('<b>Paiement mobile automatise</b> : Integrer les APIs Orange Money et MTN MoMo pour verification auto des transactions. Eliminer la dependance admin.'))
st.append(bul('<b>Systeme d avis et notes</b> : Permettre aux clients de laisser des avis apres rendez-vous. Affichage sur la page publique. Social proof essentiel pour les artisans.'))
st.append(bul('<b>Multi-professionnel</b> : Permettre a une boutique d avoir plusieurs professionnels avec calendriers independants. Essentiel pour les salons et cliniques.'))
st
st.append(hdg('7.3 Phase 3 - Croissance (1-3 mois)',h2,1))
st.append(bul('<b>Programme de parrainage</b> : Un professionnel parraine un autre, les deux gagnent 1 mois gratuit. Croissance virale dans les communautes de métiers.'))
st.append(bul('<b>Tableau de bord analytics avance</b> : Chiffre d affaires par service, taux de no-show, heures les plus demandees, clients recurrents. Aide a la prise de decision business.'))
st.append(bul('<b>Intégration Google Calendar</b> : Synchronisation bidirectionnelle pour les professionnels qui utilisent deja Google Calendar.'))
st.append(bul('<b>Application native</b> : Wrapper React Native ou Capacitor autour de la PWA pour publication sur Google Play Store. La PWA seule limite la decouverte.'))
st.append(bul('<b>SEO local</b> : Pages publiques optimisees pour le referencement local (Google Business Profile, meta donnees structurees). Un coiffeur a Douala doit etre trouvable sur Google.'))

st.append(hdg('7.4 Phase 4 - Avance (3-6 mois)',h2,1))
st.append(bul('<b>IA pour recommandations</b> : Suggérer les meilleurs creneaux selon l historique, predire les no-show, optimiser automatiquement les disponibilités.'))
st.append(bul('<b>Marketplace</b> : Annuaire des professionnels utilisant Djola TikTak, searchable par localisation et metier. Revenu supplementaire via commissions.'))
st.append(bul('<b>API ouverte</b> : Permettre aux developpeurs tiers de creer des integrations (ex : caisse enregistreuse, CRM). Creer un ecosysteme.'))
st.append(bul('<b>Multi-pays</b> : Adapter les prix et les methodes de paiement pour le Senegal, Cote d Ivoire, Congo, Gabon. Chaque pays a ses specificites de paiement mobile.'))

# CH8 CONCLUSION
st.append(Spacer(1,18))
st.append(hdg('8. Conclusion et Feuille de Route',h1,0))
st.append(Paragraph(
"Djola TikTak est un produit avec un potentiel reel sur le marche africain de la prise de rendez-vous. "
"L architecture technique est moderne et bien choisie, le cout de lancement est quasi nul, et le modele economique est viable. "
"Cependant, la note de 58/100 reflète un produit qui necessite un travail significatif avant d etre pret pour une "
"acquisition massive d utilisateurs. Les priorites absolues sont : activer les rappels, corriger les vulnerabilites, "
"et activer le trial automatique. Ces 3 corrections seules feraient monter la note a environ 72/100 et transformeraient "
"le produit d un MVP prometteur en un SaaS credible.",bd))

st.append(Spacer(1,14))
st.append(Paragraph(
"La feuille de route recommandee est : Phase 1 (semaines 1-2) corrections critiques, Phase 2 (semaines 3-8) differentiation "
"concurrentielle, Phase 3 (mois 2-4) croissance et acquisition, Phase 4 (mois 4-8) avance et scale. "
"Avec un investissement concentre de 2-3 mois de developpement, Djola TikTak peut atteindre une note de 80/100 "
"et se positionner comme la reference de la prise de rendez-vous en Afrique Centrale.",bd))

# BUILD
doc.multiBuild(st, onLaterPages=pagef, onFirstPage=pagef)
print(f'PDF genere : {OUT}')
