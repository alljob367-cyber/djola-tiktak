// ============================================================
// Types de business & modèles de services pré-configurés
// Chaque business configure son univers selon son métier.
// ============================================================

import type { LucideIcon } from 'lucide-react';
import {
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  Dumbbell,
  GraduationCap,
  Car,
  ShoppingBag,
  Cpu,
  Hammer,
  Sparkles,
} from 'lucide-react';

export type BusinessType =
  | 'salon'
  | 'restaurant'
  | 'clinic'
  | 'fitness'
  | 'education'
  | 'auto'
  | 'shop'
  | 'saas'
  | 'artisan'
  | 'other';

export interface ServiceTemplate {
  name: string;
  description: string;
  price: number; // en XAF (indicatif, modifiable)
  duration_minutes: number;
  category: string;
}

export interface BusinessTypeConfig {
  key: BusinessType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Vocabulaire du bouton de réservation sur la page publique */
  bookingLabel: string;
  /** Vocabulaire du service (ex : "un service", "une table") */
  serviceNoun: string;
  /** Catégories proposées */
  categories: string[];
  /** Modèles de services pré-configurés (import en 1 clic) */
  templates: ServiceTemplate[];
}

// ── SALON / BEAUTÉ ──────────────────────────────────────────
const salon: BusinessTypeConfig = {
  key: 'salon',
  label: 'Salon & Beauté',
  description: 'Coiffure, barbier, esthétique, onglerie, spa',
  icon: Scissors,
  bookingLabel: 'Prendre rendez-vous',
  serviceNoun: 'un soin',
  categories: ['Coiffure', 'Barbier', 'Coloration', 'Soins & Visage', 'Ongles', 'Forfaits'],
  templates: [
    { name: 'Coupe homme', description: 'Coupe aux ciseaux ou tondeuse, coiffage inclus', price: 2000, duration_minutes: 30, category: 'Coiffure' },
    { name: 'Coupe femme', description: 'Shampooing, coupe et coiffage', price: 5000, duration_minutes: 60, category: 'Coiffure' },
    { name: 'Tonte barbe', description: 'Taille de barbe à la tondeuse, serviette chaude', price: 1500, duration_minutes: 20, category: 'Barbier' },
    { name: 'Barbe premium', description: 'Rasage au coupe-chou, huile et baume', price: 3000, duration_minutes: 30, category: 'Barbier' },
    { name: 'Coloration', description: 'Coloration complète avec soin protecteur', price: 12000, duration_minutes: 120, category: 'Coloration' },
    { name: 'Tissage / Tresses', description: 'Tresses collées ou tissage (pose non fournie)', price: 8000, duration_minutes: 150, category: 'Coiffure' },
    { name: 'Soin visage', description: 'Nettoyage de peau, gommage et masque hydratant', price: 7000, duration_minutes: 45, category: 'Soins & Visage' },
    { name: 'Pose vernis', description: 'Manucure et pose de vernis semi-permanent', price: 4000, duration_minutes: 45, category: 'Ongles' },
    { name: 'Forfait mariée', description: 'Coiffure, maquillage et pose de voile', price: 35000, duration_minutes: 180, category: 'Forfaits' },
  ],
};

// ── RESTAURANT ──────────────────────────────────────────────
const restaurant: BusinessTypeConfig = {
  key: 'restaurant',
  label: 'Restaurant & Bar',
  description: 'Restaurant, maquis, fast-food, traiteur, bar',
  icon: UtensilsCrossed,
  bookingLabel: 'Réserver une table',
  serviceNoun: 'une table',
  categories: ['Réservations', 'Menus & Formules', 'Événements', 'Livraison'],
  templates: [
    { name: 'Table — 2 couverts', description: 'Réservation d\'une table pour 2 personnes', price: 0, duration_minutes: 90, category: 'Réservations' },
    { name: 'Table — 4 couverts', description: 'Réservation d\'une table pour 4 personnes', price: 0, duration_minutes: 90, category: 'Réservations' },
    { name: 'Table — 6 couverts et +', description: 'Grande table, terrasse ou espace famille', price: 0, duration_minutes: 120, category: 'Réservations' },
    { name: 'Petit-déjeuner', description: 'Café, thé, jus et viennoiseries', price: 2500, duration_minutes: 45, category: 'Menus & Formules' },
    { name: 'Formule déjeuner', description: 'Plat du jour, boisson et dessert', price: 4500, duration_minutes: 60, category: 'Menus & Formules' },
    { name: 'Dîner en couple', description: 'Menu deux plats, bougie et table préférée', price: 15000, duration_minutes: 120, category: 'Menus & Formules' },
    { name: 'Anniversaire sur mesure', description: 'Décoration, gâteau et mise en place', price: 25000, duration_minutes: 180, category: 'Événements' },
    { name: 'Commande à emporter', description: 'Préparation de votre commande, retrait au comptoir', price: 0, duration_minutes: 30, category: 'Livraison' },
  ],
};

