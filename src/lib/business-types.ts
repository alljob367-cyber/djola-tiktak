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

// ============================================================
// Formulaire de service ADAPTÉ À CHAQUE MÉTIER
// Chaque type de business définit ses propres paramètres :
// libellés, presets de durée, capacité visible ou masquée,
// prix optionnel… et des champs spécifiques (extraFields)
// stockés dans services.metadata (JSONB).
// Ex : un SaaS configure "format de l'appel" + "lien visio",
// un salon configure "service à domicile" — jamais les mêmes.
// ============================================================

/** Type de champ spécifique au métier */
export type ExtraFieldType = 'text' | 'select' | 'boolean';

export interface ExtraFieldDef {
  /** Clé dans services.metadata (serpentin, ex : "home_service") */
  key: string;
  /** Libellé affiché dans le formulaire du commerçant */
  label: string;
  type: ExtraFieldType;
  /** Options pour type="select" (le choix est stocké tel quel) */
  options?: string[];
  /** Placeholder pour type="text" */
  placeholder?: string;
  /** Afficher la valeur sous forme de pastille sur la carte publique */
  publicChip?: boolean;
}

/** Configuration du formulaire de création/édition de service */
export interface ServiceFormConfig {
  /** Libellé du champ prix (ex : "Prix du menu") */
  priceLabel?: string;
  /** Aide sous le champ prix (ex : "0 = appel gratuit") */
  priceHint?: string;
  /** Prix non obligatoire (SaaS, restaurant) */
  priceOptional?: boolean;
  /** Libellé du champ durée (ex : "Durée de l'appel (min)") */
  durationLabel?: string;
  /** Durées proposées en boutons rapides */
  durationPresets?: number[];
  /** Durée minimale (défaut 5) */
  durationMin?: number;
  /** Durée maximale (défaut 480) */
  durationMax?: number;
  /** Incrément de durée suggéré */
  durationStep?: number;
  /** Unité affichée à côté des presets (ex : "min", "min / table") */
  durationUnit?: string;
  /** Capacité — masquée pour les métiers en rendez-vous individuel */
  capacity?: {
    show: boolean;
    label?: string;
    hint?: string;
    min?: number;
    max?: number;
    default?: number;
  };
  /** Champs spécifiques au métier (stockés en JSONB) */
  extraFields?: ExtraFieldDef[];
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
  /** Paramètres du formulaire de service propres au métier */
  serviceForm: ServiceFormConfig;
}

