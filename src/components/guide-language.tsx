'use client';
import { GmailSetupGuide } from './gmail-setup-guide';
import { AssistantGuide } from './assistant-guide';
import { BrightspaceNotificationGuide } from './brightspace-notification-guide';
import { TourReplay } from './onboarding';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useLanguage } from './language-provider';

export function GuideLanguage({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  if (language !== 'fr') return children;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">POUR BIEN COMMENCER</p>
          <h1>Guide d’utilisation</h1>
          <p>Organisez votre session, terminez votre travail et gardez vos notes à jour.</p>
        </div>
      </header>
      <TourReplay />
      <AssistantGuide french />
      <section className="card space-y-3 p-4">
        <h2 className="section-title">Votre routine quotidienne</h2>
        <p className="muted leading-relaxed">
          Consultez Accueil pour le travail à venir, cochez Terminé après avoir remis un travail,
          puis ouvrez Notes quand les résultats arrivent. Les évaluations terminées restent dans
          Notes attendues pour que vous les retrouviez des semaines plus tard.
        </p>
      </section>
      <section id="email" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">Avis de notes par courriel</h2>
        <p>
          Dans Notes → Courriels de notes, connectez le compte Gmail qui reçoit vos courriels
          scolaires. Sessio vérifie les avis toutes les cinq minutes lorsque l’application est
          ouverte et visible. Les résultats clairement associés à une évaluation sont enregistrés
          automatiquement dans Notes. Les cas incertains et les conflits avec une note saisie
          manuellement restent à vérifier. Si le courriel ne contient pas de résultat, consultez
          Brightspace et saisissez-le manuellement.
        </p>
        <p>
          Vous pouvez modifier le filtre Gmail, désactiver les vérifications automatiques ou
          déconnecter le compte. La déconnexion supprime les avis enregistrés, mais conserve les
          notes déjà sauvegardées.
        </p>
        <p>
          Les résultats et avis de publication restent dans Notes. Ouvrez Actualités dans le menu
          pour les annonces et modifications d’évaluations. Un changement d’échéance clair, qui
          nomme une seule évaluation et une seule date, est appliqué automatiquement. Sinon,
          choisissez Vérifier une échéance d’évaluation, confirmez l’évaluation, la date et l’heure,
          puis enregistrez. Dans les deux cas, l’évaluation existante et son calendrier sont mis à
          jour sans doublon ni changement de note. Les autres changements restent des avis à
          consulter dans Gmail.
        </p>
        <BrightspaceNotificationGuide french />
        <GmailSetupGuide french />
      </section>
      <section id="start" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">1. Vos cours et sessions</h2>
        <p>
          Dans{' '}
          <Link href="/settings/terms" className="underline">
            Paramètres → Sessions
          </Link>
          , créez une session et définissez ses dates. Choisissez la session active pour les vues
          par défaut. Dans Cours, ajoutez vos cours ou importez un plan de cours pour les créer
          automatiquement.
        </p>
        <p>
          Le filtre Session permet de consulter les autres sessions. Archiver un cours masque ses
          éléments sans les effacer. Supprimer un cours efface définitivement ses évaluations,
          résultats, séances, tâches et événements liés. Supprimer une session efface aussi tous ses
          cours : déplacez d’abord ceux à conserver. Les éléments personnels sans lien sont
          conservés.
        </p>
      </section>
      <section id="midsemester" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">Commencer en milieu de session</h2>
        <p>
          Vous pouvez commencer à utiliser Sessio à tout moment de la session. Vos travaux passés
          et vos notes s’ajoutent en deux étapes :
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <Link href="/syllabus" className="underline">
              Importez votre plan de cours
            </Link>{' '}
            pour chaque cours. Les évaluations passées depuis plus d’une semaine sont marquées comme
            déjà faites par défaut, pour ne pas apparaître en retard. Celles dues dans la dernière
            semaine restent ouvertes au cas où vous les remettez encore; cochez ou décochez chacune
            au besoin.
          </li>
          <li>
            Ouvrez le cours, allez à l’onglet Notes et choisissez Coller les notes de Brightspace.
            Dans Brightspace, ouvrez la page Notes du cours, sélectionnez tout le tableau, copiez-le
            et collez-le dans Sessio, puis choisissez Lire les notes. Vérifiez les correspondances
            et enregistrez.
          </li>
        </ol>
        <p className="muted">
          Seuls les résultats sont lus; les commentaires de l’enseignant ne sont pas enregistrés.
          Les nouvelles notes sont cochées automatiquement. Si Sessio a déjà une note différente,
          elle reste inchangée sauf si vous la cochez.
        </p>
      </section>
      <section id="calendar" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">2. Connecter Brightspace</h2>
        <p>
          Dans Brightspace, ouvrez Calendrier → Paramètres, activez les flux et copiez le lien dans
          S’abonner. Choisissez tous les calendriers pour inclure tous vos cours. Collez le lien
          dans{' '}
          <Link href="/settings/calendar#calendar-connections" className="underline">
            Paramètres → Connecter votre calendrier
          </Link>
          , vérifiez la période et choisissez Enregistrer le calendrier. L’aperçu permet de vérifier
          les entrées avant de confirmer.
        </p>
        <p>
          Un fichier .ics téléchargé est un instantané. Le lien d’abonnement permet la
          synchronisation environ toutes les 15 minutes pendant le fonctionnement du serveur local.
          En ligne, ouvrez Sessio pour déclencher les vérifications. Synchroniser lance une
          vérification immédiate, au plus une fois par minute.
        </p>
        <p>
          Les échéances de cours deviennent des évaluations, sans créer de tâches. Un identifiant
          d’événement stable permet de reconnaître la même entrée en anglais ou en français. Sessio
          ne fusionne jamais deux devoirs uniquement parce que leurs noms ou dates se ressemblent.
          Les résultats, pondérations et avancement existants sont conservés.
        </p>
        <p>
          Le calendrier n’apporte ni résultats, ni pondérations, ni toutes les annonces. Les avis de
          disponibilité restent des événements. Utilisez les tâches pour étudier, préparer un
          rapport ou travailler sur un devoir. Cochez Terminé pour finir une tâche. La
          synchronisation ne modifie pas vos tâches. Les entrées absentes du flux sont conservées;
          les annulations explicites sont indiquées.
        </p>
        <p>
          Déconnecter suspend la synchronisation et conserve le lien. Oublier le lien supprime le
          lien et ses références, tout en conservant les entrées. Une reconnexion rattache les
          entrées reconnues par leur lien Brightspace, ou par le même nom et la même heure
          exactement; les autres peuvent être ajoutées en double.
        </p>
      </section>
      <section id="syllabus" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">3. Importer un plan de cours</h2>
        <p>
          Ouvrez{' '}
          <Link href="/syllabus" className="underline">
            Importer un plan de cours
          </Link>
          . Choisissez Créer un cours à partir du plan et une session, ou Cours existant. Importez
          un PDF, DOCX, JPG/PNG ou TXT, puis cliquez sur Lire le plan de cours pour lancer la
          lecture. Vous pouvez aussi coller du texte et lancer l’analyse.
        </p>
        <p>
          Vérifiez le code, le nom, les évaluations, les dates et les pondérations. Le lecteur peut
          se tromper, notamment sur les années manquantes, les tableaux et les scans. Les extraits
          et numéros de page facilitent la vérification. Complétez les éléments manquants et
          désélectionnez les suggestions inutiles. Rien n’est enregistré avant votre confirmation.
        </p>
        <p>
          Associez une suggestion à une évaluation existante pour éviter les doublons. Cette mise à
          jour conserve les résultats, noms, notes et avancement. Un champ vide conserve la valeur
          existante; pour une nouvelle évaluation, une pondération vide vaut 0 % et une date vide
          signifie aucune échéance. La pondération totale ne peut pas dépasser 100 %. Une date sans
          heure utilise 23 h 59 dans votre fuseau horaire.
        </p>
        <p>
          Les pondérations groupées ou conditionnelles nécessitent votre vérification. Sessio
          permet de confirmer une règle comme « Les 4 meilleurs quiz sur 5 comptent » dans les
          consignes supplémentaires après la lecture. Vérifiez les évaluations et leur pondération
          totale : la règle utilise la moyenne à poids égaux des meilleurs pourcentages. Les notes
          inconnues ne valent pas zéro. Modifiez ou retirez les règles dans l’onglet Notes du cours.
          Les autres consignes restent des notes sans modifier les calculs. Si le plan indique une
          semaine et une séance, confirmez votre section après la lecture. Sessio déduit les dates
          sans ambiguïté et signale les jours fériés. Vous pouvez corriger les dates ou les laisser
          vides. Ces choix ne créent pas de cours récurrents. Une importation est un instantané;
          relisez les révisions ultérieures. La synchronisation du calendrier peut remplacer les
          dates d’évaluations liées.
        </p>
        <p id="syllabus-privacy" className="scroll-mt-6">
          Le fichier, le cours et la session sont envoyés au lecteur de Sessio et à son fournisseur
          d’IA (Google Gemini ou OpenAI), sans vos autres dossiers ni liens privés. Aucun compte
          d’IA n’est requis pour l’utilisateur. Sessio ne conserve pas le fichier original; les
          règles de conservation du fournisseur s’appliquent. L’offre gratuite de Google peut
          utiliser les documents pour améliorer ses produits, avec possibilité de révision humaine.
          Utilisez uniquement des plans non sensibles. En cas d’indisponibilité, réessayez plus tard
          ou ajoutez les évaluations manuellement.
        </p>
      </section>
      <section id="grades" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">4. Terminer le travail et saisir les notes</h2>
        <p>
          Ouvrez une évaluation et cochez Terminé, puis enregistrez. Elle prend l’état Remis et
          reste dans{' '}
          <Link href="/grades" className="underline">
            Notes → Notes attendues
          </Link>{' '}
          jusqu’à la saisie du résultat. Cela ne remet aucun fichier à Brightspace. Terminer une
          tâche ne marque pas l’évaluation comme remise.
        </p>
        <p>
          Quand vous recevez une note, saisissez Résultat obtenu et Sur (par exemple 18 sur 20),
          puis Enregistrer la note. Toutes les évaluations permet de retrouver un travail qui n’a
          pas été marqué terminé. Modifier les détails permet d’ajouter la pondération ou des notes.
        </p>
        <p>
          Un résultat vide signifie non évalué; zéro est une vraie note. Les moyennes utilisent
          seulement les évaluations notées et leurs pondérations. Les importations de calendrier
          commencent à 0 % de pondération. Les estimations ne remplacent pas les résultats
          officiels. La liste Notes attendues ne consulte ni votre courriel ni le carnet de notes de
          votre établissement.
        </p>
      </section>
      <section id="planning" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">5. Tâches, séances et calendrier</h2>
        <p>
          Dans Tâches, ajoutez des priorités, durées et sous-tâches. Utilisez l’onglet Horaire d’un
          cours pour les séances hebdomadaires, limitées aux dates de la session. Ajoutez les
          événements personnels dans Calendrier. Pour un événement sur plusieurs jours, le dernier
          jour est inclus.
        </p>
        <p>
          Les quiz, examens de mi-session et examens finaux datés reçoivent une tâche d’étude
          lorsqu’ils sont à moins de 10 jours. Vous la trouverez dans Vos priorités → Préparer les
          évaluations et dans Tâches. Terminer ou supprimer une tâche d’étude empêche sa recréation.
          Son nom et sa date suivent l’évaluation; modifier son titre, sa date ou l’évaluation liée
          en fait une tâche personnelle.
        </p>
        <p>
          Ctrl+K (ou Cmd+K sur Mac) ouvre la recherche et l’ajout rapide. Tab passe d’un contrôle à
          l’autre; Échap ferme une fenêtre.
        </p>
      </section>
      <section id="data" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">6. Apparence, langue et données</h2>
        <p>
          Dans Paramètres, choisissez un thème et un compagnon d’étude. Désactivez Mouvements doux
          pour le garder immobile. Le réglage de réduction des mouvements de votre appareil est
          respecté. Enregistrez vos préférences.
        </p>
        <p>
          Le bouton Français / English change l’interface et les dates. Le choix est conservé dans
          ce navigateur pendant un an, sans suivi. Les noms de cours et les textes importés restent
          dans leur langue d’origine.
        </p>
        <p>
          Vos données permet de télécharger une copie JSON lisible ou d’effacer définitivement
          l’espace. La copie exclut les liens privés et ne permet pas une restauration automatique.
          L’effacement ne supprime pas les sauvegardes, fichiers déjà téléchargés ou données chez
          votre établissement.{' '}
          <Link href="/legal/privacy" className="underline">
            Lire la politique de confidentialité
          </Link>
          .
        </p>
      </section>
      <section id="troubleshooting" className="card scroll-mt-6 space-y-3 p-4">
        <h2 className="section-title">7. Dépannage</h2>
        <p>
          Pour un calendrier inaccessible, vérifiez que vous utilisez le lien HTTPS ou webcal
          d’abonnement, que les flux sont activés et que les dates incluent les événements. Le
          serveur doit avoir accès à Internet. Recoller le lien ne corrige pas une connexion réseau
          bloquée.
        </p>
        <p>
          Après un redémarrage, la version locale nécessite la base de données et le serveur. Dans
          le dossier Sessio, lancez <code>npm run db:local</code> dans un terminal, puis{' '}
          <code>npm run dev</code> dans un autre. Ouvrez <code>http://127.0.0.1:3000</code> et
          gardez les deux processus en marche.
        </p>
      </section>
    </div>
  );
}