// ── SANTÉ ───────────────────────────────────────────────────
const clinic: BusinessTypeConfig = {
  key: 'clinic',
  label: 'Santé & Bien-être',
  description: 'Cabinet médical, dentaire, kiné, psychologue, infirmerie',
  icon: Stethoscope,
  bookingLabel: 'Prendre rendez-vous',
  serviceNoun: 'une consultation',
  categories: ['Consultations', 'Soins', 'Suivi & Contrôles', 'Vaccination'],
  templates: [
    { name: 'Consultation générale', description: 'Examen clinique et ordonnance', price: 5000, duration_minutes: 30, category: 'Consultations' },
    { name: 'Consultation spécialiste', description: 'Avis spécialisé avec dossier médical', price: 15000, duration_minutes: 45, category: 'Consultations' },
    { name: 'Détartrage', description: 'Détartrage et polissage dentaire', price: 20000, duration_minutes: 45, category: 'Soins' },
    { name: 'Soins dentaires', description: 'Traitement de carie, composite', price: 25000, duration_minutes: 60, category: 'Soins' },
    { name: 'Séance kinésithérapie', description: 'Rééducation et massage thérapeutique', price: 8000, duration_minutes: 45, category: 'Soins' },
    { name: 'Consultation psychologique', description: 'Entretien confidentiel de 50 minutes', price: 15000, duration_minutes: 50, category: 'Consultations' },
    { name: 'Contrôle de suivi', description: 'Bilan de suivi de traitement', price: 3000, duration_minutes: 20, category: 'Suivi & Contrôles' },
    { name: 'Vaccination', description: 'Injection avec carnet de vaccination', price: 6000, duration_minutes: 15, category: 'Vaccination' },
  ],
};

// ── FITNESS ─────────────────────────────────────────────────
const fitness: BusinessTypeConfig = {
  key: 'fitness',
  label: 'Sport & Fitness',
  description: 'Salle de sport, coach, yoga, danse, arts martiaux',
  icon: Dumbbell,
  bookingLabel: 'Réserver une séance',
  serviceNoun: 'une séance',
  categories: ['Cours collectifs', 'Coaching', 'Évaluations', 'Abonnements'],
  templates: [
    { name: 'Séance découverte', description: 'Première séance d\'essai gratuite', price: 0, duration_minutes: 60, category: 'Cours collectifs' },
    { name: 'Cours collectif', description: 'Renforcement musculaire en groupe', price: 3000, duration_minutes: 60, category: 'Cours collectifs' },
    { name: 'Yoga & mobilité', description: 'Cours de souplesse et respiration', price: 3500, duration_minutes: 75, category: 'Cours collectifs' },
    { name: 'Coaching individuel', description: 'Séance personnalisée avec un coach', price: 10000, duration_minutes: 60, category: 'Coaching' },
    { name: 'Programme sur mesure', description: 'Bilan et plan d\'entraînement personnalisé', price: 25000, duration_minutes: 90, category: 'Coaching' },
    { name: 'Évaluation physique', description: 'Mesures, tests de force et objectifs', price: 5000, duration_minutes: 45, category: 'Évaluations' },
    { name: 'Pass mensuel', description: 'Accès illimité aux cours du mois', price: 25000, duration_minutes: 60, category: 'Abonnements' },
  ],
};

