export const gradeAssistantFrench = {
  averageFloorNote: (floor: string) =>
    ` Pour cette moyenne seulement, les notes de cours inférieures à ${floor} comptent comme ${floor}; les notes individuelles ne changent pas.`,
  guidelineNote: (school: string) =>
    ` Les conversions en lettres de ${school} sont des lignes directrices; l’enseignant décide, donc ce résultat est une estimation.`,
  passRulesNote: (defaultPercent: string, variants: string) =>
    ` La note de passage par défaut est ${defaultPercent}. Variantes selon le programme ou le type de cours : ${variants}. Vérifie laquelle s’applique; Command ne la devine pas.`,
};

export const french: Record<string, string> = {
  Account: 'Compte',
  'Signed in as': 'Connecté en tant que',
  'Local workspace': 'Espace de travail local',
  'Stored on this computer; no account needed.':
    'Enregistré sur cet ordinateur ; aucun compte requis.',
  'Settings sections': 'Sections des paramètres',
  'Who is signed in.': 'Le compte connecté.',
  'Profile & school': 'Profil et établissement',
  'Your name and the school that sets your grade scale.':
    'Votre nom et l’établissement qui fixe votre barème de notes.',
  'Theme, language and your study buddy.': 'Thème, langue et compagnon d’étude.',
  'Calendar & time': 'Calendrier et heure',
  'Time format, week start and calendar connections.':
    'Format de l’heure, début de semaine et calendriers connectés.',
  'Dates and your active term.': 'Les dates et votre session active.',
  'Grade notifications from your school.': 'Les avis de notes de votre établissement.',
  'Privacy & data': 'Confidentialité et données',
  'Export or erase your workspace.': 'Exporter ou effacer votre espace de travail.',
  'No school chosen': 'Aucun établissement choisi',
  '24-hour': '24 heures',
  '12-hour': '12 heures',
  'This copy of Command runs on your computer and keeps your data in its local database. There is no account to sign in to.':
    'Cette copie de Command fonctionne sur votre ordinateur et garde vos données dans sa base de données locale. Il n’y a aucun compte auquel se connecter.',
  'Signing out ends this session on this device.':
    'La déconnexion met fin à cette session sur cet appareil.',
  'This term': 'Cette session',
  average: 'de moyenne',
  '{count} course with grades': '{count} cours not\u00e9',
  '{count} courses with grades': '{count} cours not\u00e9s',
  'Weighted by {unit}.': 'Pond\u00e9r\u00e9e selon les {unit}.',
  '{courses}, using only work graded so far.':
    '{courses}, selon les travaux d\u00e9j\u00e0 corrig\u00e9s seulement.',
  'Courses count equally; no school is selected, so no letters or GPA are shown.':
    'Les cours comptent \u00e9galement ; aucun \u00e9tablissement n\u2019est choisi, donc aucune lettre ni MPC n\u2019est affich\u00e9e.',
  'Courses count equally; {school} reports averages, not a GPA.':
    'Les cours comptent \u00e9galement ; {school} publie des moyennes, pas une MPC.',
  'Courses count equally because {school} has no standard course weight.':
    'Les cours comptent \u00e9galement, car {school} n\u2019a pas de pond\u00e9ration de cours standard.',
  'Courses count equally. Add credits to every graded course to see your GPA.':
    'Les cours comptent \u00e9galement. Ajoutez les cr\u00e9dits de chaque cours not\u00e9 pour voir votre MPC.',
  'Courses count equally because {school} doesn\u2019t publish grade points for every letter.':
    'Les cours comptent \u00e9galement, car {school} ne publie pas de points pour chaque lettre.',
  'Grades below {floor} count as {floor} here, as {school} does; course grades don\u2019t change.':
    'Ici, les notes inf\u00e9rieures \u00e0 {floor} comptent comme {floor}, comme le fait {school} ; les notes des cours ne changent pas.',
  'Letters are estimates; your instructor decides.':
    'Les lettres sont des estimations ; votre enseignant ou enseignante d\u00e9cide.',
  'Choose your school': 'Choisir votre \u00e9tablissement',
  'Pass mark: {pass}.': 'Note de passage : {pass}.',
  'Usual pass mark: {pass}; some programs differ.':
    'Note de passage habituelle : {pass} ; certains programmes diff\u00e8rent.',
  'Which school do you attend?': 'Quel \u00e9tablissement fr\u00e9quentez-vous ?',
  'Search for your school': 'Rechercher votre \u00e9tablissement',
  'School name or province': 'Nom de l\u2019\u00e9tablissement ou province',
  'School name or short form, e.g. uOttawa':
    'Nom de l\u2019\u00e9tablissement ou abr\u00e9viation, p. ex. uOttawa',
  'No exact match. Closest schools:':
    'Aucune correspondance exacte. \u00c9tablissements les plus proches :',
  'Matching schools': '\u00c9tablissements correspondants',
  Schools: '\u00c9tablissements',
  Selected: 'S\u00e9lectionn\u00e9',
  'No listed school matches your search.':
    'Aucun \u00e9tablissement r\u00e9pertori\u00e9 ne correspond.',
  'Your school helps Command use the right grade scale and course weights.':
    'Votre \u00e9tablissement aide Command \u00e0 utiliser le bon bar\u00e8me et les bonnes pond\u00e9rations de cours.',
  'Save school': 'Enregistrer l\u2019\u00e9tablissement',
  'Choose school': 'Choisir un \u00e9tablissement',
  "My school isn't listed": 'Mon \u00e9tablissement n\u2019est pas dans la liste',
  'Dismiss school question': 'Fermer la question sur l\u2019\u00e9tablissement',
  'Unable to save your school. Please try again.':
    'Impossible d\u2019enregistrer votre \u00e9tablissement. Veuillez r\u00e9essayer.',
  'Could not save your school. Please try again.':
    'Impossible d\u2019enregistrer votre \u00e9tablissement. Veuillez r\u00e9essayer.',
  'YOUR SCHOOL, YOUR SCALE': 'VOTRE \u00c9TABLISSEMENT, VOTRE BAR\u00c8ME',
  'This helps Command use the right letter grades, GPA scale and course weights.':
    'Cela aide Command \u00e0 utiliser les bonnes notes en lettres, l\u2019\u00e9chelle de MPC et les bonnes pond\u00e9rations de cours.',
  'You can change this later in Settings.':
    'Vous pourrez modifier ce choix dans les r\u00e9glages.',
  School: '\u00c9tablissement',
  'Used for letter grades, GPA and default course weights.':
    'Utilis\u00e9 pour les notes en lettres, la MPC et les pond\u00e9rations de cours par d\u00e9faut.',
  'Clear school': 'Effacer l\u2019\u00e9tablissement',
  optional: 'facultatif',
  'Course weight (optional)': 'Pond\u00e9ration du cours (facultatif)',
  'Used to weight semester averages and GPA.':
    'Utilis\u00e9 pour pond\u00e9rer les moyennes de session et la MPC.',
  'Choose a supported school.': 'Choisissez un \u00e9tablissement pris en charge.',
  'Saving...': 'Enregistrement...',
  Continue: 'Continuer',
  Skip: 'Passer',
  'Account deletion and support': 'Suppression du compte et assistance',
  'Command is invitation only': 'Command est accessible sur invitation seulement',
  'Your email is verified, but this account has not been invited to Command. Contact support if you believe you should have access.':
    'Votre adresse courriel est vérifiée, mais ce compte n’a pas été invité à utiliser Command. Communiquez avec le soutien si vous croyez devoir y avoir accès.',
  'Your account is being deleted': 'Votre compte est en cours de suppression',
  'This workspace is unavailable while your account is being deleted. Contact support if you need help.':
    'Cet espace de travail est inaccessible pendant la suppression de votre compte. Communiquez avec le soutien si vous avez besoin d’aide.',
  'Access denied': 'Accès refusé',
  'Command could not confirm access to this workspace. Sign out and try again, or contact support if the problem continues.':
    'Command n’a pas pu confirmer l’accès à cet espace de travail. Déconnectez-vous et réessayez, ou communiquez avec le soutien si le problème persiste.',
  'Contact support': 'Communiquer avec le soutien',
  'Gmail connections are not available for this account yet.':
    'La connexion Gmail n’est pas encore disponible pour ce compte.',
  'AI is paused. Your planner is still available.':
    'L’IA est en pause. Ton agenda reste disponible.',
  'AI is busy. Please try again shortly.': 'L’IA est occupée. Réessaie dans un instant.',
  'AI allowances are not configured.':
    'Les limites d’utilisation de l’IA ne sont pas encore configurées.',
  'This AI model is not enabled.': 'Ce modèle d’IA n’est pas activé.',
  'AI allowance reached. Daily allowances reset at 00:00 UTC; monthly allowances reset on the first.':
    'Limite d’IA atteinte. La limite quotidienne est renouvelée à 00 h UTC, et la limite mensuelle le premier du mois.',
  'Command is currently available to invited accounts only.':
    'Command est actuellement réservé aux comptes invités.',
  'New accounts are currently available by invitation only.':
    'Les nouveaux comptes sont accessibles sur invitation uniquement.',
  'The syllabus reader connection is not configured.':
    'La connexion au lecteur de plans de cours n’est pas configurée.',

  'Unfinished tasks and assessments': 'Tâches et évaluations restant à terminer',
  'Matching emails grouped': 'Courriels identiques regroupés',
  'Same announcement, delivered more than once. The original emails stay in Gmail.':
    'Même annonce reçue plusieurs fois. Les originaux restent dans Gmail.',
  'Recommended Brightspace notifications': 'Notifications Brightspace recommandées',
  'Study & personal tasks': 'Étude et tâches personnelles',
  'Study reminders, preparation and your own to-dos.':
    'Rappels d’étude, préparation et tâches personnelles.',
  'Labs, assignments and exams. Check off finished work; grades stay in Grades.':
    'Laboratoires, devoirs et examens. Cochez le travail terminé; les résultats restent dans Notes.',
  'Assessment views': 'Vues des évaluations',
  'Assessment course': 'Cours des évaluations',
  'Search assessments': 'Rechercher des évaluations',
  'Search assessments…': 'Rechercher des évaluations…',
  'No assessments in this view.': 'Aucune évaluation dans cette vue.',
  'Unable to update this assessment. Please try again.':
    'Impossible de modifier cette évaluation. Réessayez.',
  'Automatic grade updates': 'Mises à jour automatiques des notes',
  'Saved automatically': 'Enregistrée automatiquement',
  'Already recorded': 'Déjà enregistrée',
  'View grades': 'Voir les notes',
  'Already in Grades. You can edit any result there. Recent email results are shown below.':
    'Déjà dans Notes. Vous pouvez y modifier chaque résultat. Les résultats récents reçus par courriel sont affichés ci-dessous.',
  'Email check finished. Clear grade matches are saved automatically.':
    'Vérification terminée. Les notes clairement associées à une évaluation sont enregistrées automatiquement.',
  'Allow Command to read matching emails and check every five minutes while the app is open. Clear assessment and score matches are saved automatically; uncertain results stay for review.':
    'Autoriser Command à lire les courriels pertinents toutes les cinq minutes pendant que l’application est ouverte. Les résultats clairement associés à une évaluation sont enregistrés automatiquement; les cas incertains restent à vérifier.',
  'Clear assessment and score matches go straight to Grades. Uncertain results and conflicts with manually entered grades stay for review. Checks cover the last 30 days initially, then recent updates, and stop when Command is closed.':
    'Les résultats clairement associés à une évaluation vont directement dans Notes. Les cas incertains et les conflits avec les notes saisies manuellement restent à vérifier. La recherche couvre les 30 derniers jours au départ, puis les nouveautés, et s’arrête lorsque Command est fermé.',
  Read: 'Lu',
  'Could not mark as read. Please try again.': 'Impossible de marquer comme lu. Réessayez.',
  'Notifications are marked as read after two seconds in view. Read messages stay here; assessment changes still need your confirmation.':
    'Les avis sont marqués comme lus après deux secondes à l’écran. Ils restent accessibles; les modifications d’évaluations nécessitent toujours votre confirmation.',
  'Open the email in Gmail to read the message.':
    'Ouvrez le courriel dans Gmail pour lire le message.',
  'Grade emails': 'Courriels de notes',
  Updates: 'Actualités',
  'School updates': 'Actualités scolaires',
  'Important course announcements and assessment changes from your school emails.':
    'Annonces importantes et changements aux évaluations reçus par courriel.',
  'Only grade results and grade-release notices appear here. Other course messages are in Updates.':
    'Seuls les résultats et avis de publication de notes apparaissent ici. Les autres messages sont dans Actualités.',
  'This search is combined with a school-notification filter. Only relevant grade notices, announcements and assessment changes are shown. Google permission still covers your mailbox.':
    'Cette recherche est combinée à un filtre scolaire. Seuls les avis de notes, annonces et changements pertinents sont affichés. L’autorisation Google couvre toujours votre boîte de réception.',
  'Use recommended filter': 'Utiliser le filtre recommandé',
  'Course notifications': 'Avis de cours',
  'Grades to review': 'Notes à vérifier',
  'No course announcements or assessment changes to review.':
    'Aucune annonce ni modification d’évaluation à vérifier.',
  'No grade emails to review. Grade-release notices can appear without a score; ordinary emails and lecture notes are excluded.':
    'Aucun courriel de notes à vérifier. Les avis de publication peuvent ne pas contenir de résultat; les courriels ordinaires et notes de cours sont exclus.',
  'Assessment change': 'Modification d’évaluation',
  Announcement: 'Annonce',
  'Review an assessment deadline': 'Vérifier une échéance d’évaluation',
  'Command can suggest explicit dates. Confirm the assessment, new date and time before saving. Cancellations, relative dates and other changes need your review; no assessment is changed automatically.':
    'Command peut proposer des dates explicites. Confirmez l’évaluation, la date et l’heure avant d’enregistrer. Les annulations, dates relatives et autres changements nécessitent votre vérification; aucune évaluation ne change automatiquement.',
  'Current deadline:': 'Échéance actuelle :',
  'Not set': 'Non définie',
  'New due date': 'Nouvelle date limite',
  'New due time': 'Nouvelle heure limite',
  'Times use your device time zone. Check any time zone stated in the email. Calendar sync can later replace dates linked to a calendar feed.':
    'Les heures utilisent le fuseau de votre appareil. Vérifiez le fuseau indiqué dans le courriel. La synchronisation du calendrier peut ensuite remplacer les dates liées à un flux.',
  'I checked the email and confirm this assessment and deadline.':
    'J’ai vérifié le courriel et je confirme cette évaluation et cette échéance.',
  'Save reviewed deadline': 'Enregistrer l’échéance vérifiée',
  'Mark as read': 'Marquer comme lu',
  'Assessment deadline updated. Your calendar and study reminders will use the new date.':
    'Échéance mise à jour. Le calendrier et les rappels d’étude utiliseront la nouvelle date.',
  'This deadline changed since you opened the review. Refresh and check it again.':
    'Cette échéance a changé depuis l’ouverture. Actualisez et vérifiez à nouveau.',
  'This email does not support that update.': 'Ce courriel ne permet pas cette modification.',
  'Reconnect Gmail': 'Reconnecter Gmail',
  'Reconnect the same Gmail account to keep your reviews. Disconnect first to switch accounts.':
    'Reconnectez le même compte Gmail pour conserver vos avis. Déconnectez-le d’abord pour changer de compte.',
  'Email updates': 'Mises à jour par courriel',
  'YOUR SCHOOL UPDATES, TOGETHER': 'VOS NOUVELLES SCOLAIRES AU MÊME ENDROIT',
  'Review grade notifications from the Gmail account receiving your school emails.':
    'Vérifiez les avis de notes du compte Gmail qui reçoit vos courriels scolaires.',
  'Back to grades': 'Retour aux notes',
  'Connect Gmail': 'Connecter Gmail',
  'Connected Gmail': 'Gmail connecté',
  'Loading your workspace…': 'Chargement de ton espace…',
  'Loading email connection…': 'Chargement de la connexion aux courriels…',
  'Unable to load email updates.': 'Impossible de charger les mises à jour par courriel.',
  'Unable to connect Gmail.': 'Impossible de connecter Gmail.',
  'Connecting…': 'Connexion…',
  'Checking…': 'Vérification…',
  'Gmail connection setup is not complete.':
    'La configuration de la connexion Gmail est incomplète.',
  'Set up Gmail for this local installation': 'Configurer Gmail pour cette installation locale',
  'Google grants read-only mailbox access. Command searches for matching school notifications, reads their text, and keeps the readable message text for review. It does not send email, change your inbox, download attachments, or send email to AI services.':
    'Google accorde un accès en lecture seule à votre boîte de réception. Command recherche les avis scolaires correspondants, lit leur texte et conserve le texte lisible du message à vérifier. Il n’envoie aucun courriel, ne modifie pas votre boîte de réception, ne télécharge pas les pièces jointes et ne transmet pas vos courriels à des services d’IA.',
  'Allow Command to read matching emails and check every five minutes while the app is open. I will review each grade before it is saved.':
    'Autoriser Command à lire les courriels correspondants et à vérifier toutes les cinq minutes lorsque l’application est ouverte. Je vérifierai chaque note avant son enregistrement.',
  'Gmail was not connected. Try again and allow read-only email access.':
    'Gmail n’a pas été connecté. Réessayez et autorisez l’accès en lecture seule aux courriels.',
  'Gmail connected. Your email updates are ready to check.':
    'Gmail est connecté. Vous pouvez maintenant vérifier vos courriels.',
  'Check emails now': 'Vérifier les courriels',
  'Last completed check:': 'Dernière vérification complète :',
  'Not checked yet': 'Pas encore vérifié',
  'More matching emails are available. Check again to continue the scan.':
    'D’autres courriels correspondent au filtre. Vérifiez à nouveau pour continuer.',
  'Checks cover the last 30 days initially, then recent updates. Grades only change after you review and save them. Local checks stop when Command is closed.':
    'La première vérification couvre les 30 derniers jours, puis les mises à jour récentes. Les notes changent seulement après votre vérification et votre enregistrement. Les vérifications locales s’arrêtent lorsque Command est fermé.',
  'Email preferences': 'Préférences des courriels',
  'Gmail search filter': 'Filtre de recherche Gmail',
  'Use Gmail search words or a label such as label:School. This filter limits what Command reads; Google permission still covers your mailbox.':
    'Utilisez des termes de recherche Gmail ou un libellé comme label:School. Ce filtre limite ce que Command lit ; l’autorisation Google couvre toujours votre boîte de réception.',
  'Check automatically while Command is open':
    'Vérifier automatiquement lorsque Command est ouvert',
  'Save email preferences': 'Enregistrer les préférences des courriels',
  'Disconnect Gmail': 'Déconnecter Gmail',
  'Disconnect Gmail and delete its saved email reviews? Grades you already saved will stay.':
    'Déconnecter Gmail et supprimer les avis enregistrés ? Les notes déjà enregistrées seront conservées.',
  'Disconnect and delete reviews': 'Déconnecter et supprimer les avis',
  'Email reviews': 'Vérification des courriels',
  'Ready to review': 'À vérifier',
  'No email updates to review yet. A notification may only say a grade is available; it cannot reveal a score that is not in the email.':
    'Aucun avis à vérifier pour le moment. Un avis peut seulement annoncer la disponibilité d’une note ; il ne peut pas révéler un résultat absent du courriel.',
  'Open in Gmail': 'Ouvrir dans Gmail',
  'Show email message': 'Afficher le message',
  'Only part of this message could be imported. Open in Gmail to read the complete email.':
    'Seule une partie du message a pu être importée. Ouvrez Gmail pour lire le courriel complet.',
  'Show email excerpt': 'Afficher l’extrait du courriel',
  'No clear score found. Open the email or Brightspace, then enter the result if available.':
    'Aucun résultat clair trouvé. Ouvrez le courriel ou Brightspace, puis saisissez le résultat s’il est disponible.',
  'Assessment to update': 'Évaluation à mettre à jour',
  'Choose an assessment': 'Choisir une évaluation',
  'Currently recorded:': 'Résultat actuel :',
  'Saving will replace this score.': 'L’enregistrement remplacera ce résultat.',
  'Save reviewed grade': 'Enregistrer la note vérifiée',
  Dismiss: 'Ignorer',
  'Connect Gmail and review grade notifications from your school.':
    'Connectez Gmail et vérifiez les avis de notes de votre établissement.',
  'Email check finished. Review any updates below.':
    'Vérification terminée. Consultez les mises à jour ci-dessous.',
  'Email preferences saved.': 'Préférences des courriels enregistrées.',
  'Grade saved from your email review.': 'Note enregistrée après vérification du courriel.',
  'Gmail disconnected. Imported grades are kept.':
    'Gmail déconnecté. Les notes importées sont conservées.',
  'Gmail disconnected locally. You can also remove Command in your Google account connections.':
    'Gmail déconnecté localement. Vous pouvez aussi retirer Command des connexions de votre compte Google.',
  'Reconnect Gmail to continue checking emails.':
    'Reconnectez Gmail pour continuer à vérifier les courriels.',
  'Gmail is unavailable. Please try again later.':
    'Gmail est indisponible. Veuillez réessayer plus tard.',
  'Reconnect Gmail or check that Gmail API access is enabled.':
    'Reconnectez Gmail ou vérifiez que l’accès à l’API Gmail est activé.',
  'This grade changed since you opened the review. Refresh and check it again.':
    'Cette note a changé depuis l’ouverture de la vérification. Actualisez et vérifiez à nouveau.',
  'This email update was already reviewed.': 'Cet avis a déjà été vérifié.',
  'Open Command at the address configured for Gmail before connecting.':
    'Ouvrez Command à l’adresse configurée pour Gmail avant de vous connecter.',
  'Syllabus imported': 'Plan de cours importé',
  'No saved syllabus import': 'Aucune importation de plan de cours enregistrée',
  'Last saved:': 'Dernier enregistrement :',
  'Earlier import detected; date not recorded.':
    'Importation antérieure détectée ; date non enregistrée.',
  'Reading your syllabus…': 'Lecture de votre plan de cours…',
  'Take the guided tour': 'Faire la visite guidée',
  'YOUR SPACE, AT YOUR PACE': 'VOTRE ESPACE, À VOTRE RYTHME',
  'Welcome to Command.': 'Bienvenue dans Command.',
  'Your courses, deadlines and study plans, with a little more breathing room.':
    'Vos cours, vos échéances et vos plans d’étude, avec un peu plus de tranquillité.',
  'Let’s get comfortable, one step at a time.': 'Prenons nos repères, une étape à la fois.',
  'Five short stops. Go at your own pace, or skip anytime.':
    'Cinq courtes étapes. Avancez à votre rythme ou passez la visite.',
  'Show me around': 'Me faire découvrir',
  'I’ll explore on my own': 'Je préfère explorer',
  'Setup takes about two minutes, and you can skip any step.':
    'La configuration prend environ deux minutes, et vous pouvez passer chaque étape.',
  'YOUR SEMESTER, READY': 'VOTRE SESSION, PRÊTE',
  'Bring in your courses and deadlines': 'Importez vos cours et vos échéances',
  'Paste your Brightspace calendar link and Command creates your term, courses and deadlines for you.':
    'Collez le lien de votre calendrier Brightspace et Command crée votre session, vos cours et vos échéances pour vous.',
  'Skip for now': 'Passer pour l’instant',
  'Import a syllabus instead': 'Importer plutôt un plan de cours',
  'AI features are for people 18 or older': 'Les fonctions d’IA sont réservées aux 18 ans et plus',
  'Ask Command and syllabus reading use Google Gemini, which may only be used by people 18 or older. Everything else in Command works at any age.':
    'Ask Command et la lecture des plans de cours utilisent Google Gemini, qui ne peut être utilisé que par des personnes de 18 ans ou plus. Tout le reste de Command fonctionne à tout âge.',
  'I’m 18 or older': 'J’ai 18 ans ou plus',
  'Could not save your confirmation. Please try again.':
    'Impossible d’enregistrer votre confirmation. Veuillez réessayer.',
  'Confirm that you are 18 or older to use Ask Command and syllabus reading.':
    'Confirmez que vous avez 18 ans ou plus pour utiliser Ask Command et la lecture des plans de cours.',
  'Add grade weights from a syllabus': 'Ajouter les pondérations à partir d’un plan de cours',
  'You can connect or change this later in Settings → Calendar.':
    'Vous pourrez le connecter ou le modifier plus tard dans Paramètres → Calendrier.',
  'A little tour': 'Petite visite',
  'Skip tour': 'Passer la visite',
  'Previous step': 'Étape précédente',
  'Ready to begin': 'Prêt à commencer',
  'Could not save your tour preference. Please try again.':
    'Impossible d’enregistrer votre préférence. Veuillez réessayer.',
  'Start with your courses': 'Commencez par vos cours',
  'Keep each subject in one place. Add a course yourself, or import a syllabus to find its assessments and dates. You can set up your term here too.':
    'Gardez chaque matière au même endroit. Ajoutez un cours ou importez un plan de cours pour trouver ses évaluations et leurs dates. Vous pouvez aussi configurer votre session ici.',
  'No need to add anything during this tour.': 'Vous n’avez rien à ajouter pendant la visite.',
  'See what is coming up': 'Voyez ce qui s’en vient',
  'Your calendar brings classes, assessments and personal events together. Connect your Brightspace calendar to bring in deadlines automatically.':
    'Votre calendrier rassemble les cours, les évaluations et les événements personnels. Connectez votre calendrier Brightspace pour importer les échéances automatiquement.',
  'You can connect it later, whenever you are ready.':
    'Vous pourrez le connecter plus tard, quand vous le souhaiterez.',
  'Plan one small step': 'Planifiez une petite étape',
  'Tasks are your own plans: study a chapter, prepare a report or practise a problem. Check them off as you go. Assignments and exams stay in assessments.':
    'Les tâches sont vos propres plans : étudier un chapitre, préparer un rapport ou faire un exercice. Cochez-les au fur et à mesure. Les devoirs et examens restent dans les évaluations.',
  'A study task appears when a quiz or exam is within 10 days.':
    'Une tâche d’étude apparaît quand un quiz ou examen est prévu dans les 10 prochains jours.',
  'Keep track of your progress': 'Suivez vos progrès',
  'Enter grades when they arrive. Assessments you mark Completed stay on the awaiting-grades list until you record a score.':
    'Saisissez vos notes quand elles arrivent. Les évaluations marquées Terminées restent en attente d’une note jusqu’à ce que vous saisissiez un résultat.',
  'Your grades are only calculated from the results you enter.':
    'Vos moyennes sont calculées uniquement à partir des résultats saisis.',
  'Come back to one clear focus': 'Retrouvez une priorité claire',
  'Start here when you open Command. Your focus shows the work to do next and study reminders for upcoming quizzes and exams.':
    'Commencez ici en ouvrant Command. Votre priorité montre le travail à venir et les rappels d’étude pour les prochains quiz et examens.',
  'You can replay this tour anytime from the User guide.':
    'Vous pouvez refaire cette visite à tout moment depuis le Guide d’utilisation.',

  'Choose a PDF, DOCX, JPG, PNG or TXT file. For older .doc files, save as .docx or PDF.':
    'Choisissez un PDF, DOCX, JPG, PNG ou TXT. Pour un ancien fichier .doc, enregistrez-le en .docx ou PDF.',
  'Upload syllabus (PDF, DOCX, JPG, PNG or TXT, up to':
    'Importer un plan (PDF, DOCX, JPG, PNG ou TXT, jusqu’à',
  'PDFs up to 60 pages; Word (.docx) documents; JPG/PNG photos or screenshots; and TXT files. Choose one file, then click Read syllabus. Use clear images with the full page visible.':
    'PDF jusqu’à 60 pages ; documents Word (.docx) ; photos ou captures JPG/PNG ; fichiers TXT. Choisissez un fichier, puis cliquez sur Lire le plan de cours. Utilisez une image nette montrant toute la page.',
  'Word text, tables and embedded JPG/PNG images were read. Page numbers and exact layout are unavailable; check complex layouts against the original or import a PDF.':
    'Le texte, les tableaux et les images JPG/PNG du document Word ont été lus. Les numéros de page et la disposition exacte sont indisponibles ; vérifiez les mises en page complexes ou importez un PDF.',
  'Some embedded images use unsupported formats. Export this Word document to PDF to include them.':
    'Certaines images intégrées utilisent un format non pris en charge. Exportez ce document Word en PDF pour les inclure.',

  'Study ahead': 'Préparer les évaluations',
  'Next 10 days': 'Les 10 prochains jours',

  'Check this when the task is finished, then save your changes. Uncheck it to put the task back in progress.':
    'Cochez cette case lorsque la tâche est terminée, puis enregistrez vos modifications. Décochez-la pour remettre la tâche en cours.',
  'If the provider is temporarily busy, Command retries automatically. Keep this page open.':
    'Si le fournisseur est temporairement occupé, Command réessaie automatiquement. Gardez cette page ouverte.',
  'This group replaces the individual weight above.':
    'Ce groupe remplace la pondération individuelle ci-dessus.',
  'Not currently counted': 'Non retenu pour le moment',
  'Dropped by grading rule': 'Exclu selon la règle de notation',
  'Grading rules saved.': 'Règles de notation enregistrées.',
  'Unable to save grading rules.': 'Impossible d’enregistrer les règles de notation.',
  'Instructor instructions and grading rules': 'Consignes du professeur et règles de notation',
  'Add something your instructor said that is missing from the syllabus. Best-of rules are interpreted on this device; your note is not sent to an AI service.':
    'Ajoutez une consigne donnée en classe qui ne figure pas dans le plan de cours. Les règles des meilleurs résultats sont interprétées sur cet appareil ; votre note n’est pas envoyée à un service d’IA.',
  'Extra instructor instructions': 'Consignes supplémentaires du professeur',
  'Example: Best 4 of 5 quizzes count. Quizzes are worth 20% combined.':
    'Exemple : Les 4 meilleurs quiz sur 5 comptent. Les quiz valent 20 % au total.',
  'A saved note alone does not change grades. Add and confirm a rule below to change calculations.':
    'Une note seule ne change pas les calculs. Ajoutez et confirmez une règle ci-dessous.',
  'Review a best-of rule': 'Vérifier une règle des meilleurs résultats',
  'Best-of group': 'Groupe des meilleurs résultats',
  Assignments: 'Devoirs',
  Projects: 'Projets',
  'Expand a group to view or enter its grades.':
    'Dépliez un groupe pour consulter ou saisir ses notes.',
  'Choose a course, then expand a group to enter your score and the total possible points. Save the grade when ready. Edit details lets you adjust the assessment weight.':
    'Choisissez un cours, puis dépliez un groupe pour saisir votre note et le total des points possibles. Enregistrez la note lorsque vous avez terminé. Modifier les détails permet de changer la pondération.',
  'Edit grade': 'Modifier la note',
  'Not graded': 'Non noté',
  'group weight': 'pour le groupe',
  weight: 'de pondération',
  'Update the name, score, or weight.': 'Modifiez le nom, la note ou la pondération.',
  'Leave the score blank if it has not been graded.':
    'Laissez la note vide si elle n’a pas encore été attribuée.',
  'This weight is managed by the course grading rule.':
    'Cette pondération est gérée par la règle de notation du cours.',
  'Your results, course by course.': 'Vos résultats, cours par cours.',
  'Expand a group to view its grades.': 'Dépliez un groupe pour consulter ses notes.',
  'Use Edit to update a grade. A blank score means ungraded, not zero.':
    'Utilisez Modifier pour changer une note. Une note vide signifie non noté, pas zéro.',
  'Choose a course and expand a group to see your grades. Use Edit to change a name, score or weight.':
    'Choisissez un cours et dépliez un groupe pour voir vos notes. Utilisez Modifier pour changer un nom, une note ou une pondération.',
  'Other courses': 'Autres cours',
  'Add a course to start tracking your grades.':
    'Ajoutez un cours pour commencer à suivre vos notes.',
  'Pick a course card to see its grades. Search by course name or code; other terms and archived courses are under Other courses.':
    'Choisissez une carte de cours pour voir ses notes. Recherchez un nom ou un code ; les autres sessions et les cours archivés sont sous Autres cours.',
  'so far': 'à ce jour',
  'Score needed on each remaining assessment': 'Note nécessaire à chaque évaluation restante',
  'Planning estimate: assumes the same percentage on all remaining work. Your best scores are kept automatically.':
    'Estimation : suppose le même pourcentage pour tous les travaux restants. Vos meilleurs résultats sont retenus automatiquement.',
  'Assumes the same percentage on every remaining assessment, including unconfigured course weight. Best-of rules replace lower scores automatically. Different combinations of scores can also reach your target.':
    'Suppose le même pourcentage à chaque évaluation restante, y compris la pondération non configurée. Les règles des meilleurs résultats remplacent automatiquement les notes inférieures. D’autres combinaisons de notes peuvent aussi atteindre votre objectif.',
  'Deleted courses': 'Cours supprimés',
  Restore: 'Restaurer',
  'Delete permanently': 'Supprimer définitivement',
  'No deleted courses.': 'Aucun cours supprimé.',
  'Course permanently deleted.': 'Cours supprimé définitivement.',
  'Course restored to its original term.': 'Cours restauré dans sa session d’origine.',
  'This moves the course and its linked work to Deleted courses. It will disappear from your workspace, but you can restore it from the Courses page.':
    'Ce cours et ses éléments associés seront déplacés vers les cours supprimés. Ils disparaîtront de votre espace de travail, mais vous pourrez les restaurer depuis la page Cours.',
  'Deleted courses keep their grades, assessments and linked work until you restore them or delete them permanently. They do not appear in your calendar, tasks or grades.':
    'Les cours supprimés conservent leurs notes, évaluations et éléments associés jusqu’à leur restauration ou leur suppression définitive. Ils n’apparaissent pas dans votre calendrier, vos tâches ou vos notes.',
  'A matching course is in Deleted courses. Restore it on the Courses page before importing its syllabus.':
    'Un cours correspondant se trouve dans les cours supprimés. Restaurez-le sur la page Cours avant d’importer son plan de cours.',
  'Move this course to Deleted courses before deleting it permanently.':
    'Déplacez ce cours dans les cours supprimés avant de le supprimer définitivement.',
  'Delete course': 'Supprimer le cours',
  'Deleting…': 'Suppression…',
  'Could not delete this course.': 'Impossible de supprimer ce cours.',
  'This permanently removes this course and its assessments, grades, class schedule, linked tasks and calendar events. This cannot be undone.':
    'Cette action supprime définitivement ce cours ainsi que ses évaluations, notes, horaires, tâches liées et événements du calendrier. Elle est irréversible.',
  'A matching course already exists. Choose the existing course before saving; no new course was created.':
    'Un cours correspondant existe déjà. Choisissez le cours existant avant d’enregistrer ; aucun nouveau cours n’a été créé.',
  'Matched your existing course. Review the updates below; a second course will not be created.':
    'Votre cours existant a été reconnu. Vérifiez les mises à jour ci-dessous ; aucun deuxième cours ne sera créé.',
  'A matching course already exists. Use it to avoid creating a duplicate.':
    'Un cours correspondant existe déjà. Utilisez-le pour éviter de créer un doublon.',
  'Use existing course': 'Utiliser le cours existant',
  'Unarchive this course first to import into it.':
    'Désarchivez ce cours avant d’y importer un plan de cours.',
  Quizzes: 'Quiz',
  Labs: 'Laboratoires',
  'I could not turn that note into a best-of rule. Use the fields below, or keep it as a note. Other instructions do not change calculations automatically.':
    'Cette note n’a pas pu être convertie en règle. Utilisez les champs ci-dessous ou gardez-la comme note. Les autres consignes ne changent pas automatiquement les calculs.',
  'Review the assessments, combined weight and equal-weight calculation below. Nothing is applied until you add the rule.':
    'Vérifiez les évaluations, la pondération totale et le calcul à poids égaux ci-dessous. Rien n’est appliqué avant l’ajout de la règle.',
  'Choose the full assessment group, a smaller number to count, and a combined weight above 0%.':
    'Sélectionnez le groupe complet, un nombre inférieur de résultats à retenir et une pondération totale supérieure à 0 %.',
  'Rule added to this review. Save your changes to keep it.':
    'Règle ajoutée à la vérification. Enregistrez vos changements pour la conserver.',
  'Group name': 'Nom du groupe',
  'Number of best scores to count': 'Nombre de meilleurs résultats à retenir',
  'Combined course weight (%)': 'Pondération totale du groupe (%)',
  'Assessments in this group': 'Évaluations de ce groupe',
  'This rule averages the highest score percentages equally and gives the group its combined weight. It replaces the individual weights for these assessments. Ungraded scores stay unknown; enter 0 only for a confirmed zero.':
    'Cette règle fait la moyenne à poids égaux des meilleurs pourcentages, puis applique la pondération totale du groupe. Elle remplace les pondérations individuelles. Les résultats non reçus restent inconnus ; entrez 0 seulement pour un zéro confirmé.',
  'Confirm and add rule': 'Confirmer et ajouter la règle',
  Best: 'Meilleurs résultats',
  'Remove rule': 'Retirer la règle',
  'Missing assessment': 'Évaluation manquante',
  'Individual assessment weights are ignored while this rule is active. Removing it restores those weights.':
    'Les pondérations individuelles sont ignorées lorsque cette règle est active. Retirer la règle rétablit ces pondérations.',
  'Save grading rules': 'Enregistrer les règles',
  'Best-of groups use the highest recorded percentages so far. Manage rules in the course Grades tab.':
    'Les groupes utilisent les meilleurs pourcentages reçus jusqu’à présent. Gérez les règles dans l’onglet Notes du cours.',
  'This assessment uses a best-of group. Its individual weight is ignored while that rule is active. Manage it in the course Grades tab.':
    'Cette évaluation fait partie d’un groupe de meilleurs résultats. Sa pondération individuelle est ignorée tant que la règle est active. Gérez-la dans l’onglet Notes du cours.',

  'Confirm your sessions': 'Confirmez vos séances',
  'Choose your sections to turn scheduled weeks into dates. Nothing is saved until you review and save the assessments.':
    'Choisissez vos sections pour convertir les semaines prévues en dates. Rien n’est enregistré avant votre vérification et l’enregistrement des évaluations.',
  'Lecture section': 'Section de cours',
  'Tutorial section': 'Section de tutorat',
  'Lab section': 'Section de laboratoire',
  'Choose your section': 'Choisissez votre section',
  'Confirm session dates': 'Confirmer les dates des séances',
  'Only unambiguous dates are filled. Holidays, multiple possible sessions and unknown weeks need your review below. Dates you entered manually are preserved.':
    'Seules les dates sans ambiguïté sont remplies. Vérifiez ci-dessous les jours fériés, les séances multiples et les semaines inconnues. Vos dates saisies manuellement sont conservées.',
  'Scheduled session': 'Séance prévue',
  'Confirm a session date': 'Confirmez une date de séance',
  'Choose a session, or enter a date manually':
    'Choisissez une séance ou saisissez une date manuellement',
  'Schedule conflict': 'Conflit d’horaire',
  'A date cannot be calculated yet. Check the course code, session and week, or enter a date manually.':
    'La date ne peut pas encore être calculée. Vérifiez le code du cours, la séance et la semaine, ou saisissez une date manuellement.',
  'Date inferred from your confirmed session. Check it against course announcements.':
    'Date déduite de votre séance confirmée. Vérifiez les annonces du cours.',
  'Some sessions overlap a holiday or break. Confirm any exception with your instructor before entering a date manually.':
    'Certaines séances coïncident avec un jour férié ou une pause. Confirmez toute exception auprès de votre professeur avant de saisir une date manuellement.',
  'View schedule evidence': 'Voir la source de l’horaire',
  'Session dates confirmed:': 'Dates de séances confirmées :',
  'Review the remaining rows below.': 'Vérifiez les autres évaluations ci-dessous.',
  'Tentative schedule — check course announcements.':
    'Horaire provisoire — vérifiez les annonces du cours.',
  'Duration:': 'Durée :',
  minutes: 'minutes',
  'Choose your session below to confirm a date, or leave it undated.':
    'Choisissez votre séance ci-dessous pour confirmer une date, ou laissez la date vide.',
  'The session is known, but its calendar week needs confirmation.':
    'La séance est connue, mais sa semaine doit être confirmée.',
  'Time unknown': 'Heure inconnue',

  'The AI provider is temporarily unavailable or busy. Please try again later. Nothing was saved.':
    'Le fournisseur d’IA est temporairement indisponible ou occupé. Réessayez plus tard. Rien n’a été enregistré.',

  'Read syllabus': 'Lire le plan de cours',
  'Your file stays on this device until you click Read syllabus.':
    'Votre fichier reste sur cet appareil jusqu’à ce que vous cliquiez sur Lire le plan de cours.',
  'Open in Brightspace': 'Ouvrir dans Brightspace',
  '(opens in a new tab)': '(s’ouvre dans un nouvel onglet)',
  'The AI reader could not finish this request. Please try again later. Nothing was saved.':
    'Le lecteur IA n’a pas pu terminer cette demande. Réessayez plus tard. Rien n’a été enregistré.',

  Home: 'Accueil',
  Courses: 'Cours',
  Tasks: 'Tâches',
  Calendar: 'Calendrier',
  Grades: 'Notes',
  Settings: 'Paramètres',
  Workspace: 'Espace de travail',
  'A little more clarity.': 'Un peu plus de clarté.',
  'Quick add': 'Ajout rapide',
  'Your workspace': 'Votre espace',
  'Main navigation': 'Navigation principale',
  'This semester': 'Cette session',
  'View courses': 'Voir les cours',
  'User guide': 'Guide d’utilisation',
  "One day at a time. You've got this.": 'Un jour à la fois. Vous y arriverez.',
  '% through the semester': '% de la session écoulée',
  'Skip to content': 'Aller au contenu',
  'Open navigation': 'Ouvrir la navigation',
  'Personal workspace': 'Espace personnel',
  'Search your workspace': 'Rechercher dans votre espace',
  'Toggle color theme': 'Changer le thème',
  'Personal settings': 'Paramètres personnels',
  Navigation: 'Navigation',
  'Navigate your personal workspace.': 'Naviguez dans votre espace personnel.',
  Name: 'Nom',
  '(optional)': '(facultatif)',
  Email: 'Courriel',
  Terms: 'Conditions d’utilisation',
  and: 'et',
  'Privacy policy': 'Politique de confidentialité',
  'Forgot your password?': 'Mot de passe oublié ?',
  'New to Command?': 'Vous découvrez Command ?',
  'Create an account': 'Créer un compte',
  'Back to sign in': 'Retour à la connexion',
  'Sign in': 'Se connecter',
  'Sign out': 'Se déconnecter',
  'Welcome back': 'Heureux de vous revoir',
  'Sign in to pick up where you left off.': 'Connectez-vous pour reprendre où vous en étiez.',
  Password: 'Mot de passe',
  'Connect your calendar': 'Connecter votre calendrier',
  'Paste your Brightspace subscription link. Course deadlines become assessments, without duplicating translated entries.':
    'Collez votre lien d’abonnement Brightspace. Les échéances deviennent des évaluations, sans doubler les entrées traduites.',
  'Calendar subscription link': 'Lien d’abonnement au calendrier',
  'Calendar privacy details': 'Confidentialité du calendrier',
  'Preview calendar': 'Aperçu du calendrier',
  'Calendar changes save here separately from your preferences.':
    'Le calendrier s’enregistre ici, séparément de vos préférences.',
  'Import dates:': 'Dates à importer :',
  to: 'au',
  From: 'Du',
  Through: 'Au',
  'Starts with the current term so old courses stay out. Sync uses this range until you reconnect with different dates.':
    'La période commence par la session actuelle. La synchronisation utilise ces dates jusqu’à ce que vous les changiez en reconnectant le calendrier.',
  'courses ?': 'cours ?',
  'deadlines ?': 'échéances ?',
  'other events in this date range': 'autres événements dans cette période',
  'No events in these dates. Expand the import dates and preview again.':
    'Aucun événement dans cette période. Élargissez les dates et réessayez.',
  'Calendar import preview': 'Aperçu de l’importation',
  'Showing the first 100 of': 'Affichage des 100 premières entrées sur',
  'entries.': 'entrées.',
  'Connect and import': 'Connecter et importer',
  'View calendar': 'Voir le calendrier',
  'imported entries ?': 'entrées importées ?',
  'Sync now': 'Synchroniser',
  Disconnect: 'Déconnecter',
  'Forget link': 'Oublier le lien',
  'Forget this calendar link?': 'Oublier ce lien de calendrier ?',
  'The saved private URL and sync mapping for':
    'Le lien privé et les références de synchronisation de',
  'will be deleted. Imported courses and entries stay in your workspace. Reconnecting after this may create duplicates.':
    'seront supprimés. Les cours et entrées importés restent dans votre espace. Une reconnexion peut créer des doublons si leur source ne peut pas être identifiée.',
  Cancel: 'Annuler',
  'Forget saved link': 'Oublier le lien enregistré',
  'Save calendar': 'Enregistrer le calendrier',
  'Saving calendar?': 'Enregistrement du calendrier…',
  'Connecting?': 'Connexion…',
  'MAKE ROOM FOR WHAT MATTERS': 'FAITES PLACE à L’ESSENTIEL',
  'Your calendar': 'Votre calendrier',
  'Classes, deadlines, and a little life in between.':
    'Les cours, les échéances et un peu de vie entre les deux.',
  'Connect calendar': 'Connecter un calendrier',
  'Add event': 'Ajouter un événement',
  this: 'ce',
  Today: 'Aujourd’hui',
  Tomorrow: 'Demain',
  Yesterday: 'Hier',
  Month: 'Mois',
  Week: 'Semaine',
  month: 'mois',
  week: 'semaine',
  'Calendar view': 'Vue du calendrier',
  Show: 'Afficher',
  Everything: 'Tout',
  'Personal only': 'Personnel seulement',
  'Show completed': 'Afficher les éléments terminés',
  'Times shown in your local time zone': 'Heures affichées dans votre fuseau horaire',
  'Selected day agenda': 'Agenda du jour sélectionné',
  'DAY AT A GLANCE': 'VOTRE JOURNÉE',
  Task: 'Tâche',
  Assessment: 'Évaluation',
  Event: 'Événement',
  Class: 'Cours',
  'A little room in your day': 'Un peu de place dans votre journée',
  'Swipe the calendar sideways to see all seven days.':
    'Faites glisser le calendrier pour voir les sept jours.',
  'A little breathing room': 'Un peu de répit',
  'Command palette': 'Palette de commandes',
  'Search, navigate, or add something to your workspace.':
    'Recherchez, naviguez ou ajoutez un élément à votre espace.',
  'Search commands': 'Rechercher une commande',
  'What would you like to do?': 'Que souhaitez-vous faire ?',
  Commands: 'Commandes',
  'No matches. Try a course code or task name.':
    'Aucun résultat. Essayez un code de cours ou un nom de tâche.',
  'Your next step, one shortcut away': 'La prochaine étape, à portée de raccourci',
  Archived: 'Archivé',
  'Current grade': 'Note actuelle',
  '% graded': '% évalué',
  'Next assessment:': 'Prochaine Évaluation :',
  'Course not found': 'Cours introuvable',
  'It may have been removed from your workspace.': 'Il a peut-être été supprimé de votre espace.',
  'Back to courses': 'Retour aux cours',
  'All courses': 'Tous les cours',
  'Import syllabus': 'Importer un plan de cours',
  'Edit course': 'Modifier le cours',
  'Course sections': 'Sections du cours',
  'Coming up next': 'À venir',
  'View all': 'Tout voir',
  'Your weekly rhythm': 'Votre rythme hebdomadaire',
  Manage: 'Gérer',
  'Build your weekly rhythm': 'Organisez votre semaine',
  'On your to-do list': 'Sur votre liste',
  open: 'À faire',
  for: 'pour',
  'Add task': 'Ajouter une tâche',
  'View all tasks ?': 'Voir toutes les tâches ?',
  Assessments: 'évaluations',
  'Every deadline and deliverable, in one place.':
    'Toutes les échéances et les remises au même endroit.',
  'Add assessment': 'Ajouter une Évaluation',
  'Your course starts here': 'Votre cours commence ici',
  'Weighted average of graded assessments only.':
    'Moyenne pondérée des évaluations notées seulement.',
  'Course graded': 'Part du cours évaluée',
  'Course weight graded': 'Pondération évaluée',
  'Earned toward final grade': 'Points acquis pour la note finale',
  '/ 100 points': '/ 100 points',
  'of the course remains ungraded.': 'du cours reste à évaluer.',
  'Due date': 'Échéance',
  Weight: 'Pondération',
  Score: 'Résultat',
  'Final grade contribution': 'Contribution à la note finale',
  Status: 'État',
  Actions: 'Actions',
  Unscheduled: 'Sans date',
  'Plan your finish': 'Planifiez la suite',
  'Choose your target final grade to see the weighted average you need on the remaining course work.':
    'Choisissez votre note finale cible pour voir la moyenne pondérée nécessaire sur le travail restant.',
  'Target final grade (%)': 'Note finale cible (%)',
  'Enter a target grade to calculate your next step.':
    'Entrez une note cible pour calculer la suite.',
  'Your gradebook': 'Votre carnet de notes',
  'of course weight configured.': 'de la pondération du cours définie.',
  'Every bit of progress counts': 'Chaque progrès compte',
  'Weekly schedule': 'Horaire hebdomadaire',
  'Recurring sessions': 'Séances récurrentes',
  'Add class session': 'Ajouter une séance',
  'Give your week some structure': 'Structurez votre semaine',
  'A little space to think': 'Un espace pour réfléchir',
  'Course links, office hours, ideas, and things to remember.':
    'Liens du cours, heures de bureau, idées et rappels.',
  'Course notes': 'Notes du cours',
  'Start writing. This space is yours?': 'Commencez à écrire. Cet espace est à vous…',
  'Notes saved': 'Notes enregistrées',
  'You have unsaved changes.': 'Certaines modifications ne sont pas enregistrées.',
  'A place for every subject': 'UNE PLACE POUR CHAQUE MATIÈRE',
  'Your courses': 'Vos cours',
  'Keep the big picture in view, and the details in their place.':
    'Gardez une vue d’ensemble, sans perdre les détails.',
  'Manage terms': 'Gérer les sessions',
  'Add course': 'Ajouter un cours',
  'Search courses': 'Rechercher des cours',
  'Find a course?': 'Trouver un cours…',
  'Filter by semester': 'Filtrer par session',
  'All semesters': 'Toutes les sessions',
  'Show archived': 'Afficher les cours archivés',
  'in your workspace': 'dans votre espace',
  'Current grades reflect only graded work, weighted by its contribution to the course.':
    'Les notes actuelles reflètent uniquement le travail évalué, selon sa pondération dans le cours.',
  "A clear mind starts with a clear day. Let's make it a good one.":
    'Une journée bien organisée pour avoir l’esprit tranquille.',
  'Enter grades': 'Saisir les notes',
  'Add a task': 'Ajouter une tâche',
  'completed assessments': 'évaluations terminées',
  'are waiting for a grade. Keep track of them in Grades.':
    'attendent une note. Retrouvez-les dans Notes.',
  'Your focus': 'Vos priorités',
  'All tasks': 'Toutes les tâches',
  'Today & overdue': 'Aujourd’hui et en retard',
  Upcoming: 'À venir',
  Overdue: 'En retard',
  'A little breathing room.': 'Un peu de répit.',
  'Add something to focus on': 'Ajouter une priorité',
  "Today's schedule": 'Horaire du jour',
  'Your schedule is open today.': 'Aucune séance prévue aujourd’hui.',
  'Plan something': 'Planifier une activité',
  'See your week': 'Voir votre semaine',
  "Room for what's next": 'De la place pour la suite',
  'Your workload over the next 7 days': 'Votre charge de travail des 7 prochains jours',
  due: 'À remettre',
  'Tasks and assessments due each day': 'Tâches et évaluations à remettre chaque jour',
  'Next assessment': 'Prochaine Évaluation',
  '% weight': '% de pondération',
  'Small steps. Steady progress.': 'Un pas à la fois. Des progrès constants.',
  'Leave a little space in your day for yourself.':
    'Gardez un peu de temps pour vous dans votre journée.',
  'Your semester, at a glance': 'Votre session en un coup d’œil',
  'Bring your semester into focus.': 'Organisez votre session.',
  'A little more organized. A little more you.':
    'Un peu plus d’organisation. Un espace à votre image.',
  'Your personal workspace': 'Votre espace personnel',
  'Deadlines ahead': 'Échéances à venir',
  overdue: 'en retard',
  '% of grade': '% de la note',
  'No deadlines on the horizon.': 'Aucune Échéance en vue.',
  'more pending assessments': 'autres évaluations à terminer',
  'EVERY COURSE, ONE PLACE': 'TOUS VOS COURS AU MÊME ENDROIT',
  'Enter scores whenever they arrive. Completed work stays on your awaiting-grades list.':
    'Saisissez les résultats dès leur réception. Le travail terminé reste dans la liste des notes attendues.',
  'a grade': 'une note',
  'Mark work Completed in its editor to keep it here until a score is recorded. This list does not check whether your school has released a grade.':
    'Cochez Terminé dans l’éditeur pour garder le travail ici jusqu’à la saisie d’un résultat. Cette liste ne vérifie pas si votre établissement a publié une note.',
  'Review awaiting grades': 'Voir les notes attendues',
  'Find an assessment': 'Trouver une Évaluation',
  'Assignment, lab, exam?': 'Devoir, laboratoire, examen…',
  Course: 'Cours',
  'Include archived courses': 'Inclure les cours archivés',
  'Grade views': 'Vues des notes',
  'Show all assessments': 'Afficher toutes les évaluations',
  'A blank score means ungraded, not zero. Imported assessments start at 0% weight; use Edit details to enter the course weight so they count toward your average.':
    'Un résultat vide signifie non évalué, et non zéro. Les évaluations importées ont une pondération de 0 %. Utilisez Modifier les détails pour les inclure dans votre moyenne.',
  'Grade-entry guide': 'Guide de saisie des notes',
  '% of course ?': '% du cours ?',
  'Edit details': 'Modifier les détails',
  'Score received': 'Résultat obtenu',
  'e.g. 18': 'p. ex. 18',
  'Out of': 'Sur',
  'Recorded:': 'Enregistré :',
  'Awaiting grades': 'Notes attendues',
  Recorded: 'Enregistrées',
  'All assessments': 'Toutes les évaluations',
  'Save grade': 'Enregistrer la note',
  'Legal and privacy information': 'Informations juridiques et confidentialité',
  Policies: 'Politiques',
  Privacy: 'Confidentialité',
  Cookies: 'Témoins',
  Accessibility: 'Accessibilité',
  Credits: 'Crédits',
  'About & contact': 'À propos et contact',
  'Your data': 'Vos données',
  'Read the privacy policy': 'Lire la politique de confidentialité',
  'Download my data': 'Télécharger mes données',
  'Downloads a readable JSON copy of your academic records and preferences, excluding private calendar links. Keep it private. This is not an automatic restore backup.':
    'Télécharge une copie JSON lisible de vos dossiers et préférences, sans les liens privés de calendrier. Gardez-la privée. Ce fichier ne permet pas une restauration automatique.',
  'Erase workspace data': 'Effacer les données',
  'Erase this workspace?': 'Effacer cet espace ?',
  'This permanently deletes all courses, grades, notes, tasks, events, semesters, saved calendar links and preferences from the active application database. Calendar syncing stops. This cannot be undone here.':
    'Tous les cours, résultats, notes, tâches, événements, sessions, liens de calendrier et préférences seront définitivement supprimés de la base active. La synchronisation s’arrête. Cette action est irréversible.',
  'Type DELETE MY DATA to confirm': 'Tapez DELETE MY DATA pour confirmer',
  Semester: 'Session',
  'Active semester': 'Session active',
  'MAKE YOURSELF AT HOME': 'FAITES COMME CHEZ VOUS',
  'A few thoughtful details to make this space yours.':
    'Quelques réglages pour un espace à votre image.',
  'Your preferences': 'Vos préférences',
  'Little adjustments, a better everyday.': 'De petits ajustements pour un quotidien plus simple.',
  'Your preferences are saved.': 'Vos préférences sont enregistrées.',
  'Preferences apply across your workspace.': 'Les préférences s’appliquent à tout votre espace.',
  'Terms (semesters)': 'Sessions',
  'Edit dates, choose your active term, or delete a term and its courses.':
    'Modifiez les dates, choisissez votre session active ou supprimez une session et ses cours.',
  'Add semester': 'Ajouter une session',
  Active: 'Active',
  Edit: 'Modifier',
  'Your next chapter starts here': 'Votre prochain chapitre commence ici',
  'Create a semester before adding your courses. Its dates also define when weekly classes appear.':
    'Créez une session avant d’ajouter vos cours. Ses dates définissent aussi la période des séances hebdomadaires.',
  'Create your first semester': 'Créer votre première session',
  'What should we call you?': 'Comment vous appeler ?',
  'Optional. A nickname or no name is fine.': 'Facultatif. Un surnom ou aucun nom convient.',
  'Your first name': 'Votre prénom',
  Appearance: 'Apparence',
  'Choose your favorite look, or follow your device.':
    'Choisissez votre thème préféré ou celui de votre appareil.',
  'Your study buddy': 'Votre compagnon d’étude',
  'A little company at the edge of your screen. No sounds, messages, or things to take care of.':
    'Un peu de compagnie au bord de l’écran. Sans sons, messages ni responsabilités.',
  'Gentle movement': 'Mouvements doux',
  'Date & time': 'Date et heure',
  'Make the calendar feel familiar.': 'Adaptez le calendrier à vos habitudes.',
  'Time format': 'Format de l’heure',
  'Week starts on': 'Premier jour de la semaine',
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
  'A little less clutter': 'Un peu moins d’encombrement',
  'Choose how finished work appears.': 'Choisissez comment afficher le travail terminé.',
  'Show completed tasks': 'Afficher les tâches terminées',
  'FROM COURSE OUTLINE TO STUDY PLAN': 'DU PLAN DE COURS AU PLAN D’ÉTUDE',
  'Find assessment dates and grade weights, then review them before saving.':
    'Repérez les dates et pondérations des évaluations, puis vérifiez-les avant de les enregistrer.',
  'Upload a syllabus to create a course, or add assessments to one you already have. Review the course details, dates and weights before saving.':
    'Importez un plan pour créer un cours ou ajouter des évaluations à un cours existant. Vérifiez les détails, dates et pondérations avant l’enregistrement.',
  'Syllabus reading is currently unavailable': 'La lecture des plans de cours est indisponible',
  'Please try again later. There is nothing for you to set up. You can still add assessments manually and use your courses and grades.':
    'Réessayez plus tard. Aucune configuration n’est nécessaire. Vous pouvez toujours ajouter des évaluations manuellement et consulter vos cours et notes.',
  'Try again': 'Réessayer',
  'View course assessments': 'Voir les évaluations du cours',
  '1. Import your syllabus': '1. Importer votre plan de cours',
  'How would you like to import?': 'Comment souhaitez-vous importer ?',
  Term: 'Session',
  'Choose a term': 'Choisir une session',
  'Add term': 'Ajouter une session',
  'Choose a course': 'Choisir un cours',
  'Dates without a year use': 'Les dates sans année utilisent',
  'Upload syllabus (PDF or TXT, up to': 'Importer un plan (PDF ou TXT, jusqu’à',
  'MB)': 'Mo)',
  'How your syllabus is handled': 'Traitement de votre plan de cours',
  'Choose a file': 'Choisir un fichier',
  'No file chosen': 'Aucun fichier choisi',
  'PDFs up to 60 pages, including scanned pages. Clear text and images give better results. For a Word file, export to PDF or paste its text below.':
    'PDF jusqu’à 60 pages, y compris numérisées. Un texte et des images nets donnent de meilleurs résultats. Pour un fichier Word, exportez-le en PDF ou collez son texte ci-dessous.',
  'Or paste syllabus text': 'Ou coller le texte du plan',
  'Syllabus text': 'Texte du plan de cours',
  '2. Review suggestions': '2. Vérifier les suggestions',
  'Your new course': 'Votre nouveau cours',
  'Check the course details found in your syllabus. Fill in any missing information.':
    'Vérifiez les détails trouvés dans le plan et complétez les informations manquantes.',
  'Course code': 'Code du cours',
  'Course name': 'Nom du cours',
  'This code already exists in this term. Choose Existing course to import into it, or correct the code.':
    'Ce code existe déjà dans cette session. Choisissez Cours existant pour l’utiliser, ou corrigez le code.',
  'Compare these with the original syllabus. Grouped grading rules start deselected.':
    'Comparez les suggestions au plan original. Les pondérations groupées sont désélectionnées au départ.',
  'Include this assessment': 'Inclure cette Évaluation',
  'Save as': 'Enregistrer comme',
  'New assessment': 'Nouvelle évaluation',
  'Update:': 'Mettre à jour :',
  'Current weight:': 'Pondération actuelle :',
  '%. Current deadline:': '%. Échéance actuelle :',
  Type: 'Type',
  'Due time': 'Heure limite',
  'Grade weight (%)': 'Pondération (%)',
  'View source excerpt': 'Voir l’extrait source',
  'Add missed assessment': 'Ajouter une Évaluation manquante',
  'Adjust weights or matches so the course total is at most 100%.':
    'Ajustez les pondérations ou les correspondances pour ne pas dépasser 100 %.',
  'I checked the course details, selected dates, times, individual weights and matches against my syllabus.':
    'J’ai vérifié les détails du cours, les dates, heures, pondérations et correspondances avec mon plan de cours.',
  'This imports a snapshot. Later changes to your syllabus need another review.':
    'Cette importation est un instantané. Toute modification ultérieure nécessite une nouvelle vérification.',
  'Help with syllabus imports': 'Aide pour importer un plan',
  'Create a course from syllabus': 'Créer un cours à partir du plan',
  'Existing course': 'Cours existant',
  'Find assessments from text': 'Repérer les évaluations dans le texte',
  'Create course and save assessments': 'Créer le cours et enregistrer les évaluations',
  'Save reviewed assessments': 'Enregistrer les évaluations vérifiées',
  'ONE STEP AT A TIME': 'UN PAS à LA FOIS',
  'A clear head starts with a clear list.': 'Une liste claire pour un esprit tranquille.',
  'to go.': 'À faire.',
  'New task': 'Nouvelle tâche',
  'Task views': 'Vues des tâches',
  'Your tasks': 'Vos tâches',
  'Search tasks': 'Rechercher des tâches',
  'Search tasks?': 'Rechercher une tâche…',
  Filters: 'Filtres',
  'Sort tasks': 'Trier les tâches',
  'Personal / no course': 'Personnel / sans cours',
  Priority: 'Priorité',
  'All priorities': 'Toutes les priorités',
  'All statuses': 'Tous les états',
  'Due from': 'Échéance à partir du',
  'Due through': 'Échéance jusqu’au',
  'Clear filters': 'Effacer les filtres',
  'The end of the date range must be on or after its start.':
    'La date de fin doit être égale ou postérieure à la date de début.',
  'Dismiss error': 'Fermer l’erreur',
  Personal: 'Personnel',
  'In progress': 'En cours',
  'Not started': 'Non commencé',
  Submitted: 'Remis',
  Graded: 'Noté',
  Completed: 'Terminé',
  Low: 'Faible',
  Medium: 'Moyenne',
  High: 'Haute',
  Urgent: 'Urgente',
  Assignment: 'Devoir',
  Lab: 'Laboratoire',
  Quiz: 'Quiz',
  Midterm: 'Examen de mi-session',
  'Final exam': 'Examen final',
  Project: 'Projet',
  Other: 'Autre',
  Overview: 'Aperçu',
  Schedule: 'Horaire',
  Notes: 'Notes',
  Light: 'Clair',
  Dark: 'Sombre',
  System: 'Système',
  Off: 'Désactivé',
  'All-day event': 'événement sur toute la journée',
  'Office hours, links, room numbers?': 'Heures de bureau, liens, salles…',
  'Archive course (hide from active courses)': 'Archiver le cours (masquer des cours actifs)',
  'Add a semester in Settings before creating a course.':
    'Ajoutez une session dans Paramètres avant de créer un cours.',
  'e.g. Fall 2026': 'p. ex. Automne 2026',
  'Make this the active semester': 'Définir comme session active',
  'Your default semester for new courses. This replaces the current active semester.':
    'Session par défaut des nouveaux cours. Remplace la session active actuelle.',
  This: 'Cet élément',
  'no longer exists.': 'n’existe plus.',
  Close: 'Fermer',
  Delete: 'Supprimer',
  Keep: 'Conserver',
  '(required)': '(obligatoire)',
  'What needs to get done?': 'Que faut-il faire ?',
  'Add context, links, or a little extra detail?':
    'Ajoutez du contexte, des liens ou quelques détails…',
  Subtasks: 'Sous-tâches',
  'A smaller step': 'Une petite étape',
  'Add a subtask': 'Ajouter une sous-tâche',
  Created: 'Créé le',
  at: '?',
  'Close dialog': 'Fermer la fenêtre',
  Save: 'Enregistrer',
  'Save changes': 'Enregistrer les modifications',
  'Save preferences': 'Enregistrer les préférences',
  'Save notes': 'Enregistrer les notes',
  'Saving?': 'Enregistrement…',
  'No due date': 'Sans Échéance',
  'No course': 'Sans cours',
  'No assessment': 'Sans évaluation',
  Title: 'Titre',
  Description: 'Description',
  'Start date': 'Date de début',
  'End date': 'Date de fin',
  'Start time': 'Heure de début',
  'End time': 'Heure de fin',
  Location: 'Lieu',
  Instructor: 'Professeur',
  Color: 'Couleur',
  Day: 'Jour',
  'Last day': 'Dernier jour',
  'Estimated time (minutes)': 'Durée estimée (minutes)',
  task: 'tâche',
  tasks: 'tâches',
  course: 'cours',
  courses: 'cours',
  assessment: 'Évaluation',
  assessments: 'évaluations',
  event: 'événement',
  events: 'événements',
  semester: 'session',
  semesters: 'sessions',
  'Saved to your workspace': 'Enregistré dans votre espace',
  'Deleted from your workspace': 'Supprimé de votre espace',
  'Recently created': 'Les plus récentes',
  'Oldest created': 'Les plus anciennes',
  'Calendar is up to date.': 'Le calendrier est à jour.',
  'Calendar connected. Your courses, assessments and events are ready.':
    'Calendrier connecté. Vos cours, évaluations et événements sont prêts.',
  'In Brightspace: Calendar → Settings → Enable Calendar Feeds, then Subscribe → copy the link. Choose all calendars to include all your courses.':
    'Dans Brightspace : Calendrier → Paramètres → Activer les flux, puis S’abonner → copier le lien. Choisissez tous les calendriers pour inclure tous vos cours.',
  'Saving calendar…': 'Enregistrement du calendrier…',
  'courses ·': 'cours ?',
  'deadlines ·': 'échéances ?',
  'Disconnected · Saved link retained': 'Déconnecté à Lien conservé',
  'imported entries ·': 'entrées importées ?',
  'more · view day': 'de plus à voir la journée',
  '↑ ↓ to navigate': 'À à pour naviguer',
  '↵ to select': 'À pour sélectionner',
  'View all tasks →': 'Voir toutes les tâches ?',
  'You’re all caught up. Add a task when you’re ready.':
    'Tout est à jour. Ajoutez une tâche quand vous le souhaitez.',
  'Saving…': 'Enregistrement…',
  'Start writing. This space is yours…': 'Commencez à écrire. Cet espace est à vous…',
  'Find a course…': 'Trouver un cours…',
  'Assignment, lab, exam…': 'Devoir, laboratoire, examen…',
  '· Current weighted grade:': 'À Moyenne pondérée actuelle :',
  '% of course ·': '% du cours ?',
  'Command · Local edition · Ontario, Canada': 'Command · Édition locale · Ontario, Canada',
  'Command · Hosted edition · Ontario, Canada': 'Command · Édition hébergée · Ontario, Canada',
  'It does not remove downloaded files, backups, database logs or your provider’s calendar. Download a copy first if you need one.':
    'Les fichiers téléchargés, sauvegardes, journaux de base de données et calendriers du fournisseur ne sont pas supprimés. Téléchargez d’abord une copie si nécessaire.',
  '12-hour · 2:30 PM': '12 heures · 2:30 PM',
  '24-hour · 14:30': '24 heures · 14:30',
  'Include completed tasks on Home and in the calendar. They’re always available in Tasks.':
    'Incluez les tâches terminées dans Accueil et Calendrier. Elles restent toujours accessibles dans Tâches.',
  'Reading your syllabus and checking dates and weights… This may take a minute or two.':
    'Lecture du plan et vérification des dates et pondérations… Cela peut prendre une ou deux minutes.',
  'selected · Course weight after import:': 'sélectionnées à Pondération après importation :',
  'Due date · earliest first': 'Échéance à la plus proche',
  'Due date · latest first': 'Échéance à la plus éloignée',
  'Priority · highest first': 'Priorité à la plus haute',
  'Priority · lowest first': 'Priorité à la plus faible',
  'Title · A–Z': 'Titre à A–Z',
  'Title · Z–A': 'Titre à Z–A',
  'Search tasks…': 'Rechercher une tâche…',
  '· Select a title to edit the details.': 'À Sélectionnez un titre pour modifier les détails.',
  'This session repeats weekly during the course’s semester. Add one-time exams and deadlines as assessments.':
    'Cette séance se répète chaque semaine pendant la session. Ajoutez les examens ponctuels et échéances comme évaluations.',
  'Professor’s name': 'Nom du professeur',
  'Office hours, links, room numbers…': 'Heures de bureau, liens, salles…',
  'Add context, links, or a little extra detail…':
    'Ajoutez du contexte, des liens ou quelques détails…',
  'Save calendar stores this private link, imports the selected dates and enables refresh every 15 minutes while Command is running. Preview checks the feed without saving. Your calendar provider receives the request. Use only a link you are authorized to access.':
    'Enregistrer le calendrier conserve ce lien privé, importe la période choisie et permet une actualisation toutes les 15 minutes pendant que Command fonctionne. L’aperçu consulte le flux sans l’enregistrer. Le fournisseur reçoit la requête. Utilisez uniquement un lien auquel vous êtes autorisé à accéder.',
  'Matching courses are reused; missing courses are created. Deadlines become assessments with no grade and 0% weight until you fill those in. Availability notices stay calendar events.':
    'Les cours existants sont réutilisés et les cours manquants sont créés. Les échéances deviennent des évaluations sans note, avec une pondération de 0 % à compléter. Les avis de disponibilité restent des événements.',
  'By choosing Connect and import, you authorize Command to store this private link and import and refresh its calendar data every 15 minutes while running. You can disconnect or forget it below at any time.':
    'En choisissant Connecter et importer, vous autorisez Command à conserver ce lien privé et à actualiser les données toutes les 15 minutes pendant son fonctionnement. Vous pouvez déconnecter ou oublier le lien ci-dessous à tout moment.',
  'Waiting for first sync': 'En attente de la première synchronisation',
  'Grades and notes stay yours. Entries that disappear from the feed are kept for review; explicit cancellations are labelled. Disconnecting keeps imported entries and remembers this feed for reconnection.':
    'Vos résultats et notes sont conservés. Les entrées qui disparaissent du flux restent disponibles ; les annulations explicites sont indiquées. La déconnexion conserve les entrées et le lien pour une reconnexion.',
  'Checks for updates while you use Command, at most every 15 minutes per feed. Use Sync now for an immediate check. ':
    'Vérifie les mises à jour pendant l’utilisation, au plus toutes les 15 minutes par flux. Utilisez Synchroniser pour vérifier immédiatement. ',
  'Checks every 15 minutes while the Command server is running, even if you close this tab. Catches up after restart. ':
    'Vérifie toutes les 15 minutes pendant que le serveur fonctionne, même si cet onglet est fermé. Rattrape les mises à jour au redémarrage. ',
  'Your private link is stored in your online workspace and fetched by the hosted server. ':
    'Votre lien privé est conservé dans votre espace en ligne et consulté par le serveur hébergé. ',
  item: 'élément',
  items: 'éléments',
  'No items match this calendar filter.': 'Aucun élément ne correspond à ce filtre.',
  'Nothing scheduled. Make space for a break, or plan something ahead.':
    'Rien de prévu. Prenez une pause ou planifiez la suite.',
  ' · Completed': ' · Terminé',
  'Open user guide': 'Ouvrir le guide',
  'Go to home': 'Aller à l’accueil',
  'Go to courses': 'Aller aux cours',
  'Go to calendar': 'Aller au calendrier',
  'Go to tasks': 'Aller aux tâches',
  'Go to settings': 'Aller aux paramètres',
  'Quick action': 'Action rapide',
  'No upcoming assessments scheduled for this course.': 'Aucune évaluation à venir dans ce cours.',
  'Add lectures, tutorials, and recurring labs.':
    'Ajoutez des cours magistraux, des tutoriels et des laboratoires récurrents.',
  'Add assignments, labs, quizzes, and exams to plan the semester.':
    'Ajoutez des devoirs, laboratoires, quiz et examens pour planifier la session.',
  'No grades yet': 'Aucune note pour l’instant',
  'on graded work': 'sur le travail évalué',
  'Overdue · ': 'En retard · ',
  'Enter grade for': 'Saisir la note pour',
  'Enter grade': 'Saisir la note',
  'You’ve already earned enough points': 'Vous avez déjà assez de points',
  'Check your target and assessment weights': 'Vérifiez votre cible et les pondérations',
  'Target secured': 'Cible atteinte',
  'Unable to calculate': 'Calcul impossible',
  'Out of reach': 'Hors d’atteinte',
  'This target is not achievable with the remaining weight, even with full marks.':
    'La pondération restante ne permet pas d’atteindre cette cible, même avec la note maximale.',
  'You can reach this target even with zero additional points.':
    'Cette cible est atteinte même sans points supplémentaires.',
  'Use a target between 0 and 100%, and keep course weights at or below 100%.':
    'Utilisez une cible de 0 à 100 % et une pondération totale ne dépassant pas 100 %.',
  'This is a required average, not a prediction of your final grade.':
    'Il s’agit de la moyenne nécessaire, pas d’une prévision de votre note finale.',
  'Add an assessment, then enter its score to start your gradebook.':
    'Ajoutez une évaluation et son résultat pour commencer votre carnet.',
  'Add recurring lectures, labs, and tutorials. They’ll appear in your calendar automatically.':
    'Ajoutez des séances récurrentes. Elles apparaîtront automatiquement dans le calendrier.',
  'No courses match this view': 'Aucun cours ne correspond à cette vue',
  'Your semester starts here': 'Votre session commence ici',
  'Try another semester or clear your search.':
    'Essayez une autre session ou effacez votre recherche.',
  'Add a course to bring your assessments, grades, and schedule together.':
    'Ajoutez un cours pour réunir vos évaluations, notes et horaires.',
  'Add your first course': 'Ajouter votre premier cours',
  'Set up your semester': 'Configurer votre session',
  Uncomplete: 'Marquer comme non terminé',
  Complete: 'Terminer',
  'Due today': 'À remettre aujourd’hui',
  'task needs': 'tâche nécessite',
  'tasks need': 'tâches nécessitent',
  'A fresh start for your day': 'Un nouveau départ pour la journée',
  'Deadlines this week': 'Échéances cette semaine',
  'Planned focus time': 'Temps de travail prévu',
  'Active courses': 'Cours actifs',
  'Nothing due today. Plan your next small step.':
    'Rien à remettre aujourd’hui. Planifiez votre prochaine étape.',
  'No upcoming tasks. Add one when you’re ready.':
    'Aucune tâche à venir. Ajoutez-en une quand vous le souhaitez.',
  'All day': 'Toute la journée',
  Continues: 'Se poursuit',
  Until: 'Jusqu’à',
  'Create your semester': 'Créer votre session',
  'assessment awaiting': 'évaluation attend',
  'assessments awaiting': 'évaluations attendent',
  'Not available yet': 'Pas encore disponible',
  'No grades waiting to be entered': 'Aucune note à saisir',
  'No matching assessments': 'Aucune évaluation correspondante',
  'Completed assessments appear here until you save their grades.':
    'Les évaluations terminées apparaissent ici jusqu’à l’enregistrement des notes.',
  'Choose another filter or add an assessment to get started.':
    'Choisissez un autre filtre ou ajoutez une évaluation.',
  'Completed · Awaiting grade': 'Terminé · Note attendue',
  'Your workspace is saved to your account. You can export or erase your workspace here. Erasing it does not delete your sign-in account.':
    'Votre espace est enregistré dans votre compte. Vous pouvez l’exporter ou l’effacer ici. L’effacement ne supprime pas votre compte de connexion.',
  'Your workspace is stored in this installation. No account or identity check is needed to access or delete it.':
    'Votre espace est stocké dans cette installation. Aucun compte ni contrôle d’identité n’est nécessaire pour y accéder ou le supprimer.',
  'Erasing…': 'Effacement…',
  'Permanently erase data': 'Effacer définitivement les données',
  ' (active)': ' (active)',
  'The active semester is selected by default for new courses. Select a semester to edit its dates, change its active status, or delete it.':
    'La session active est sélectionnée par défaut pour les nouveaux cours. Sélectionnez une session pour modifier ses dates, son état actif ou la supprimer.',
  'Wander, follow your mouse along the edges, and hop along on page changes. Turn off for a still companion. Your device’s reduced-motion setting is always respected.':
    'Le compagnon se promène sur les bords, suit la souris et saute lors des changements de page. Désactivez cette option pour le garder immobile. Le réglage de réduction des mouvements de votre appareil est toujours respecté.',
  'Clicking Read syllabus or analysing pasted text sends it and the selected course name and term to Command’s reader and its configured AI provider (Google Gemini or OpenAI). No AI account or setup is needed. Command does not keep the original file; provider retention rules apply. Google’s free tier may use uploads to improve its products, so only upload non-sensitive syllabi.':
    'Un clic sur Lire le plan de cours ou l’analyse de texte envoie son contenu, le cours et la session au lecteur de Command et à son fournisseur d’IA (Google Gemini ou OpenAI). Aucun compte d’IA n’est nécessaire. Command ne conserve pas le fichier original ; les règles de conservation du fournisseur s’appliquent. L’offre gratuite de Google peut utiliser les documents pour améliorer ses produits : importez uniquement des plans non sensibles.',
  'Connecting to the reader… ': 'Connexion au lecteur… ',
  'Choose a term and, for an existing course, choose the course. ':
    'Choisissez une session et, pour un cours existant, le cours. ',
  'Reading…': 'Lecture…',
  'No assessments found. Try a clearer PDF or paste the grading and schedule sections, or add rows below.':
    'Aucune évaluation trouvée. Essayez un PDF plus net, collez les sections d’évaluation et d’horaire, ou ajoutez des lignes ci-dessous.',
  'Match calendar imports to existing assessments to avoid duplicates. Matches update only dates and weights; scores, progress, names and notes stay intact. Blank fields preserve existing dates and weights. For new assessments, blank weight means 0% and blank date means no deadline.':
    'Associez les suggestions aux évaluations existantes pour éviter les doublons. Seules les dates et pondérations sont mises à jour ; résultats, avancement, noms et notes restent intacts. Les champs vides conservent les valeurs existantes. Pour une nouvelle évaluation, une pondération vide vaut 0 % et une date vide signifie aucune échéance.',
  'Times use your device time zone. A date with no time uses 23:59. Calendar sync can later replace the dates of calendar-linked assessments.':
    'Les heures utilisent le fuseau de votre appareil. Une date sans heure utilise 23 h 59. La synchronisation peut ensuite remplacer les dates des évaluations liées au calendrier.',
  'Not found': 'Introuvable',
  'Create your course': 'Créer votre cours',
  match: 'résultat',
  matches: 'résultats',
  filter: 'filtre',
  filters: 'filtres',
  'No tasks match your filters': 'Aucune tâche ne correspond aux filtres',
  'A fresh start for today': 'Un nouveau départ aujourd’hui',
  'You’re right on track': 'Vous êtes sur la bonne voie',
  'Small steps add up': 'Les petits pas font avancer',
  'A little room to plan ahead': 'Un peu de place pour planifier',
  'Make space for what matters': 'Faites place à l’essentiel',
  'Try another search or clear your filters to see more tasks.':
    'Essayez une autre recherche ou effacez les filtres.',
  'No overdue tasks. Enjoy the breathing room.':
    'Aucune tâche en retard. Profitez-en pour souffler.',
  'Completed tasks will collect here as you make progress.':
    'Les tâches terminées apparaîtront ici au fil de vos progrès.',
  'Nothing is due today. Choose your next small step.':
    'Rien à remettre aujourd’hui. Choisissez votre prochaine étape.',
  'Capture your next task and give it a place in your week.':
    'Notez votre prochaine tâche et faites-lui une place dans la semaine.',
  Reopen: 'Rouvrir',
  'Assessment name': 'Nom de l’évaluation',
  'Due date & time (optional)': 'Date et heure limites (facultatif)',
  'Course weight (%)': 'Pondération du cours (%)',
  'A recorded grade already marks this work complete.':
    'Une note enregistrée marque déjà ce travail comme terminé.',
  'Marks this as submitted and keeps it in Grades → Awaiting grades until you receive a score.':
    'Marque ce travail comme remis et le conserve dans Notes → Notes attendues jusqu’à réception d’un résultat.',
  'Maximum score': 'Résultat maximal',
  'Score received (optional)': 'Résultat obtenu (facultatif)',
  'Entering a score marks this as graded. An ungraded status clears the score.':
    'Un résultat saisi marque le travail comme noté. Un état non évalué efface le résultat.',
  'Event title': 'Titre de l’événement',
  Starts: 'Début',
  Ends: 'Fin',
  'Include every day through this date.': 'Inclure tous les jours jusqu’à cette date.',
  'Event color': 'Couleur de l’événement',
  'Associated events use their course’s color.':
    'Les événements liés utilisent la couleur du cours.',
  'Location (optional)': 'Lieu (facultatif)',
  'Session name': 'Nom de la séance',
  'Repeats every': 'Répéter chaque',
  'Select a semester': 'Sélectionner une session',
  'Instructor (optional)': 'Professeur (facultatif)',
  'Course color': 'Couleur du cours',
  'Used across your courses and calendar.': 'Utilisée dans les cours et le calendrier.',
  'Semester name': 'Nom de la session',
  New: 'Nouveau',
  Create: 'Créer',
  'This action is permanent and cannot be undone.': 'Cette action est définitive et irréversible.',
  'This permanently deletes the course and all its assessments, grades, recurring classes, linked tasks, and linked calendar events. Unlinked personal items are kept. To keep your records, cancel and archive the course instead.':
    'Cette action supprime définitivement le cours, ses évaluations, résultats, séances récurrentes, tâches et événements liés. Les éléments personnels sans lien sont conservés. Pour conserver vos dossiers, annulez et archivez le cours.',
  'Course (optional)': 'Cours (facultatif)',
  'Select a course': 'Sélectionner un cours',
  'Task title': 'Titre de la tâche',
  'Assessment (optional)': 'Évaluation (facultatif)',
  'Select a course first': 'Sélectionnez d’abord un cours',
  'Estimated duration (minutes)': 'Durée estimée (minutes)',
  'A sleepy little cat': 'Un petit chat somnolent',
  'Growing alongside you': 'Grandit à vos côtés',
  'A small cloud of calm': 'Un petit nuage de calme',
  'Just your workspace': 'Votre espace, tout simplement',
  'Please try again.': 'Veuillez réessayer.',
  'Please wait…': 'Veuillez patienter…',
  Language: 'Langue',
  'Good morning': 'Bonjour',
  'Good afternoon': 'Bon après-midi',
  'Good evening': 'Bonsoir',
  'Signing out…': 'Déconnexion…',
  'Your space to study': 'Votre espace pour étudier',
  'Reset your password': 'Réinitialiser votre mot de passe',
  'Choose a new password': 'Choisir un nouveau mot de passe',
  'Check your email': 'Vérifiez votre courriel',
  'Sign out of Command': 'Se déconnecter de Command',
  'Verify your email before opening your private workspace. You can request another link below.':
    'Vérifiez votre courriel avant d’ouvrir votre espace privé. Vous pouvez demander un autre lien ci-dessous.',
  'Keep your courses, grades and plans together in your own private workspace.':
    'Réunissez vos cours, notes et projets dans votre espace privé.',
  'Manage access to your private workspace.': 'Gérez l’accès à votre espace privé.',
  'New password': 'Nouveau mot de passe',
  'Show password': 'Afficher le mot de passe',
  'Hide password': 'Masquer le mot de passe',
  Hide: 'Masquer',
  'Sign out of Command?': 'Se déconnecter de Command ?',
  'Stay signed in': 'Rester connecté',
  'Your saved work will stay here. You’ll need to sign in again to open your workspace.':
    'Votre travail enregistré sera conservé. Vous devrez vous reconnecter pour ouvrir votre espace.',
  'Creating an account uses Neon Auth to handle your email and password. Read our':
    'La création du compte utilise Neon Auth pour gérer votre courriel et votre mot de passe. Consultez nos',
  'Create account': 'Créer un compte',
  'Update password': 'Mettre à jour le mot de passe',
  'Resend verification email': 'Renvoyer le courriel de vérification',
  'Send reset link': 'Envoyer le lien de réinitialisation',
  'Could not sign out. Please try again.': 'Déconnexion impossible. Veuillez réessayer.',
  'Choose a longer password.': 'Choisissez un mot de passe plus long.',
  'Choose a shorter password.': 'Choisissez un mot de passe plus court.',
  'The sign-in service could not accept that password. Try a password between 8 and 128 characters.':
    'Le service de connexion a refusé ce mot de passe. Essayez un mot de passe de 8 à 128 caractères.',
  'Unable to sign in. Check your email and password, or reset your password.':
    'Connexion impossible. Vérifiez votre adresse courriel et votre mot de passe, ou réinitialisez ce dernier.',
  'Unable to create this account. Try signing in or resetting your password if you already have an account.':
    'Impossible de créer ce compte. Essayez de vous connecter ou de réinitialiser votre mot de passe si vous avez déjà un compte.',
  'Check your inbox for a verification link, then sign in. Your workspace will start empty.':
    'Consultez votre boîte de réception pour trouver le lien de vérification, puis connectez-vous. Votre espace de travail sera vide au départ.',
  'This reset link is incomplete. Request a new one.':
    'Ce lien de réinitialisation est incomplet. Demandez-en un nouveau.',
  'This reset link is invalid or expired. Request a new one.':
    'Ce lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau.',
  'Password updated. You can now sign in with your new password.':
    'Mot de passe mis à jour. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
  'Email is temporarily unavailable. Please try again later.':
    'Le service de courriel est temporairement indisponible. Veuillez réessayer plus tard.',
  'If your account needs verification, a new link is on its way. Check your inbox and spam folder.':
    'Si votre compte doit être vérifié, un nouveau lien est en route. Vérifiez votre boîte de réception et votre dossier de pourriels.',
  'If an account uses that email, you will receive a password-reset link. Check your inbox and spam folder.':
    'Si un compte utilise cette adresse courriel, vous recevrez un lien de réinitialisation du mot de passe. Vérifiez votre boîte de réception et votre dossier de pourriels.',
  'Please try again later.': 'Veuillez réessayer plus tard.',
  'Sign-in is being set up': 'La connexion est en cours de configuration',
  'Command is online, but account access is not ready yet. Please check back shortly. There is nothing for you to install.':
    'Command est en ligne, mais l’accès aux comptes n’est pas encore prêt. Revenez sous peu. Vous n’avez rien à installer.',
  'Your courses. Your plans. A little more clarity.':
    'Vos cours. Vos projets. Un peu plus de clarté.',
  'Not Started': 'Non commencé',
  'In Progress': 'En cours',
  'Final Exam': 'Examen final',
  'Assessments in the next 7 days': 'Évaluations des 7 prochains jours',
  'tasks with time estimates today': 'tâches avec durée prévue aujourd’hui',
  'Your academic workspace': 'Votre espace universitaire',
  'No pending assessments': 'Aucune évaluation à terminer',
  attention: 'votre attention',
  Previous: 'Précédent',
  Next: 'Suivant',
  'Show agenda for': 'Voir l’agenda du',
  'Add event on': 'Ajouter un événement le',
  'class session': 'séance',
  'A dedicated space for your course, assessments, and progress.':
    'Un espace pour votre cours, vos évaluations et vos progrès.',
  'Keep your university life organized, one term at a time.':
    'Organisez votre vie universitaire, une session à la fois.',
  'Keep deadlines, course weights, and grades in one place.':
    'Gardez les échéances, pondérations et résultats au même endroit.',
  'Turn something on your mind into a clear next step.':
    'Transformez une idée en prochaine étape concrète.',
  'Make room in your calendar for what matters.':
    'Faites place à l’essentiel dans votre calendrier.',
  'Add a recurring class to your weekly rhythm.': 'Ajoutez une séance récurrente à votre semaine.',
  'New course': 'Nouveau cours',
  'Create course': 'Créer le cours',
  'Delete course?': 'Supprimer le cours ?',
  'Edit task': 'Modifier la tâche',
  'Create task': 'Créer la tâche',
  'Delete task?': 'Supprimer la tâche ?',
  'Edit assessment': 'Modifier l’évaluation',
  'Create assessment': 'Créer l’évaluation',
  'Delete assessment?': 'Supprimer l’évaluation ?',
  'New event': 'Nouvel événement',
  'Edit event': 'Modifier l’événement',
  'Create event': 'Créer l’événement',
  'Delete event?': 'Supprimer l’événement ?',
  'New semester': 'Nouvelle session',
  'Edit semester': 'Modifier la session',
  'Create semester': 'Créer la session',
  'Delete semester?': 'Supprimer la session ?',
  'New class session': 'Nouvelle séance',
  'Edit class session': 'Modifier la séance',
  'Create class session': 'Créer la séance',
  'Delete class session?': 'Supprimer la séance ?',
  'this month': 'ce mois',
  'this week': 'cette semaine',
  'One page at a time. Go at your own pace, or skip anytime.':
    'Une page à la fois. Avancez à votre rythme ou passez la visite à tout moment.',
  'Start with Courses': 'Commençons par les cours',
  'Click the glowing Courses button on the left. We will explore this page together, one thing at a time.':
    'Cliquez sur le bouton Cours illuminé à gauche. Nous explorerons cette page ensemble, un élément à la fois.',
  'Choose your term': 'Choisissez votre session',
  'Manage terms lets you create, rename or remove a semester, and choose the one you are working in.':
    'Gérer les sessions permet de créer, renommer ou supprimer une session, et de choisir votre session actuelle.',
  'Start from a syllabus': 'Commencez avec un plan de cours',
  'Import a syllabus to suggest a course, assessments, dates and grade weights. You review the suggestions before saving anything.':
    'Importez un plan de cours pour obtenir des suggestions de cours, évaluations, dates et pondérations. Vous les vérifiez avant tout enregistrement.',
  'Or add a course yourself': 'Ou ajoutez un cours vous-même',
  'Use Add course when you want to enter the course name and code yourself.':
    'Utilisez Ajouter un cours pour saisir vous-même son nom et son code.',
  'Find the course you need': 'Trouvez votre cours',
  'Search by name or code, choose a semester, or show courses you have archived.':
    'Recherchez par nom ou code, choisissez une session ou affichez les cours archivés.',
  'A home for each subject': 'Un espace pour chaque matière',
  'Your course cards appear here. Open one to see its assessments, grades and class schedule.':
    'Vos fiches de cours apparaissent ici. Ouvrez-en une pour voir ses évaluations, notes et séances.',
  'Next, your Calendar': 'Ensuite, votre calendrier',
  'Click Calendar on the left to see where classes and deadlines come together.':
    'Cliquez sur Calendrier à gauche pour retrouver vos séances et échéances.',
  'Bring in your deadlines': 'Importez vos échéances',
  'Connect your Brightspace calendar using its subscription link. Synced assignments, labs and exams are saved as assessments.':
    'Connectez votre calendrier Brightspace avec son lien d’abonnement. Les devoirs, laboratoires et examens synchronisés deviennent des évaluations.',
  'You can connect it after the tour.': 'Vous pourrez le connecter après la visite.',
  'Make room for personal plans': 'Faites place à vos projets personnels',
  'Add event is for plans such as an appointment or a study group.':
    'Ajouter un événement sert aux rendez-vous ou aux groupes d’étude, par exemple.',
  'Look ahead at your pace': 'Planifiez à votre rythme',
  'Move between dates, return to Today, or switch between Month and Week.':
    'Parcourez les dates, revenez à Aujourd’hui ou passez de Mois à Semaine.',
  'Show just what you need': 'Affichez l’essentiel',
  'Choose a term or course, show personal events, and include completed work when you need it.':
    'Choisissez une session ou un cours, affichez les événements personnels et incluez le travail terminé au besoin.',
  'Open a calendar item': 'Ouvrez un élément du calendrier',
  'Click an item to see its details. Brightspace-linked assessments also have a link back to Brightspace.':
    'Cliquez sur un élément pour voir ses détails. Les évaluations liées à Brightspace proposent aussi un lien vers Brightspace.',
  'Now, your Tasks': 'Maintenant, vos tâches',
  'Click Tasks on the left. This is where your own study plans live.':
    'Cliquez sur Tâches à gauche. C’est ici que se trouvent vos projets d’étude.',
  'Create tasks such as studying a chapter or preparing a report. Assignments, quizzes and exams belong in assessments.':
    'Créez des tâches pour étudier un chapitre ou préparer un rapport. Les devoirs, quiz et examens sont des évaluations.',
  'Pick a useful view': 'Choisissez une vue utile',
  'Use these tabs to see the tasks that need your attention or revisit completed work.':
    'Utilisez ces onglets pour voir les tâches à faire ou retrouver le travail terminé.',
  'Check off your progress': 'Cochez vos progrès',
  'Your tasks appear here. Use the checkbox beside a task to mark it complete.':
    'Vos tâches apparaissent ici. Cochez la case à côté d’une tâche pour la terminer.',
  'Next, your Grades': 'Ensuite, vos notes',
  'Click Grades on the left to see where you can record your results.':
    'Cliquez sur Notes à gauche pour découvrir où saisir vos résultats.',
  'Add an assessment': 'Ajoutez une évaluation',
  'Add assignments, labs, quizzes and exams here if you have not already imported them.':
    'Ajoutez ici les devoirs, laboratoires, quiz et examens que vous n’avez pas déjà importés.',
  'Remember grades that arrive later': 'Retrouvez les notes reçues plus tard',
  'Assessments you mark Completed stay on the awaiting-grades list until you record a score.':
    'Les évaluations marquées Terminées restent dans les notes en attente jusqu’à la saisie d’un résultat.',
  'This list does not check whether your school has released a grade.':
    'Cette liste ne vérifie pas si votre établissement a publié une note.',
  'Find an assessment quickly': 'Trouvez vite une évaluation',
  'Search by name or choose a course and term to narrow the list.':
    'Recherchez par nom ou choisissez un cours et une session pour filtrer la liste.',
  'Separate waiting and recorded grades': 'Distinguez les notes en attente et saisies',
  'Switch between all assessments, those awaiting grades and results you have recorded.':
    'Passez de toutes les évaluations aux notes en attente ou aux résultats déjà saisis.',
  'Record your results here': 'Saisissez vos résultats ici',
  'Enter your score and the total possible points, then save the grade. Edit details lets you adjust the assessment weight.':
    'Saisissez votre résultat et le total des points, puis enregistrez la note. Modifier les détails permet d’ajuster la pondération.',
  'A blank score means ungraded, not zero.': 'Un résultat vide signifie non noté, pas zéro.',
  'Finally, back Home': 'Enfin, retour à l’accueil',
  'Click Home on the left for a calmer view of what to do next.':
    'Cliquez sur Accueil à gauche pour voir plus calmement quoi faire ensuite.',
  'One clear focus': 'Une priorité claire',
  'Your focus brings together your next tasks and study reminders for upcoming quizzes and exams.':
    'Vos priorités rassemblent vos prochaines tâches et rappels d’étude pour les quiz et examens à venir.',
  'Find and sort your tasks': 'Trouvez et triez vos tâches',
  'Search for a task, sort the list, or open Filters to narrow it by course, priority, status or due date.':
    'Recherchez une tâche, triez la liste ou ouvrez Filtres pour choisir un cours, une priorité, un statut ou une date limite.',
  'Increase by 1': 'Augmenter de 1',
  'Decrease by 1': 'Diminuer de 1',
  'Category weight': 'Pondération de catégorie',
  combined: 'au total',
  'This is one category total, not an additional assessment. Apply it to the existing assessments below without creating copies.':
    'Ce total correspond à une catégorie, pas à une nouvelle évaluation. Appliquez-le aux évaluations existantes ci-dessous sans créer de copies.',
  'No matching assessments yet. Add or import the individual assessments first. This total is kept in the grading notes.':
    'Aucune évaluation correspondante. Ajoutez ou importez d’abord les évaluations individuelles. Ce total est conservé dans les notes de pondération.',
  'Assessments covered by this total': 'Évaluations couvertes par ce total',
  'Weight missing': 'Pondération manquante',
  'Already in a grading group': 'Déjà dans un groupe de pondération',
  selected: 'sélectionnées',
  'already assigned': 'déjà attribués',
  'assessments stated in the syllabus': 'évaluations indiquées dans le plan de cours',
  'The selection does not match the syllabus count. Import or select all members before splitting the total.':
    'La sélection ne correspond pas au nombre indiqué. Importez ou sélectionnez toutes les évaluations avant de répartir le total.',
  'Missing weights will share the remaining': 'Les pondérations manquantes se partageront les',
  'Existing nonzero weights are kept.': 'Les pondérations existantes non nulles sont conservées.',
  'I confirm this is the complete group and the missing weights should be split equally. The calendar may not include future assessments yet.':
    'Je confirme que ce groupe est complet et que les pondérations manquantes doivent être égales. Le calendrier peut ne pas encore contenir les évaluations futures.',
  'Fill missing weights': 'Compléter les pondérations',
  'The selected assessments now account for the full category weight.':
    'Les évaluations sélectionnées couvrent maintenant toute la pondération de la catégorie.',
  'No missing weights can be filled from this total. Check the selected assessments and their current weights.':
    'Aucune pondération manquante ne peut être complétée avec ce total. Vérifiez les évaluations sélectionnées et leurs pondérations.',
  'Weights added to this review. Save the import to apply them.':
    'Pondérations ajoutées à la révision. Enregistrez l’importation pour les appliquer.',
  'Compare these with the original syllabus. Category totals are shown separately from individual assessments.':
    'Comparez ces suggestions au plan de cours original. Les totaux par catégorie sont affichés séparément des évaluations individuelles.',
  'Matched to an existing assessment. Its current date and any existing weight are kept.':
    'Associée à une évaluation existante. Sa date et sa pondération existantes sont conservées.',
  'Matched to an existing assessment. Its calendar date, score and progress are preserved.':
    'Associée à une évaluation existante. Sa date, sa note et sa progression sont conservées.',
  'More than one possible match, or another row already uses this assessment. Choose a match before including it.':
    'Plusieurs correspondances possibles, ou une autre ligne utilise déjà cette évaluation. Choisissez une correspondance avant de l’inclure.',
  'Keep this category total fixed and share it equally across all current and future assessments of this type in this course.':
    'Gardez le total de cette catégorie fixe et répartissez-le également entre toutes les évaluations actuelles et futures de ce type dans ce cours.',
  'currently known': 'actuellement connues',
  'each for now': 'chacune pour le moment',
  'When calendar sync or a manual import adds another assessment, every share adjusts automatically. Scores stay unchanged. All future assessments must use the same type.':
    'Quand une synchronisation ou une importation ajoute une évaluation, chaque part est ajustée automatiquement. Les notes restent inchangées. Les futures évaluations doivent utiliser le même type.',
  'View matching assessments and syllabus source':
    'Voir les évaluations correspondantes et la source du plan de cours',
  'This category overlaps a best-of group. Keep that rule, or remove it before choosing an equal split.':
    'Cette catégorie chevauche un groupe des meilleures notes. Gardez cette règle ou retirez-la avant de choisir une répartition égale.',
  'Automatic equal split enabled': 'Répartition égale automatique activée',
  'Update automatic equal split': 'Modifier la répartition égale automatique',
  'Use automatic equal split': 'Utiliser une répartition égale automatique',
  'Choose this only if every assessment in this category counts equally. Best-of grading is a separate rule.':
    'Choisissez ceci uniquement si chaque évaluation de cette catégorie compte également. La sélection des meilleures notes est une règle distincte.',
  'Project deliverables': 'Livrables du projet',
  Midterms: 'Examens de mi-session',
  'Final exams': 'Examens finaux',
  'Other assessments': 'Autres évaluations',
  'Enter a combined weight above 0% and at most 100%.':
    'Entrez une pondération totale supérieure à 0 % et au maximum de 100 %.',
  'Add automatic equal split': 'Ajouter une répartition égale automatique',
  'Confirm equal split': 'Confirmer la répartition égale',
  'Reference notes from earlier syllabus imports':
    'Références des importations précédentes de plans de cours',
  'These are reference notes, not active calculation rules.':
    'Ces références ne sont pas des règles de calcul actives.',
  'Automatic equal split': 'Répartition égale automatique',
  'New assessments join automatically. The category total stays fixed; individual shares and averages can change.':
    'Les nouvelles évaluations sont ajoutées automatiquement. Le total de la catégorie reste fixe; les parts individuelles et les moyennes peuvent changer.',
  'Edit category total': 'Modifier le total de la catégorie',
  'Rule source': 'Source de la règle',
  'Equal splits adjust as assessments are added. Best-of groups count the highest scores. Manage rules in the course Grades tab.':
    'Les répartitions égales sont ajustées à chaque ajout. Les groupes des meilleures notes retiennent les résultats les plus élevés. Gérez les règles dans l’onglet Notes du cours.',
  'This weight is managed by an automatic equal split. Manual weight changes are ignored while it is active. Manage the category total in the course Grades tab.':
    'Cette pondération est gérée par une répartition égale automatique. Les modifications manuelles sont ignorées tant qu’elle est active. Gérez le total dans l’onglet Notes du cours.',
  'Suggested grading rule': 'Règle de notation suggérée',
  Counted: 'Comptés',
  'Combined course weight': 'Pondération totale du groupe',
  'Your syllabus says only the best results in this group count. Applying this keeps the highest scores and drops the lowest, instead of adding up every one.':
    'Selon votre plan de cours, seuls les meilleurs résultats de ce groupe comptent. Cette règle garde les meilleures notes et retire les plus faibles, au lieu de tout additionner.',
  'Apply best-of rule': 'Appliquer la règle des meilleurs résultats',
  'Category totals found. Choose a grading rule below.':
    'Totaux par catégorie trouvés. Choisissez une règle de pondération ci-dessous.',
  'Something interrupted your workspace.': 'Un problème a interrompu votre espace.',
  'Your saved data is safe. Please try loading this page again.':
    'Vos données enregistrées sont en sécurité. Essayez de recharger cette page.',
  'Loading workspace': 'Chargement de l’espace',
  'Command · Personal workspace': 'Command · Espace personnel',
  'Let’s get your workspace ready.': 'Préparons votre espace.',
  'Your workspace is temporarily unavailable. Please try again shortly.':
    'Votre espace est temporairement indisponible. Réessayez dans un instant.',
  'Command could not connect to your database. Start your local database, then return here to pick up where you left off.':
    'Command n’a pas pu se connecter à votre base de données. Démarrez votre base de données locale, puis revenez ici pour reprendre là où vous en étiez.',
  'Keep it running in its own terminal. Your app server is already running, so you do not need to run setup again.':
    'Laissez-la ouverte dans son propre terminal. Le serveur de l’application fonctionne déjà, donc inutile de relancer l’installation.',
  'For an existing PostgreSQL server, check DATABASE_URL in .env. Your data stays in your database.':
    'Pour un serveur PostgreSQL existant, vérifiez DATABASE_URL dans .env. Vos données restent dans votre base de données.',
};
