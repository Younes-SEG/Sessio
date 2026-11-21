export function BrightspaceNotificationGuide({ french = false }: { french?: boolean }) {
  const choose = (en: string, fr: string) => (french ? fr : en);
  const enabled = [
    ['Announcements - new announcement available', 'Annonces — nouvelle annonce disponible'],
    ['Announcements - announcement updated', 'Annonces — annonce mise à jour'],
    ['Assignments - assignment feedback released', 'Travaux — rétroaction publiée'],
    ['Assignments - assignment feedback updated', 'Travaux — rétroaction mise à jour'],
    ['Grades - grade item released', 'Notes — élément de note publié'],
    ['Grades - grade item updated', 'Notes — élément de note mis à jour'],
  ];
  const disabled = [
    [
      'Activity Feed - new comments from others on a post',
      'Fil d’activité — nouveaux commentaires',
    ],
    ['Activity Feed - new posts created by others', 'Fil d’activité — nouvelles publications'],
    [
      'Assignments - assignment due date or end date is 2 days away',
      'Travaux — échéance dans 2 jours',
    ],
    [
      'Assignments - publish all feedback completion',
      'Travaux — publication de toutes les rétroactions terminée',
    ],
    ['Content - content item created', 'Contenu — élément créé'],
    ['Content - content item updated', 'Contenu — élément mis à jour'],
    ['Content - content overview updated', 'Contenu — aperçu mis à jour'],
    [
      'Content Service - feedback for content service uploads',
      'Service de contenu — rétroaction sur les téléversements',
    ],
    [
      'Discussions - discussion topic due date or end date is 2 days away',
      'Discussions — échéance du sujet dans 2 jours',
    ],
    [
      'Discussions - mentioned in a discussion post or thread',
      'Discussions — mention dans une publication ou un fil',
    ],
    [
      'Discussions - new post in a forum, topic, or thread that I subscribed to in instant notifications',
      'Discussions — nouvelle publication dans un forum, sujet ou fil suivi',
    ],
    [
      'ePortfolio - feedback added to subscribed items',
      'ePortfolio — rétroaction sur les éléments suivis',
    ],
    [
      'ePortfolio - another user has subscribed to your updates',
      'ePortfolio — nouvel abonnement à vos mises à jour',
    ],
    ['ePortfolio - feedback added to my items', 'ePortfolio — rétroaction sur mes éléments'],
    [
      'Quizzes - quiz due date or end date is 2 days away',
      'Questionnaires — échéance dans 2 jours',
    ],
  ];
  return (
    <section
      id="brightspace-notifications"
      aria-labelledby="brightspace-notifications-title"
      className="scroll-mt-6 space-y-4 border-t border-border pt-5"
    >
      <h3 id="brightspace-notifications-title" className="text-lg font-semibold">
        {choose('Recommended Brightspace notifications', 'Notifications Brightspace recommandées')}
      </h3>
      <p className="text-sm">
        {choose(
          'For fewer emails while keeping grades, feedback and announcements: open Brightspace → your name/profile → Notifications. Change these settings in Brightspace, then click Save. This checklist does not change your account settings.',
          'Pour recevoir moins de courriels tout en conservant notes, rétroactions et annonces : ouvrez Brightspace → votre nom/profil → Notifications. Modifiez ces paramètres dans Brightspace, puis cliquez sur Enregistrer. Cette liste ne modifie pas votre compte.',
        )}
      </p>
      <div className="rounded-sm border border-border bg-muted p-4 text-sm">
        <strong>{choose('Summary of Activity → Never', 'Résumé des activités → Jamais')}</strong>
        <p className="mt-1">
          {choose(
            'Use instant notifications instead of daily or weekly summaries. Summaries can repeat results already sent individually. This reduces repeated emails; it does not remove copies already imported into Sessio.',
            'Utilisez les notifications instantanées plutôt que les résumés quotidiens ou hebdomadaires. Les résumés peuvent répéter des résultats déjà envoyés séparément. Cela réduit les répétitions, sans supprimer les copies déjà importées dans Sessio.',
          )}
        </p>
      </div>
      <div>
        <h4 className="mb-2 font-semibold">
          {choose('Keep these six Email boxes checked', 'Gardez ces six cases Courriel cochées')}
        </h4>
        <ul className="space-y-2 text-sm">
          {enabled.map(([en, fr]) => (
            <li key={en} className="flex gap-2">
              <span aria-hidden className="text-primary">
                ✓
              </span>
              <span>{choose(en, fr)}</span>
            </li>
          ))}
        </ul>
        <p className="muted mt-3 text-sm">
          {choose(
            'Feedback can contain useful comments without a score, so keep it enabled. Feedback-only messages belong in School updates; explicit grades and grade-release notices belong in Grade emails.',
            'Une rétroaction peut contenir des commentaires utiles sans résultat chiffré : gardez-la activée. Les messages de rétroaction seuls vont dans Actualités; les résultats et avis de publication vont dans Courriels de notes.',
          )}
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <h4 className="font-semibold">
          {choose('Customize Notifications', 'Personnaliser les notifications')}
        </h4>
        <p>
          <strong>{choose('ON:', 'ACTIVÉ :')}</strong>{' '}
          {choose(
            'Include my grade value in notifications from Grades. Sessio needs the actual score in the email to save a grade automatically; a release notice alone is not enough.',
            'Inclure la valeur de ma note dans les notifications de Notes. Sessio a besoin du résultat dans le courriel pour l’enregistrer automatiquement; un simple avis de publication ne suffit pas.',
          )}
        </p>
        <p>
          <strong>{choose('OFF:', 'DÉSACTIVÉ :')}</strong>{' '}
          {choose(
            'Allow future courses to send me notifications. Enable it only if you want messages before a course starts.',
            'Autoriser les cours à venir à m’envoyer des notifications. Activez-le uniquement si vous voulez recevoir des messages avant le début du cours.',
          )}
        </p>
      </div>
      <details className="space-y-3">
        <summary className="cursor-pointer font-medium text-primary">
          {choose(
            'Leave the other instant-notification boxes unchecked',
            'Laissez les autres notifications instantanées décochées',
          )}
        </summary>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {disabled.map(([en, fr]) => (
            <li key={en}>{choose(en, fr)}</li>
          ))}
        </ul>
      </details>
      <p className="text-sm">
        {choose(
          'Course-specific exceptions: enable Activity Feed posts, discussion mentions/subscriptions or ePortfolio feedback if your instructor uses them for important course work. Keep two-day deadline emails if those assessments are missing from Sessio or calendar sync is unreliable. This quieter setup assumes you also check Brightspace for course content.',
          'Exceptions selon le cours : activez les publications du Fil d’activité, les mentions/abonnements aux discussions ou la rétroaction ePortfolio si votre enseignant les utilise pour du travail important. Gardez les rappels d’échéance à deux jours si ces évaluations manquent dans Sessio ou si la synchronisation du calendrier est peu fiable. Cette configuration suppose que vous consultez aussi le contenu dans Brightspace.',
        )}
      </p>
      <p className="muted text-sm">
        {choose(
          'Sessio groups matching announcement and direct-email copies from the same course within three days, ignoring template headers and footers. You can open every original email. Changed content, grade notices, deadline-change notices and summaries remain separate; these settings still help reduce overlap.',
          'Sessio regroupe les annonces et courriels directs identiques du même cours reçus dans un délai de trois jours, sans tenir compte des en-têtes et pieds de page automatiques. Chaque original reste accessible. Les contenus modifiés, avis de notes, changements d’échéance et résumés restent séparés; ces paramètres réduisent encore les répétitions.',
        )}
      </p>
      <p className="text-sm">
        <a
          className="text-primary underline underline-offset-4"
          href="https://community.d2l.com/brightspace/kb/articles/17244-brightspace-notification-details"
          target="_blank"
          rel="noopener noreferrer"
        >
          {choose('D2L notification descriptions', 'Description des notifications D2L')}
        </a>
        {' · '}
        <a
          className="text-primary underline underline-offset-4"
          href="https://it.stonybrook.edu/help/kb/updating-your-notifications-settings-in-brightspace"
          target="_blank"
          rel="noopener noreferrer"
        >
          {choose(
            'Brightspace notification settings guide',
            'Guide des paramètres de notification Brightspace',
          )}
        </a>
      </p>
    </section>
  );
}
