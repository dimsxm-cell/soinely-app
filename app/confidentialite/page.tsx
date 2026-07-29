import type { Metadata } from "next";
import { PageLegale, type SectionLegale } from "@/components/legal/PageLegale";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Soinely",
  description: "Comment Soinely collecte, utilise et protège les données personnelles et les données de santé.",
};

const SECTIONS: SectionLegale[] = [
  {
    titre: "Qui est responsable de vos données",
    blocs: [
      {
        type: "p",
        texte:
          "Soinely est un service destiné aux infirmiers et infirmières libéraux (IDEL) pour organiser leurs tournées et tenir le dossier de soins de leurs patients.",
      },
      {
        type: "aValider",
        texte:
          "Identité de l'éditeur : raison sociale, forme juridique, capital, numéro SIRET, adresse du siège social, nom du directeur de la publication, adresse e-mail de contact.",
      },
    ],
  },
  {
    titre: "Répartition des rôles : vous et nous",
    blocs: [
      {
        type: "p",
        texte:
          "Deux traitements distincts coexistent dans Soinely, et il est important de ne pas les confondre.",
      },
      {
        type: "liste",
        items: [
          "Les données de vos patients : vous, professionnel de santé, décidez pourquoi et comment elles sont traitées. Vous en êtes le responsable de traitement. Soinely agit comme sous-traitant et n'intervient sur ces données que pour vous fournir le service.",
          "Les données de votre propre compte (identité, e-mail, abonnement) : Soinely en est responsable de traitement.",
        ],
      },
      {
        type: "aValider",
        texte:
          "Cette répartition doit être formalisée dans un contrat de sous-traitance conforme à l'article 28 du RGPD, signé entre l'éditeur et chaque professionnel utilisateur. Ce document reste à rédiger et à faire valider.",
      },
    ],
  },
  {
    titre: "Données que nous traitons",
    blocs: [
      { type: "p", texte: "Votre compte professionnel :" },
      {
        type: "liste",
        items: [
          "Nom et prénom, adresse e-mail, mot de passe (stocké sous forme chiffrée et jamais lisible par nous)",
          "Numéro ADELI ou RPPS, si vous choisissez de le renseigner",
          "Photo de profil, si vous en ajoutez une",
        ],
      },
      {
        type: "p",
        texte:
          "Les données que vous saisissez sur vos patients. Elles relèvent des données de santé, protégées de façon renforcée par l'article 9 du RGPD :",
      },
      {
        type: "liste",
        items: [
          "Identité : nom, prénom, date de naissance, sexe, numéro de sécurité sociale",
          "Coordonnées : adresse postale, numéro de téléphone",
          "Entourage médical : médecin traitant et personne de confiance (nom et téléphone)",
          "Informations cliniques : antécédents médicaux, allergies, traitements en cours, consignes de soin",
          "Suivi des visites : soins prescrits, horaires, statut des passages, transmissions infirmières, rappels et photos de suivi que vous prenez",
        ],
      },
      { type: "p", texte: "Votre abonnement et votre usage du service :" },
      {
        type: "liste",
        items: [
          "Formule souscrite, statut et échéances de l'abonnement",
          "Identifiants techniques de paiement fournis par Stripe. Vos coordonnées bancaires ne transitent jamais par Soinely et ne sont pas stockées sur nos serveurs.",
          "Mesures d'audience et de performance agrégées, destinées à améliorer l'application",
        ],
      },
    ],
  },
  {
    titre: "Pourquoi nous les traitons",
    blocs: [
      {
        type: "liste",
        items: [
          "Fournir le service : organiser vos tournées, tenir le dossier de soins, générer les documents imprimables. Base légale : l'exécution du contrat qui nous lie.",
          "Traiter les données de santé de vos patients : elles sont nécessaires à la prise en charge et au suivi des soins, et traitées sous votre responsabilité de professionnel soumis au secret professionnel.",
          "Gérer votre abonnement et la facturation. Base légale : l'exécution du contrat et nos obligations comptables.",
          "Sécuriser le service et prévenir les usages frauduleux. Base légale : notre intérêt légitime.",
          "Mesurer l'audience de façon agrégée pour améliorer l'application. Base légale : notre intérêt légitime.",
        ],
      },
    ],
  },
  {
    titre: "Qui d'autre accède à ces données",
    blocs: [
      {
        type: "p",
        texte:
          "Nous ne vendons aucune donnée et n'en transmettons à aucun tiers à des fins publicitaires. Pour faire fonctionner le service, nous faisons appel aux prestataires techniques suivants :",
      },
      {
        type: "liste",
        items: [
          "Supabase — base de données, authentification et stockage des photos de suivi",
          "Vercel — hébergement de l'application, mesure d'audience et de performance",
          "Stripe — traitement des paiements par carte bancaire",
          "Google — uniquement si vous choisissez de vous connecter avec un compte Google, et limité à votre identification",
        ],
      },
      {
        type: "aValider",
        texte:
          "Pour chaque prestataire : localisation effective des serveurs, garanties applicables en cas de transfert hors Union européenne (clauses contractuelles types), et lien vers sa propre politique de confidentialité.",
      },
    ],
  },
  {
    titre: "Hébergement des données de santé",
    blocs: [
      {
        type: "p",
        texte:
          "En France, l'hébergement de données de santé à caractère personnel recueillies dans le cadre d'activités de prévention, de diagnostic ou de soins est encadré par l'article L. 1111-8 du Code de la santé publique. Il impose de recourir à un hébergeur certifié HDS, ou à un hébergement assuré par le professionnel lui-même.",
      },
      {
        type: "aValider",
        texte:
          "Point de conformité à trancher en priorité : identifier l'hébergeur effectif des données de santé, vérifier s'il dispose de la certification HDS, et le mentionner nommément ici. Tant que ce point n'est pas établi, aucune mention de certification HDS ne doit figurer sur le site ni dans ce document.",
      },
    ],
  },
  {
    titre: "Combien de temps nous les conservons",
    blocs: [
      {
        type: "p",
        texte:
          "Les données de votre compte sont conservées tant que celui-ci est actif. Les données de vos patients restent sous votre maîtrise : vous pouvez les corriger ou les supprimer à tout moment depuis l'application.",
      },
      {
        type: "aValider",
        texte:
          "Durées de conservation précises à définir pour chaque catégorie : compte après résiliation, données patients après suppression du compte, factures (durée légale de conservation comptable), sauvegardes techniques.",
      },
    ],
  },
  {
    titre: "Comment nous les protégeons",
    blocs: [
      {
        type: "liste",
        items: [
          "Les échanges entre votre appareil et nos serveurs sont chiffrés (HTTPS).",
          "Chaque professionnel n'accède qu'à ses propres patients : cet isolement est appliqué directement par la base de données, et non seulement par l'application.",
          "Les photos de suivi sont stockées de façon privée et ne sont accessibles que via des liens temporaires, valables quelques minutes.",
          "Les mots de passe sont stockés sous forme chiffrée irréversible et ne sont lisibles par personne, y compris par nous.",
        ],
      },
      {
        type: "aValider",
        texte:
          "Décrire ici les mesures organisationnelles complémentaires réellement en place : gestion des accès internes, journalisation, politique de sauvegarde, procédure de notification en cas de violation de données.",
      },
    ],
  },
  {
    titre: "Vos droits",
    blocs: [
      {
        type: "p",
        texte:
          "Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, de limitation et d'opposition sur vos données personnelles. Vous pouvez exercer ces droits en nous contactant.",
      },
      {
        type: "p",
        texte:
          "Vos patients disposent des mêmes droits sur leurs propres données. Comme vous êtes responsable de leur traitement, ces demandes vous sont adressées directement. Nous vous assistons techniquement si nécessaire.",
      },
      {
        type: "p",
        texte:
          "Vous pouvez également introduire une réclamation auprès de la CNIL, autorité de contrôle française, dont le site est cnil.fr.",
      },
      { type: "aValider", texte: "Adresse e-mail dédiée à l'exercice des droits, et coordonnées du délégué à la protection des données (DPO) si un DPO a été désigné." },
    ],
  },
  {
    titre: "Information de vos patients",
    blocs: [
      {
        type: "p",
        texte:
          "En tant que responsable du traitement des données de vos patients, il vous appartient de les informer que leurs données sont enregistrées dans un outil numérique de suivi de soins, et de recueillir leur consentement lorsque la réglementation l'exige.",
      },
    ],
  },
  {
    titre: "Cookies et mesure d'audience",
    blocs: [
      {
        type: "p",
        texte:
          "Soinely dépose les cookies strictement nécessaires au maintien de votre session. L'application utilise également les outils de mesure d'audience et de performance de Vercel.",
      },
      {
        type: "aValider",
        texte:
          "Vérifier si les outils de mesure utilisés déposent des traceurs soumis à consentement. Si tel est le cas, un bandeau de consentement doit être mis en place.",
      },
    ],
  },
  {
    titre: "Évolution de cette politique",
    blocs: [
      {
        type: "p",
        texte:
          "Cette politique peut être modifiée pour refléter les évolutions du service ou de la réglementation. En cas de changement significatif, nous vous en informerons.",
      },
    ],
  },
];

export default function ConfidentialitePage() {
  return (
    <PageLegale
      titre="Politique de confidentialité"
      chapeau="Soinely traite des données de santé. Ce document explique lesquelles, pourquoi, et quels sont vos droits."
      miseAJour="28 juillet 2026"
      sections={SECTIONS}
    />
  );
}