// ── ÉDUCATION ───────────────────────────────────────────────
const education: BusinessTypeConfig = {
  key: 'education',
  label: 'Éducation & Cours',
  description: 'Cours particuliers, soutien scolaire, formation, langues',
  icon: GraduationCap,
  bookingLabel: 'Réserver un cours',
  serviceNoun: 'un cours',
  categories: ['Cours particuliers', 'Groupes', 'Examens', 'Formations'],
  templates: [
    { name: 'Soutien scolaire — primaire', description: 'Aide aux devoirs et révisions', price: 3000, duration_minutes: 60, category: 'Cours particuliers' },
    { name: 'Soutien scolaire — secondaire', description: 'Mathématiques, physique, français', price: 5000, duration_minutes: 90, category: 'Cours particuliers' },
    { name: 'Cours d\'anglais', description: 'Conversation et grammaire, tous niveaux', price: 4000, duration_minutes: 60, category: 'Cours particuliers' },
    { name: 'Cours en groupe', description: 'Petit groupe de 5 élèves maximum', price: 2500, duration_minutes: 90, category: 'Groupes' },
    { name: 'Préparation examen', description: 'Intensif bachot/BEPC avec annales', price: 15000, duration_minutes: 120, category: 'Examens' },
    { name: 'Examen blanc', description: 'Épreuve en conditions réelles + correction', price: 5000, duration_minutes: 180, category: 'Examens' },
    { name: 'Formation professionnelle', description: 'Module de formation avec certificat', price: 30000, duration_minutes: 240, category: 'Formations' },
  ],
};

// ── AUTO ────────────────────────────────────────────────────
const auto: BusinessTypeConfig = {
  key: 'auto',
  label: 'Auto & Mécanique',
  description: 'Garage, mécanique, lavage, pneus, diagnostic',
  icon: Car,
  bookingLabel: 'Réserver un créneau',
  serviceNoun: 'une prestation',
  categories: ['Entretien', 'Réparations', 'Diagnostic', 'Lavage & Esthétique'],
  templates: [
    { name: 'Vidange', description: 'Huile moteur et filtre, tous véhicules', price: 18000, duration_minutes: 60, category: 'Entretien' },
    { name: 'Révision complète', description: 'Vidange, filtres, freins et niveaux', price: 45000, duration_minutes: 180, category: 'Entretien' },
    { name: 'Diagnostic électronique', description: 'Lecture des codes défauts et rapport', price: 8000, duration_minutes: 45, category: 'Diagnostic' },
    { name: 'Plaquettes de frein', description: 'Remplacement plaquettes avant ou arrière', price: 25000, duration_minutes: 90, category: 'Réparations' },
    { name: 'Changement pneu', description: 'Pose, équilibrage et valve', price: 6000, duration_minutes: 30, category: 'Réparations' },
    { name: 'Lavage extérieur', description: 'Lavage et séchage complet', price: 3000, duration_minutes: 30, category: 'Lavage & Esthétique' },
    { name: 'Lavage complet + lustrage', description: 'Intérieur, extérieur et cire de protection', price: 15000, duration_minutes: 120, category: 'Lavage & Esthétique' },
  ],
};

// ── BOUTIQUE / COMMERCE ─────────────────────────────────────
const shop: BusinessTypeConfig = {
  key: 'shop',
  label: 'Boutique & Commerce',
  description: 'Boutique, prêt-à-porter, électronique, commande & retrait',
  icon: ShoppingBag,
  bookingLabel: 'Réserver un créneau',
  serviceNoun: 'un service',
  categories: ['Sur mesure', 'Retrait boutique', 'Ateliers', 'Livraison'],
  templates: [
    { name: 'Rendez-vous sur mesure', description: 'Conseil personnalisé et essayage', price: 0, duration_minutes: 45, category: 'Sur mesure' },
    { name: 'Retrait commande', description: 'Récupération de votre commande préparée', price: 0, duration_minutes: 15, category: 'Retrait boutique' },
    { name: 'Essayage privé', description: 'Salle d\'essayage réservée avec conseillère', price: 0, duration_minutes: 60, category: 'Sur mesure' },
    { name: 'Personnalisation produit', description: 'Gravure, broderie ou impression', price: 5000, duration_minutes: 60, category: 'Ateliers' },
    { name: 'Créneau livraison', description: 'Choix du créneau de livraison à domicile', price: 0, duration_minutes: 30, category: 'Livraison' },
  ],
};

