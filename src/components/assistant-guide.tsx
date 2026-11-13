export function AssistantGuide({ french = false }: { french?: boolean }) {
  return (
    <section id="assistant" className="card scroll-mt-6 space-y-3 p-4">
      <h2 className="section-title">{french ? 'Demander à Command' : 'Ask Command'}</h2>
      <p>
        {french
          ? 'Tu peux aussi discuter naturellement : dire bonjour, remercier Command ou demander un conseil pour étudier. « Des séances d’étude prévues ? » affiche seulement les séances, et « Et la semaine prochaine ? » conserve le sujet de la question précédente. Les échanges informels ne modifient jamais tes notes ou ton calendrier.'
          : 'You can also chat naturally: say hello, thank Command or ask for study advice. “Any study sessions planned?” shows only study sessions, and “What about next week?” keeps the subject of your previous question. Casual conversation never changes your grades or calendar.'}
      </p>
      <p>
        {french
          ? 'Ouvre Demander à Command en haut de chaque page. Il consulte ton planning, répond aux questions sur tes notes et objectifs, crée des séances d’étude dans le calendrier et enregistre les notes des évaluations existantes.'
          : 'Open Ask Command at the top of any page. It reads your schedule, answers grade and target questions, creates study sessions in Calendar, and records grades for existing assessments.'}
      </p>
      <p>
        {french
          ? 'Précise le cours, la période, le type de travail et ce que tu veux exclure. Par exemple : « Mes examens et séances d’étude la semaine prochaine », « Mes devoirs en retard, sans les labos » ou « Quelle note ai-je reçue au devoir 1 de SEG3102 ? ». Command distingue une question sur une note d’une demande pour l’enregistrer. Tu peux continuer avec « Et la semaine prochaine ? » sans répéter les autres critères.'
          : 'Specify the course, dates, kind of work and anything to leave out. Try “My exams and study sessions next week”, “Overdue assignments, excluding labs” or “What did I get on A1 in SEG3102?” Command distinguishes looking up a grade from recording one. Follow up with “What about next week?” to keep your other filters.'}
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          {french
            ? '« Qu’est-ce qui est prévu cette semaine ? » — affiche les cours, événements et travaux à terminer pour la période demandée (un an maximum).'
            : '“What’s planned this week?” — lists classes, events and unfinished work for the requested dates (up to one year).'}
        </li>
        <li>
          {french
            ? '« Planifie une séance d’étude pour SEG3102 demain à 18 h pendant une heure. » — utilise le fuseau horaire de ton appareil et vérifie les chevauchements.'
            : '“Schedule a study session for SEG3102 tomorrow at 6 pm for one hour.” — uses your device’s time zone and checks for overlaps.'}
        </li>
        <li>
          {french
            ? '« J’ai eu 9/10 au devoir 1 de SEG3102. » — associe le cours et l’évaluation. Indique toujours la note et le maximum.'
            : '“I got 9/10 on A1 of SEG3102.” — matches the course and assessment. Include both the score and maximum.'}
        </li>
        <li>
          {french
            ? '« Quelle est ma moyenne ce trimestre ? », « Où en suis-je en SEG3102 ? », « Que me faut-il à l’examen final pour avoir un B en SEG3102 ? » — Command calcule les notes avec la même méthode que la page Notes ; l’IA ne fait aucun calcul. Les lettres suivent le barème de premier cycle de l’Université d’Ottawa.'
            : '“What’s my average this semester?”, “How am I doing in SEG3102?”, “What do I need on the final to get a B in SEG3102?” — Command calculates grades the same way as the Grades page; the AI never does the math. Letters use the uOttawa undergraduate scale.'}
        </li>
      </ul>
      <p>
        {french
          ? 'Avec les services Gemini non payants, ne soumets pas de renseignements personnels, sensibles ou confidentiels, y compris tes notes privées. Avant une diffusion publique, l’exploitant doit vérifier les conditions de traitement des données du service payant et les restrictions d’âge de Gemini. Actualiser efface la conversation affichée, pas les reçus du serveur.'
          : 'Do not submit personal, sensitive or confidential information, including private grades, through unpaid Gemini services. Before public release, the operator must verify paid-service data terms and Gemini’s age restrictions. Conversations stay in your workspace until you delete them.'}
      </p>
      <p>
        {french
          ? 'Les demandes claires sont enregistrées directement. Command demande une précision si plusieurs évaluations correspondent, et une confirmation avant de remplacer une note ou de créer un chevauchement. Le résultat propose un lien et Annuler pendant 24 heures, tant que l’élément n’a pas changé depuis. Les modifications peuvent aussi être faites dans les pages habituelles.'
          : 'Clear requests save directly. Command asks for clarification when a match is ambiguous, and confirmation before replacing a grade or scheduling an overlap. The result includes a link and Undo for 24 hours, provided the entry has not changed since. You can also edit it through the usual pages.'}
      </p>
      <p>
        {french
          ? 'Les messages et le contexte récent de la conversation sont transmis à Google Gemini. Le planning complet et les courriels ne sont pas envoyés. Google peut utiliser les données du niveau gratuit pour améliorer ses produits. Les conversations restent dans ton espace privé jusqu’à leur suppression. Conversations récentes permet de reprendre un échange après actualisation ou reconnexion. Nouvelle conversation démarre un contexte séparé. Supprimer une conversation retire ses messages, actions en attente et commandes Annuler, mais conserve les notes et événements déjà enregistrés. Les commandes Annuler expirent après 24 heures. Les reçus sont nettoyés après 30 jours lors d’une prochaine demande ; les conversations restent disponibles. L’export inclut les conversations, et l’effacement de l’espace les supprime.'
          : 'Messages and recent conversation context (social replies, course choices and previous query topics) go to Google Gemini. Your full schedule and emails are not sent. Google may use free-tier submissions to improve its products. Chat titles, messages, replies and recent context stay in your private workspace until deleted. Recent chats lets you continue after refreshing or signing back in. New chat starts separate context. Deleting a chat removes its messages, pending actions and Undo controls, while keeping grades and events already saved. Each request receipt keeps its response and context; action receipts also keep the previous values needed for Undo. Receipts are removed after 30 days when another request is made. They are included in exports and erased with your workspace.'}
      </p>
      <details>
        <summary className="cursor-pointer text-primary">
          {french ? 'Configuration pour ta propre installation' : 'Setup for your own installation'}
        </summary>
        <p className="mt-2">
          {french
            ? 'Command réutilise la clé GEMINI_API_KEY de ton fichier privé .env.syllabus.local. Tu peux aussi la configurer dans les variables du serveur. Ne partage pas cette clé. GEMINI_ASSISTANT_MODEL permet de choisir un autre modèle. Les limites Gemini s’appliquent ; un échec ne modifie rien.'
            : 'Command reuses GEMINI_API_KEY from your private .env.syllabus.local file, or from the server environment. Never share the key. GEMINI_ASSISTANT_MODEL optionally selects another model. Gemini usage limits apply; failed requests make no changes.'}
        </p>
      </details>
    </section>
  );
}
