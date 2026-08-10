import type { Metadata } from "next";
import { PageLegale, type SectionLegale } from "@/components/legal/PageLegale";
import { DUREE_ESSAI_GRATUIT_JOURS } from "@/lib/data/abonnement";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Soinely",
  description: "Les règles d'utilisation du service Soinely, destiné aux infirmiers et infirmières libéraux.",
  alternates: { canonical: `${SITE_URL}/conditions` },
};

const SECTIONS: SectionLegale[] = [
  {
    titre: "Objet",
    blocs: [
      {
        type: "p",
        texte:
          "Les présentes conditions définissent les règles d'accès et d'utilisation de Soinely, application destinée aux infirmiers et infirmières libéraux pour organiser leurs tournées, tenir le dossier de soins de leurs patients et accéder à des fiches de pratique professionnelle.",
      },
      {
        type: "p",
        texte:
          "Créer un compte vaut acceptation pleine et entière des présentes conditions.",
      },
      {
        type: "aValider",
        texte:
          "Identité de l'éditeur : raison sociale, forme juridique, capital social, numéro SIRET, adresse du siège, directeur de la publication, e-mail de contact, et coordonnées de l'hébergeur.",
      },
    ],
  },
  {
    titre: "Qui peut utiliser Soinely",
    blocs: [
      {
        type: "p",
        texte:
          "Le service s'adresse exclusivement aux professionnels de santé habilités à exercer, en particulier les infirmiers et infirmières en exercice libéral. En créant un compte, vous déclarez remplir cette condition et être régulièrement inscrit auprès de votre ordre professionnel.",
      },
      { type: "p", texte: "Soinely n'est pas destiné aux patients ni au grand public." },
    ],
  },
  {
    titre: "Votre compte",
    blocs: [
      {
        type: "liste",
        items: [
          "Vous vous engagez à fournir des informations exactes lors de votre inscription et à les tenir à jour.",
          "Votre compte est strictement personnel. Vos identifiants ne doivent être partagés avec personne, y compris au sein d'un même cabinet.",
          "Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte.",
          "En cas d'utilisation non autorisée de votre compte, vous devez nous en informer sans délai.",
        ],
      },
      {
        type: "p",
        texte:
          "Dans l'offre Cabinet, chaque professionnel dispose de son propre compte : le partage d'un compte unique entre plusieurs soignants n'est pas autorisé.",
      },
    ],
  },
  {
    titre: "Essai gratuit et abonnement",
    blocs: [
      {
        type: "liste",
        items: [
          `Tout nouveau compte bénéficie d'un essai gratuit de ${DUREE_ESSAI_GRATUIT_JOURS} jours donnant accès à l'ensemble des fonctionnalités, sans carte bancaire.`,
          "À l'issue de l'essai, la poursuite de l'utilisation requiert un abonnement payant.",
          "Offre Solo : 19 € par mois et par infirmier. Offre Cabinet : 39 € par mois et par infirmier.",
          "Le paiement annuel bénéficie d'une remise de 20 % et est facturé en une fois pour douze mois.",
          "Les paiements sont traités par Stripe. Soinely n'a jamais accès à vos coordonnées bancaires.",
          "L'abonnement est sans engagement de durée et résiliable à tout moment depuis votre espace compte.",
        ],
      },
      {
        type: "p",
        texte:
          "En cas d'échec de paiement, l'accès aux fonctionnalités peut être suspendu. Vous conservez néanmoins l'accès à votre espace compte afin de régulariser la situation.",
      },
      {
        type: "aValider",
        texte:
          "Points à préciser avec un juriste : sort des données en cas de résiliation, conditions de remboursement, application du droit de rétractation, et modalités d'évolution tarifaire.",
      },
    ],
  },
  {
    titre: "ELY : un outil documentaire, pas un avis médical",
    blocs: [
      {
        type: "p",
        texte:
          "ELY est un assistant de recherche. Lorsque vous lui posez une question, il retrouve et vous présente des fiches de pratique rédigées à l'avance dans la base documentaire de Soinely. Il ne formule aucun diagnostic et ne génère aucune recommandation personnalisée à partir de la situation de votre patient.",
      },
      {
        type: "p",
        texte:
          "Les contenus proposés par ELY, comme l'ensemble des fiches accessibles dans l'application, ont une vocation strictement informative. Ils ne remplacent ni votre jugement clinique, ni une prescription médicale, ni l'avis d'un médecin. La décision de soin vous appartient et relève de votre seule responsabilité professionnelle.",
      },
      {
        type: "p",
        texte:
          "En situation d'urgence, appelez le 15 (SAMU) ou le 112. N'utilisez jamais Soinely comme moyen d'alerte.",
      },
    ],
  },
  {
    titre: "Vos obligations professionnelles",
    blocs: [
      {
        type: "liste",
        items: [
          "Vous restez tenu au secret professionnel pour toute information saisie dans l'application.",
          "Vous vous engagez à n'enregistrer que les données strictement nécessaires à la prise en charge de vos patients.",
          "Vous êtes responsable de l'exactitude des données que vous saisissez et de leur mise à jour.",
          "Il vous appartient d'informer vos patients de l'enregistrement de leurs données et de recueillir leur consentement lorsque la réglementation l'exige.",
          "Vous vous interdisez d'utiliser le service à des fins contraires à la loi ou à la déontologie infirmière.",
        ],
      },
      {
        type: "p",
        texte:
          "Les documents imprimables générés par Soinely sont des modèles fournis à titre d'aide. Il vous revient d'en vérifier le contenu et l'adéquation à chaque situation avant tout usage.",
      },
    ],
  },
  {
    titre: "Disponibilité du service",
    blocs: [
      {
        type: "p",
        texte:
          "Nous mettons en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans pouvoir garantir un fonctionnement ininterrompu. Des interruptions peuvent survenir pour maintenance, mise à jour, ou du fait de nos prestataires techniques.",
      },
      {
        type: "p",
        texte:
          "Certaines fonctionnalités reposent sur des technologies propres à votre navigateur ou à votre appareil, notamment la reconnaissance et la synthèse vocales. Leur disponibilité dépend de votre équipement et échappe à notre maîtrise.",
      },
    ],
  },
  {
    titre: "Propriété intellectuelle",
    blocs: [
      {
        type: "p",
        texte:
          "L'application, sa charte graphique, ses contenus documentaires et ses composants logiciels demeurent la propriété de l'éditeur. Votre abonnement vous confère un droit d'usage personnel et non exclusif, à l'exclusion de tout droit de reproduction, de diffusion ou de revente.",
      },
      {
        type: "p",
        texte:
          "Les données que vous saisissez sur vos patients vous appartiennent. Nous ne les exploitons à aucune autre fin que la fourniture du service.",
      },
    ],
  },
  {
    titre: "Responsabilité",
    blocs: [
      {
        type: "p",
        texte:
          "Soinely est un outil d'organisation et de documentation. Notre responsabilité ne saurait être engagée à raison des décisions de soin que vous prenez, de l'exactitude des données que vous saisissez, ni des conséquences d'une utilisation non conforme aux présentes conditions.",
      },
      {
        type: "aValider",
        texte:
          "Clause de limitation de responsabilité à faire rédiger par un juriste : une limitation excessive serait réputée non écrite, et le domaine de la santé appelle une rédaction particulièrement prudente.",
      },
    ],
  },
  {
    titre: "Durée et résiliation",
    blocs: [
      {
        type: "p",
        texte:
          "Vous pouvez cesser d'utiliser Soinely et demander la suppression de votre compte à tout moment. Nous pouvons suspendre ou résilier un compte en cas de manquement grave aux présentes conditions, après information préalable sauf urgence.",
      },
      {
        type: "aValider",
        texte:
          "Préciser le délai de préavis, le sort des données après résiliation et les modalités d'export de vos données patients.",
      },
    ],
  },
  {
    titre: "Modification des conditions",
    blocs: [
      {
        type: "p",
        texte:
          "Ces conditions peuvent évoluer. Toute modification substantielle vous sera signalée. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles conditions.",
      },
    ],
  },
  {
    titre: "Droit applicable",
    blocs: [
      {
        type: "p",
        texte:
          "Les présentes conditions sont régies par le droit français. En cas de différend, une solution amiable sera recherchée en priorité.",
      },
      {
        type: "aValider",
        texte:
          "Ajouter la clause de médiation de la consommation si le service s'adresse à des professionnels en nom propre, et préciser la juridiction compétente.",
      },
    ],
  },
];

export default function ConditionsPage() {
  return (
    <PageLegale
      titre="Conditions générales d'utilisation"
      chapeau="Les règles qui encadrent votre utilisation de Soinely, et nos engagements réciproques."
      miseAJour="28 juillet 2026"
      sections={SECTIONS}
    />
  );
}