// ── SAAS / TECH ─────────────────────────────────────────────
const saas: BusinessTypeConfig = {
  key: 'saas',
  label: 'SaaS & Tech',
  description: 'Logiciel, agence digitale, freelance, consulting',
  icon: Cpu,
  bookingLabel: 'Réserver un appel',
  serviceNoun: 'un appel',
  categories: ['Démos', 'Consulting', 'Onboarding', 'Support'],
  templates: [
    { name: 'Démo produit (30 min)', description: 'Présentation en ligne du produit', price: 0, duration_minutes: 30, category: 'Démos' },
    { name: 'Démo approfondie', description: 'Démonstration complète avec cas d\'usage', price: 0, duration_minutes: 60, category: 'Démos' },
    { name: 'Consultation découverte', description: 'Cadrage de votre besoin et recommandations', price: 15000, duration_minutes: 45, category: 'Consulting' },
    { name: 'Audit technique', description: 'Revue d\'architecture ou de code avec rapport', price: 50000, duration_minutes: 90, category: 'Consulting' },
    { name: 'Onboarding client', description: 'Prise en main guidée de la plateforme', price: 0, duration_minutes: 60, category: 'Onboarding' },
    { name: 'Session de support', description: 'Assistance technique et résolution de problème', price: 5000, duration_minutes: 30, category: 'Support' },
    { name: 'Point projet hebdomadaire', description: 'Revue d\'avancement avec les parties prenantes', price: 0, duration_minutes: 30, category: 'Consulting' },
  ],
};

// ── ARTISAN ─────────────────────────────────────────────────
const artisan: BusinessTypeConfig = {
  key: 'artisan',
  label: 'Artisan & Services',
  description: 'Tailleur, cordonnier, photographe, électricien, plombier',
  icon: Hammer,
  bookingLabel: 'Prendre rendez-vous',
  serviceNoun: 'une prestation',
  categories: ['Prestations', 'Sur devis', 'Dépannage', 'Urgences'],
  templates: [
    { name: 'Prise de mesures', description: 'Relevé de mesures pour confection', price: 0, duration_minutes: 30, category: 'Prestations' },
    { name: 'Confection complet', description: 'Taille et couture d\'un complet 2 pièces', price: 25000, duration_minutes: 60, category: 'Prestations' },
    { name: 'Séance photo portrait', description: 'Shooting studio avec 10 photos retouchées', price: 20000, duration_minutes: 90, category: 'Prestations' },
    { name: 'Dépannage à domicile', description: 'Intervention et diagnostic sur place', price: 10000, duration_minutes: 60, category: 'Dépannage' },
    { name: 'Visite technique', description: 'Constat et devis gratuit', price: 0, duration_minutes: 45, category: 'Sur devis' },
    { name: 'Intervention urgente', description: 'Déplacement prioritaire sous 2 heures', price: 20000, duration_minutes: 60, category: 'Urgences' },
  ],
};

// ── AUTRE ───────────────────────────────────────────────────
const other: BusinessTypeConfig = {
  key: 'other',
  label: 'Autre activité',
  description: 'Tout autre métier avec rendez-vous',
  icon: Sparkles,
  bookingLabel: 'Prendre rendez-vous',
  serviceNoun: 'un service',
  categories: ['Général'],
  templates: [
    { name: 'Rendez-vous standard', description: 'Créneau de rendez-vous classique', price: 5000, duration_minutes: 30, category: 'Général' },
    { name: 'Rendez-vous long', description: 'Créneau étendu pour dossier complexe', price: 10000, duration_minutes: 60, category: 'Général' },
  ],
};

// ── Registre ────────────────────────────────────────────────
export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  salon,
  restaurant,
  clinic,
  fitness,
  education,
  auto,
  shop,
  saas,
  artisan,
  other,
};

export const BUSINESS_TYPE_LIST: BusinessTypeConfig[] = [
  salon, restaurant, clinic, fitness, education,
  auto, shop, saas, artisan, other,
];

export function getBusinessType(key: string | null | undefined): BusinessTypeConfig {
  if (key && key in BUSINESS_TYPES) return BUSINESS_TYPES[key as BusinessType];
  return other;
}