/** Config par défaut du formulaire (métier "other") */
const defaultServiceForm: ServiceFormConfig = {};

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
  serviceForm: {
    durationLabel: 'Durée du soin (min)',
    durationPresets: [15, 20, 30, 45, 60, 90, 120, 180],
    durationStep: 5,
    priceHint: 'Prix du soin en FCFA',
    capacity: { show: false, default: 1 },
    extraFields: [
      { key: 'home_service', label: 'Service à domicile', type: 'boolean', publicChip: true },
      { key: 'products', label: 'Produits utilisés', type: 'text', placeholder: 'Ex : shampooing doux, huile de karité…', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée de la table (min)',
    durationPresets: [60, 90, 120, 180],
    durationStep: 15,
    priceOptional: true,
    priceHint: '0 = gratuit (prix libre sur place)',
    capacity: { show: true, label: 'Couverts par table', hint: 'Nombre de places réservées d\u2019un coup', min: 1, max: 20, default: 4 },
    extraFields: [
      { key: 'seating', label: 'Emplacement', type: 'select', options: ['Salle', 'Terrasse', 'Peu importe'], publicChip: true },
      { key: 'menu', label: 'Menu proposé', type: 'text', placeholder: 'Ex : poulet braisé, plantains, salade…', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée de la consultation (min)',
    durationPresets: [10, 15, 20, 30, 45, 60],
    durationStep: 5,
    capacity: { show: false, default: 1 },
    extraFields: [
      { key: 'first_visit', label: 'Première consultation', type: 'boolean', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée de la séance (min)',
    durationPresets: [30, 45, 60, 75, 90, 120],
    durationStep: 5,
    capacity: { show: true, label: 'Places par séance', hint: 'Taille maximale du groupe', min: 1, max: 30, default: 8 },
    extraFields: [
      { key: 'level', label: 'Niveau requis', type: 'select', options: ['Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'], publicChip: true },
      { key: 'equipment', label: 'Matériel fourni', type: 'boolean', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée du cours (min)',
    durationPresets: [45, 60, 90, 120, 180, 240],
    durationStep: 15,
    capacity: { show: true, label: 'Élèves maximum', hint: 'Taille du groupe', min: 1, max: 40, default: 5 },
    extraFields: [
      { key: 'level', label: 'Niveau / classe', type: 'text', placeholder: 'Ex : 6ème, Terminale, Débutant…', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée de la prestation (min)',
    durationPresets: [30, 45, 60, 90, 120, 180],
    durationStep: 15,
    capacity: { show: false, default: 1 },
    extraFields: [
      { key: 'vehicle', label: 'Type de véhicule', type: 'select', options: ['Voiture', 'Moto', 'Camion', 'Tous véhicules'], publicChip: true },
      { key: 'at_home', label: 'Intervention à domicile', type: 'boolean', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée du créneau (min)',
    durationPresets: [15, 30, 45, 60],
    durationStep: 5,
    priceOptional: true,
    priceHint: '0 = gratuit (paiement en boutique)',
    capacity: { show: false, default: 1 },
    extraFields: [
      { key: 'delivery', label: 'Livraison possible', type: 'boolean', publicChip: true },
      { key: 'try_on', label: 'Essayage possible', type: 'boolean', publicChip: true },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée de l\'appel (min)',
    durationPresets: [15, 30, 45, 60],
    durationMin: 10,
    durationMax: 180,
    durationStep: 5,
    priceOptional: true,
    priceHint: '0 = appel / démo gratuit',
    capacity: { show: true, label: 'Participants maximum', hint: 'Nombre de personnes sur l\'appel', min: 1, max: 20, default: 1 },
    extraFields: [
      { key: 'format', label: 'Format du rendez-vous', type: 'select', options: ['Visio', 'Téléphone', 'Présentiel', 'Bureau'], publicChip: true },
      { key: 'meeting_link', label: 'Lien de réunion (visio)', type: 'text', placeholder: 'Ex : https://meet.google.com/xyz-abcd' },
    ],
  },
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
  serviceForm: {
    durationLabel: 'Durée de la prestation (min)',
    durationPresets: [30, 45, 60, 90, 120],
    durationStep: 5,
    priceOptional: true,
    priceHint: '0 = prix fixé sur devis',
    capacity: { show: false, default: 1 },
    extraFields: [
      { key: 'quote', label: 'Prix sur devis', type: 'boolean', publicChip: true },
      { key: 'zone', label: 'Zone d\'intervention', type: 'text', placeholder: 'Ex : Akanda, Glass, Nzeng-Ayong…', publicChip: true },
    ],
  },
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
  serviceForm: defaultServiceForm,
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

// ── Aide au rendu des métadonnées de service ───────────────

/**
 * Met en forme les métadonnées d'un service pour affichage public :
 * [{ label, value }] — seuls les champs connus du métier et marqués
 * publicChip sont retournés. Les liens (meeting_link) sont exclus.
 */
export function serviceMetadataChips(
  businessType: string | null | undefined,
  metadata: Record<string, string | number | boolean> | null | undefined,
): Array<{ label: string; value: string }> {
  if (!metadata) return [];
  const config = getBusinessType(businessType);
  const defs = config.serviceForm.extraFields ?? [];
  const chips: Array<{ label: string; value: string }> = [];
  for (const def of defs) {
    if (!def.publicChip) continue;
    const raw = metadata[def.key];
    if (raw === undefined || raw === null || raw === '' || raw === false) continue;
    if (def.type === 'boolean') {
      chips.push({ label: def.label, value: '' });
    } else {
      chips.push({ label: def.label, value: String(raw) });
    }
  }
  return chips;
}
