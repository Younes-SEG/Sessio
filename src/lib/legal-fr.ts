import type { LegalDocument, LegalText } from './legal';

export const policyUpdatedFr = '14 novembre 2026';

// Same documents, sections and paragraph counts as legal.ts, in the same order.
export const legalDocumentsFr: Record<LegalDocument, LegalText> = {
  privacy: {
    title: 'Politique de confidentialité',
    introduction:
      'Cette politique explique quels renseignements personnels Command recueille, pourquoi, où ils sont traités, combien de temps ils sont conservés et les choix qui s’offrent à vous. Elle vise l’édition hébergée et précise les différences avec l’édition locale téléchargeable.',
    sections: [
      {
        title: 'Qui est responsable',
        paragraphs: [
          'L’édition hébergée de Command est exploitée depuis l’Ontario, au Canada, par l’exploitant indiqué sous « Suppression du compte et assistance » au bas de cette page. L’exploitant est responsable des renseignements personnels décrits ici et a désigné la personne responsable de la protection des renseignements personnels.',
          'Écrivez à la personne responsable de la protection des renseignements personnels à l’adresse d’assistance indiquée ci-dessous pour toute question sur la confidentialité, pour demander l’accès à vos renseignements ou leur correction, pour supprimer votre compte, pour porter plainte ou pour signaler un problème de sécurité. Nous répondons dans un délai de 30 jours.',
          'L’édition locale téléchargeable fonctionne sur votre propre ordinateur. Ses données y restent, sauf si vous utilisez une fonction en ligne facultative décrite ci-dessous, et la personne qui l’installe contrôle cette copie.',
        ],
      },
      {
        title: 'Ce que nous recueillons et pourquoi',
        paragraphs: [
          'Compte : votre adresse courriel, un nom facultatif et les données de connexion, pour que vous puissiez vous connecter et garder votre espace de travail privé.',
          'Espace de travail : les cours, évaluations, notes, tâches, notes personnelles, entrées de calendrier, sessions et préférences que vous saisissez ou importez, pour que Command puisse organiser vos études.',
          'Connexions facultatives : un lien de calendrier privé que vous choisissez de connecter, un plan de cours que vous choisissez de faire lire, les messages que vous envoyez à Ask Command et, dans l’édition locale seulement, les avis scolaires d’un compte Gmail que vous connectez. Chacun sert uniquement à la fonction que vous avez lancée.',
          'Registres du service : des registres d’utilisation de l’IA sans contenu, des registres de suppression et de courts journaux de sécurité, pour appliquer les limites d’utilisation équitable, respecter les suppressions et protéger le service.',
          'Nous recueillons seulement ce dont chaque fonction a besoin. Nous ne vendons pas de renseignements personnels, n’affichons pas de publicité, ne créons pas de profils marketing et n’utilisons pas vos renseignements pour entraîner des modèles d’IA.',
        ],
      },
      {
        title: 'Où vos renseignements sont traités',
        paragraphs: [
          'Command hébergé s’appuie sur ces fournisseurs de services, qui traitent des renseignements pour notre compte : Vercel exécute l’application (États-Unis, région de Washington, D.C.); Neon stocke la base de données et gère la connexion (États-Unis, Virginie); Render exécute le lecteur de plans de cours (États-Unis, Ohio); Google fournit l’IA Gemini utilisée par Ask Command et la lecture des plans de cours (États-Unis et autres emplacements de Google). Les fournisseurs de calendrier que vous connectez, comme Brightspace, reçoivent des requêtes de notre serveur.',
          'Comme ces fournisseurs sont situés hors du Canada, vos renseignements sont stockés et traités aux États-Unis et peuvent être soumis aux lois de ce pays, y compris à l’accès légal de ses tribunaux et autorités. Nous avons choisi des fournisseurs aux pratiques de sécurité solides, limitons ce que chacun reçoit et avons évalué ces transferts avant d’offrir le service aux étudiants du Québec.',
        ],
      },
      {
        title: 'Votre espace de travail et votre compte',
        paragraphs: [
          'Votre espace de travail est stocké dans PostgreSQL. Dans l’édition locale, cette base de données se trouve sur votre ordinateur et aucun compte n’est requis. Dans l’édition hébergée, Vercel traite les requêtes de l’application et Neon stocke les données de l’espace de travail. Des vérifications de propriété côté serveur limitent l’accès à l’espace de travail au compte connecté. Cela n’empêche pas l’accès par les exploitants autorisés du service ou par les fournisseurs d’infrastructure.',
          'La connexion à l’édition hébergée utilise Neon Auth pour traiter votre courriel, votre nom facultatif, l’authentification par mot de passe et les sessions. Les courriels de vérification et de réinitialisation du mot de passe sont transactionnels, et non publicitaires. Command ne stocke pas de mots de passe en clair dans les tables de l’espace de travail. Un identifiant de compte vérifié relie votre espace de travail à votre connexion. Aucune date de naissance, aucun numéro d’étudiant, aucun renseignement de paiement ni profil marketing n’est requis.',
        ],
      },
      {
        title: 'Ask Command',
        paragraphs: [
          'Envoyer un message transmet son texte, le contexte récent de la conversation, votre langue et le fuseau horaire de votre appareil à Google Gemini par l’intermédiaire du serveur de l’application. Le contexte peut inclure des noms de cours ou d’évaluations suggérés par Command. Votre espace de travail complet et le contenu de vos courriels ne sont pas envoyés automatiquement. Le serveur vérifie chaque demande interprétée et votre droit de propriété avant de lire ou de modifier les données de l’espace de travail.',
          'L’édition hébergée utilise l’API Gemini payante de Google. Selon les conditions de Google pour les services payants, Google n’utilise pas ces requêtes ni ces réponses pour améliorer ses produits; il les conserve pendant une période limitée pour détecter les abus. Une installation locale utilise la clé que configure son propriétaire. Avec le niveau gratuit de Google, le contenu peut servir à améliorer les produits de Google et être examiné par des personnes; n’envoyez donc pas de renseignements privés par une configuration gratuite.',
          'Les titres, messages, réponses et le contexte récent des conversations sont enregistrés dans votre espace de travail pour que vous puissiez rouvrir une conversation plus tard. Les conversations restent jusqu’à ce que vous les supprimiez ou effaciez l’espace de travail. Seul le contexte récent et pertinent de la conversation choisie est envoyé à Gemini, et non tout votre historique. Chaque conversation contient jusqu’à 200 échanges. Les reçus d’action permettent la confirmation et l’annulation pendant 24 heures et sont retirés lorsqu’ils ont 30 jours, lors de la demande suivante. Supprimer une conversation retire ses messages, son titre, son contexte, ses actions en attente et ses données d’annulation, tout en conservant les notes et événements déjà enregistrés. Des identifiants de demande, des statuts et des horodatages sans contenu peuvent rester jusqu’au prochain nettoyage pour éviter les actions répétées et appliquer les limites. Les conversations et les reçus sont inclus dans les exportations et retirés par l’effacement de l’espace de travail.',
        ],
      },
      {
        title: 'Importation de plans de cours',
        paragraphs: [
          'Choisir un fichier ne lance pas la lecture. Lorsque vous cliquez sur Lire le plan de cours pour un fichier PDF, DOCX, JPG, PNG ou TXT, ou soumettez du texte collé, Command envoie son contenu, les dates de la session choisie et, pour un cours existant, son code et son nom au lecteur de Command, puis à Google Gemini. Vos autres cours, vos notes enregistrées, vos notes personnelles et vos liens de calendrier ne sont pas inclus. Vous n’avez besoin d’aucun compte ni d’aucune clé d’IA; l’exploitant gère et paie la connexion, et des limites de demandes s’appliquent.',
          'Le lecteur hébergé fonctionne sur Render, en Ohio, aux États-Unis. Les fichiers et les aperçus sont traités en mémoire et ne sont pas enregistrés par le lecteur. Sa base de données d’utilisation conserve des nombres agrégés de demandes et des empreintes à clé des adresses réseau, renouvelées chaque jour, pour appliquer les limites; les identifiants quotidiens sont supprimés après le jour UTC suivant et les compteurs mensuels le mois suivant. Le contenu est envoyé directement, jamais comme fichier stocké chez le fournisseur. Les documents Word sont lus en mémoire; les macros et les liens ne sont jamais exécutés ni récupérés. La lecture hébergée utilise l’API Gemini payante de Google; le contenu ne sert donc pas à améliorer les produits de Google, qui le conserve brièvement pour détecter les abus. Une installation locale peut être configurée avec un autre fournisseur, comme OpenAI, selon les conditions de celui-ci.',
          'Enregistrer les évaluations révisées stocke leurs dates et pondérations dans votre espace de travail; les nouvelles évaluations conservent aussi l’extrait source et la page dans leurs notes. Abandonner un aperçu n’enregistre rien, mais ne peut pas annuler une demande déjà envoyée. Effacer votre espace de travail n’efface pas les copies détenues par le fournisseur d’IA, les journaux d’hébergement ni les compteurs d’utilisation temporaires.',
        ],
      },
      {
        title: 'Connexions de calendrier',
        paragraphs: [
          'Prévisualiser un abonnement envoie le lien au serveur Command de votre édition, qui demande le calendrier à son fournisseur. Pour l’édition hébergée, Vercel traite donc le lien privé et Neon le stocke après la connexion. Le fournisseur de calendrier reçoit la requête et peut journaliser l’adresse réseau du serveur et l’identifiant du flux. Les données d’aperçu ne sont enregistrées que si vous choisissez Connecter et importer.',
          'Connecter un calendrier enregistre l’URL privée du flux, les dates et le fuseau horaire choisis, les entrées importées, l’état de synchronisation ainsi que la date et la version de l’avis de connexion accepté. Les serveurs locaux vérifient environ toutes les 15 minutes pendant leur fonctionnement. Les connexions hébergées sont vérifiées lorsque vous utilisez l’application, au plus une fois toutes les 15 minutes automatiquement, ou lorsque vous demandez une synchronisation manuelle. Les liens de flux peuvent donner accès au calendrier; ne les publiez pas et ne les partagez pas.',
          'Déconnecter arrête les vérifications, mais conserve le lien pour une reconnexion. Oublier le lien supprime la connexion enregistrée et la correspondance de synchronisation, tout en conservant les entrées scolaires importées. Vous pouvez supprimer ces entrées une à une ou effacer votre espace de travail. Réimporter une connexion oubliée peut créer des doublons.',
        ],
      },
      {
        title: 'Connexion Gmail facultative',
        paragraphs: [
          'La connexion Gmail n’est offerte que dans l’édition locale; elle est désactivée dans l’édition hébergée. L’utilisation et le transfert par Command des renseignements reçus des API Google respectent la politique de Google relative aux données des utilisateurs des services d’API, y compris ses exigences d’utilisation limitée. Les données Gmail ne servent pas à entraîner des modèles d’IA généraux, à cibler des publicités ni à créer des profils destinés à la vente.',
          'Connecter Gmail donne un accès en lecture seule à la boîte de courriel au moyen d’OAuth de Google. Command utilise le filtre de recherche que vous choisissez pour récupérer les avis scolaires correspondants et leur texte. Il n’envoie pas de courriels, ne modifie pas Gmail, ne récupère ni pièces jointes ni pages liées, et n’envoie aucun courriel à un service d’IA.',
          'La base de données stocke votre adresse Gmail, un jeton d’actualisation chiffré, vos préférences de recherche, la date et la version du consentement, l’état de synchronisation et des registres de révision contenant l’identifiant, l’expéditeur, l’objet, la date, le texte lisible (jusqu’à 100 000 caractères) et les correspondances de notes proposées. Le HTML brut des courriels est traité en mémoire seulement. Google reçoit les requêtes d’API et peut conserver ses propres journaux.',
          'Les vérifications automatiques ont lieu environ toutes les cinq minutes lorsqu’une page Command est ouverte et visible. Les correspondances de notes claires sont enregistrées automatiquement; les résultats incertains attendent votre révision, et les changements d’échéance demandent toujours votre approbation. Les avis lus, les métadonnées révisées et les identifiants de messages ignorés sont supprimés après 90 jours. Déconnecter supprime la connexion et les révisions, conserve les notes enregistrées et tente de révoquer l’accès de Google. Aucune de ces actions ne supprime de courriels dans Gmail.',
        ],
      },
      {
        title: 'Limites d’utilisation de l’IA et registres de suppression',
        paragraphs: [
          'L’IA hébergée utilise des registres d’utilisation sans contenu : une référence de compte pseudonyme, la fonction et le modèle, des horodatages, le nombre de jetons du fournisseur lorsqu’il est disponible, la configuration des prix et les réservations de dépenses. Ils ne contiennent aucun texte de conversation, aucune note, aucun document ni courriel. Ils survivent à la suppression des conversations et à l’effacement de l’espace de travail pour que ces actions ne puissent pas réinitialiser les limites de dépenses. Les registres du mois civil en cours et du mois précédent sont conservés; les plus anciens sont supprimés par un nettoyage que l’exploitant effectue au moins une fois par mois. Vos propres registres d’utilisation sont inclus dans les exportations de l’espace de travail.',
          'Un compte hébergé supprimé conserve un identifiant de compte minimal et un état de suppression pour que les demandes en cours et les sauvegardes restaurées ne puissent pas recréer ses données. Ces marqueurs ne contiennent aucun dossier scolaire et sont retirés lorsqu’aucune sauvegarde ne peut plus contenir le compte.',
        ],
      },
      {
        title: 'Suivi, témoins et tiers',
        paragraphs: [
          'Command n’utilise ni publicité, ni outils d’analyse, ni enregistrement de session, ni trousses de développement marketing, ni témoins de suivi; il ne vend pas les données de l’espace de travail et n’envoie pas de courriels marketing. Les réactions du compagnon d’étude aux mouvements de la souris sont calculées dans la mémoire du navigateur; la position du pointeur n’est ni stockée ni envoyée.',
          'Le code de l’application, les icônes, les images et les polices sont fournis par Command lui-même; aucun service tiers de polices ou de scripts n’est contacté. Les connexions de calendrier contactent leurs fournisseurs, et l’importation de plans de cours contacte le lecteur de Command et Google Gemini lorsque vous la lancez. Vérifier la disponibilité du lecteur le contacte sans envoyer le contenu d’un plan de cours.',
        ],
      },
      {
        title: 'Vos choix et vos droits',
        paragraphs: [
          'Vous pouvez consulter et modifier vos renseignements dans Command en tout temps. Paramètres → Vos données télécharge une copie JSON complète (sans les liens de calendrier privés) et efface définitivement votre espace de travail.',
          'Supprimer un cours le déplace dans Cours supprimés, où il peut être restauré; ce n’est pas un effacement définitif. Effacer l’espace de travail supprime définitivement les cours actifs et supprimés, les reçus d’IA, les liens de flux enregistrés et les préférences de la base de données active, et arrête la synchronisation. Cela ne peut pas effacer les fichiers que vous avez téléchargés ni les copies faites par d’autres logiciels.',
          'L’effacement de l’espace de travail conserve votre connexion pour que vous puissiez recommencer. Pour supprimer entièrement votre compte, écrivez au contact d’assistance ci-dessous à partir de l’adresse courriel avec laquelle vous vous connectez. Nous vérifions la demande, supprimons l’espace de travail et votre compte de connexion chez nos fournisseurs, puis confirmons ce qui a été supprimé. N’envoyez jamais votre mot de passe.',
          'Vous pouvez retirer votre consentement aux fonctions facultatives en tout temps : déconnectez un calendrier ou Gmail, ou cessez d’utiliser Ask Command et la lecture des plans de cours. Vous pouvez aussi demander quels renseignements personnels nous détenons à votre sujet et comment ils ont été utilisés. Si notre réponse ne vous satisfait pas, vous pouvez porter plainte auprès du Commissariat à la protection de la vie privée du Canada (priv.gc.ca) ou, au Québec, de la Commission d’accès à l’information (cai.gouv.qc.ca).',
        ],
      },
      {
        title: 'Durée de conservation',
        paragraphs: [
          'Les données de l’espace de travail restent jusqu’à ce que vous les supprimiez ou effaciez l’espace de travail; elles n’expirent pas automatiquement. Les données effacées quittent immédiatement la base de données active. Elles peuvent rester jusqu’à 6 heures dans l’historique de restauration continu de la base de données et jusqu’à 60 jours dans une sauvegarde manuelle prise avant une modification de la base de données, après quoi cette sauvegarde est supprimée. La mise à l’essai d’un changement à Command utilise une copie temporaire de la base de données accessible seulement à l’exploitant; elle est supprimée lorsque le changement est terminé, habituellement en quelques jours.',
          'D’autres registres ont des durées plus courtes : reçus d’action des conversations, 30 jours; avis de courriel lus et métadonnées de courriels révisés, 90 jours; registres d’utilisation de l’IA, environ deux mois; compteurs du lecteur de plans de cours, un jour ou un mois. Les fournisseurs d’hébergement et de connexion conservent de courts journaux d’exploitation et de sécurité selon leurs propres politiques. L’édition locale conserve tout sur votre ordinateur jusqu’à ce que vous le supprimiez.',
        ],
      },
      {
        title: 'Sécurité et incidents',
        paragraphs: [
          'L’édition locale est liée à votre ordinateur et refuse les requêtes publiques à l’espace de travail. L’édition hébergée exige une session vérifiée et limite les lectures, modifications, exportations et effacements à votre propre espace de travail. Les connexions sont chiffrées, et les journaux d’erreurs de l’application excluent les détails de la base de données et les liens de calendrier. Protégez votre appareil et déconnectez-vous sur les ordinateurs partagés.',
          'Nous consignons tout incident touchant des renseignements personnels, comme un accès, une utilisation, une communication non autorisés ou une perte, et conservons ce registre au moins cinq ans. Si un incident crée un risque réel de préjudice grave ou, pour les résidents du Québec, un risque de préjudice sérieux, nous avisons rapidement les personnes concernées et le Commissariat à la protection de la vie privée du Canada, ainsi que la Commission d’accès à l’information pour les résidents du Québec, en expliquant ce qui s’est produit et ce que vous pouvez faire.',
        ],
      },
      {
        title: 'Âge et public visé',
        paragraphs: [
          'Command est conçu pour les étudiants du postsecondaire et la planification personnelle en général. Il ne s’adresse pas aux enfants et ne recueille aucun renseignement sur l’âge.',
          'Les conditions de Google pour son API Gemini en réservent l’usage aux personnes de 18 ans ou plus. Vous devez avoir au moins 18 ans pour utiliser Ask Command ou la lecture des plans de cours. Si vous avez moins de 18 ans, vous pouvez utiliser Command sans ces fonctions d’IA.',
        ],
      },
      {
        title: 'Modifications de cette politique',
        paragraphs: [
          'Nous mettons cette politique à jour lorsque nos pratiques changent et indiquons la date en haut de la page. Pour les changements importants, comme un nouveau type de renseignement ou un nouveau fournisseur, nous vous en informons dans l’application avant leur entrée en vigueur et demandons votre consentement lorsque la loi l’exige.',
        ],
      },
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    introduction:
      'Ces conditions s’appliquent lorsque vous utilisez Command. En l’utilisant, vous les acceptez. L’édition hébergée est fournie depuis l’Ontario, au Canada, par l’exploitant indiqué sous « Suppression du compte et assistance » ci-dessous.',
    sections: [
      {
        title: 'Le service',
        paragraphs: [
          'Command vous aide à organiser vos propres études. L’édition hébergée est un aperçu gratuit, sur invitation, qui peut évoluer au fil de son développement. Vous pouvez aussi utiliser l’édition locale téléchargeable sur votre propre appareil pour un usage personnel et légal. Les logiciels tiers restent soumis à leurs propres licences, énumérées dans Crédits.',
        ],
      },
      {
        title: 'Votre compte',
        paragraphs: [
          'Vous devez pouvoir accepter ces conditions et avoir au moins 18 ans pour utiliser Ask Command ou la lecture des plans de cours, car notre fournisseur d’IA l’exige. Gardez vos renseignements de connexion confidentiels et avisez-nous immédiatement si vous croyez que quelqu’un d’autre a utilisé votre compte. Vous êtes responsable de l’activité de votre compte.',
        ],
      },
      {
        title: 'Utiliser Command de façon responsable',
        paragraphs: [
          'N’entrez ou ne connectez que des renseignements que vous avez le droit d’utiliser. N’utilisez pas Command pour obtenir le calendrier ou les données d’une autre personne, contourner les contrôles d’accès d’un établissement, porter atteinte à la vie privée d’autrui ou téléverser des documents que vous n’avez pas le droit de partager.',
          'N’essayez pas d’accéder à d’autres comptes, de sonder ou de surcharger le service, de contourner les limites d’utilisation ni d’utiliser Command à des fins illégales.',
        ],
      },
      {
        title: 'Votre contenu',
        paragraphs: [
          'Vous restez propriétaire de vos notes et de vos renseignements scolaires. Vous nous permettez de les stocker et de les traiter uniquement pour vous fournir Command, comme le décrit la Politique de confidentialité. Nous n’en revendiquons pas la propriété.',
        ],
      },
      {
        title: 'Fonctions d’IA, dates et estimations de notes',
        paragraphs: [
          'Ask Command et la lecture des plans de cours utilisent l’IA et peuvent se tromper : ils peuvent omettre des évaluations, mal lire des dates ou des pondérations, ou mal comprendre une demande. Vérifiez les suggestions avant de les enregistrer et confirmez les dates, remises et résultats importants auprès de votre établissement. Des limites d’utilisation s’appliquent.',
          'Les flux de calendrier peuvent omettre des travaux, retarder les mises à jour ou changer leur période. Les calculs de notes et les estimations d’objectifs sont des outils de planification, et non des relevés officiels ni des garanties.',
        ],
      },
      {
        title: 'Vos copies',
        paragraphs: [
          'Conservez des sauvegardes privées au besoin; une exportation JSON est une copie lisible, et non un outil de restauration automatique. Supprimer votre espace de travail ne peut pas retirer les sauvegardes que vous avez faites vous-même ni les données détenues par d’autres services. L’édition locale n’a ni comptes ni récupération hébergée.',
        ],
      },
      {
        title: 'Frais',
        paragraphs: [
          'Command est gratuit. Il n’a ni paiement, ni abonnement, ni essai, ni frais intégrés, et les fonctions d’IA sont financées par l’exploitant. Si des fonctions payantes sont un jour offertes, leur prix, les taxes et les conditions d’annulation et de remboursement seront indiqués avant tout achat.',
        ],
      },
      {
        title: 'Disponibilité, suspension et fin',
        paragraphs: [
          'Nous travaillons à garder Command en fonction, mais il peut contenir des erreurs et rien ne garantit un service ininterrompu ni un résultat scolaire particulier.',
          'Nous pouvons suspendre un compte qui enfreint ces conditions ou qui met en danger le service ou d’autres utilisateurs. Vous pouvez cesser d’utiliser Command en tout temps et supprimer vos données. Si nous décidons de fermer l’édition hébergée, nous donnerons un préavis raisonnable, lorsque c’est possible, pour que vous puissiez exporter votre espace de travail.',
        ],
      },
      {
        title: 'Responsabilité',
        paragraphs: [
          'Command est fourni tel quel. Dans la mesure permise par la loi, l’exploitant n’est pas responsable des pertes indirectes ni des échéances ou notes manquées parce que vous vous êtes fié à l’application plutôt qu’aux renseignements officiels de votre établissement. Rien dans ces conditions ne limite les droits auxquels vous ne pouvez pas renoncer en vertu des lois sur la protection du consommateur.',
        ],
      },
      {
        title: 'Droit applicable et modifications',
        paragraphs: [
          'Ces conditions sont régies par les lois de l’Ontario et les lois fédérales du Canada qui s’y appliquent. Elles n’imposent pas l’arbitrage, ne vous font pas renoncer aux recours collectifs et ne retirent aucune protection du consommateur applicable là où vous vivez, y compris au Québec.',
          'Nous pouvons mettre ces conditions à jour. La date en haut de la page indique la version la plus récente, et nous vous en informerons dans l’application avant l’entrée en vigueur d’un changement important.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Témoins et stockage sur l’appareil',
    introduction:
      'Command n’utilise aucun témoin publicitaire ni d’analyse. Les comptes hébergés utilisent les témoins d’authentification nécessaires pour garder votre session ouverte.',
    sections: [
      {
        title: 'Ce que l’application utilise',
        paragraphs: [
          'Les données scolaires et les préférences sont stockées dans la base de données de votre édition. L’authentification hébergée utilise des témoins de session sécurisés, accessibles seulement par HTTP, et des témoins de cache de session signés, avec des protections SameSite. La bibliothèque d’authentification peut utiliser le stockage du navigateur et des messages entre onglets pour coordonner les changements de session. Ils servent à la connexion, et non à la publicité. L’état temporaire de l’espace de travail, les aperçus et la position de la souris restent dans la mémoire du navigateur.',
          'Command enregistre aussi la langue de l’interface choisie dans un témoin interne command-language pendant au plus un an. Il contient seulement en ou fr, fonctionne sans compte et ne sert pas au suivi. Vous pouvez le changer avec le bouton de langue ou l’effacer dans votre navigateur.',
          'Un témoin interne command-theme mémorise LIGHT, DARK ou SYSTEM pendant au plus un an pour que les pages s’affichent avec votre thème avant le chargement de l’application. Il ne contient aucune donnée de compte ni donnée scolaire et ne sert pas au suivi. Changez votre thème dans Command ou effacez le témoin dans votre navigateur.',
          'Dans l’édition locale, choisir Connecter Gmail crée un témoin temporaire command-gmail-state, accessible seulement par HTTP, qui dure au plus dix minutes. Il associe la réponse de Google au navigateur qui a lancé la connexion et est retiré ensuite. Ce n’est pas un témoin publicitaire ni d’analyse.',
          'Votre navigateur peut mettre en cache les fichiers de l’application dans le cadre d’une navigation ordinaire. Les réponses de l’espace de travail sont marquées privées et non mises en cache.',
        ],
      },
      {
        title: 'Pourquoi il n’y a pas de bandeau de témoins',
        paragraphs: [
          'Command n’a aucun stockage facultatif d’analyse ou de publicité à accepter ou à refuser; chaque témoin ci-dessus est nécessaire à une fonction que vous utilisez. Si un suivi facultatif est un jour ajouté, son objectif et ses réglages seront expliqués et votre accord sera demandé avant qu’il fonctionne.',
        ],
      },
    ],
  },
  accessibility: {
    title: 'Accessibilité',
    introduction:
      'Command vise à être utilisable au clavier, lisible dans les deux thèmes et confortable avec les mouvements réduits. Il s’agit d’une description de la mise en œuvre, et non d’une certification de conformité complète aux WCAG.',
    sections: [
      {
        title: 'Clavier et formulaires',
        paragraphs: [
          'Utilisez Tab et Maj+Tab pour vous déplacer entre les commandes, Entrée ou Espace pour les activer, Échap pour fermer les boîtes de dialogue, et Ctrl+K ou Cmd+K pour ouvrir la palette de commandes. Les boîtes de dialogue gardent le focus du clavier sur leurs commandes. Un lien d’évitement mène directement au contenu de la page.',
          'Les formulaires ont des étiquettes visibles. Les champs obligatoires sont indiqués; les champs facultatifs peuvent rester vides. Les boutons et les états sélectionnés ne se distinguent pas seulement par la couleur.',
        ],
      },
      {
        title: 'Visuels et mouvement',
        paragraphs: [
          'Les thèmes clair et sombre utilisent des couleurs de texte et de commandes dont le contraste a été vérifié. Les illustrations décoratives sont masquées aux technologies d’assistance, tandis que le compagnon d’étude a un nom accessible concis. Vous pouvez choisir Désactivé ou désactiver le mouvement doux dans Apparence.',
          'Les préférences de mouvement réduit de l’appareil désactivent les entrées des cartes, les mouvements du compagnon et les animations décoratives. Le compagnon n’intercepte pas les clics et n’émet aucun son. Les renseignements du calendrier sont aussi offerts dans l’agenda du jour choisi.',
        ],
      },
      {
        title: 'Limites connues et commentaires',
        paragraphs: [
          'Les vérifications automatisées ne peuvent pas établir une accessibilité complète. Les calendriers peuvent exiger un défilement horizontal sur les petits écrans. Les combinaisons de lecteurs d’écran, le fort grossissement et d’autres technologies d’assistance demandent encore des essais manuels.',
          'Signalez un obstacle à l’accessibilité ou un problème de sécurité au contact d’assistance ci-dessous; nous visons à répondre dans un délai de 30 jours. Aucun formulaire de commentaires ne recueille de renseignements personnels.',
        ],
      },
    ],
  },
  about: {
    title: 'À propos de cette édition',
    introduction:
      'Command est un planificateur d’études offert en installation locale ou en application hébergée avec des espaces de travail privés. L’importation facultative de plans de cours utilise un service de lecture hébergé distinct.',
    sections: [
      {
        title: 'Renseignements sur l’éditeur',
        paragraphs: [
          'L’édition hébergée est exploitée depuis l’Ontario, au Canada, par l’exploitant indiqué sous « Suppression du compte et assistance » ci-dessous, qui est aussi le contact pour la confidentialité et l’assistance. Aucune adresse d’entreprise ni aucun numéro d’enregistrement n’est encore publié. Aucune identité d’entreprise ni adresse de contact n’a été inventée.',
        ],
      },
      {
        title: 'Aucune fonction payante ni promotionnelle',
        paragraphs: [
          'Il n’y a ni perception de paiements, ni renouvellement automatique, ni essai payant, ni liste d’envoi marketing, ni système d’avis ou de témoignages. Command ne présente aucun faux client, aucune fausse évaluation ni aucun résultat scolaire garanti.',
        ],
      },
      {
        title: 'Demandes concernant les données',
        paragraphs: [
          'Dans les deux éditions, Paramètres → Vos données exporte ou efface directement votre espace de travail, sans pièce d’identité ni courriel. Pour la suppression d’un compte hébergé et les autres demandes liées à la confidentialité, écrivez au contact d’assistance ci-dessous. Les fichiers et sauvegardes situés hors de l’application doivent être gérés séparément.',
        ],
      },
    ],
  },
  credits: {
    title: 'Crédits et licences',
    introduction:
      'Command inclut des composants à code source ouvert et des illustrations dessinées dans le cadre du projet. Aucune trousse de publicité ni d’analyse n’est incluse.',
    sections: [
      {
        title: 'Polices, icônes et personnages',
        paragraphs: [
          'Command inclut les polices Lora et Plus Jakarta Sans sous la licence SIL Open Font License 1.1. Leurs avis de droit d’auteur et de licence se trouvent dans /fonts/Lora-OFL.txt et /fonts/Plus-Jakarta-Sans-OFL.txt et doivent accompagner les fichiers de polices redistribués. Les icônes de l’interface proviennent de Lucide sous la licence ISC. Les composants de Radix et les modèles de composants de style shadcn utilisent des licences permissives décrites dans les avis.',
          'Le logo de Command et les illustrations pixelisées Mochi, Sprout et Nimbus ont été créés dans le cadre de ce projet avec l’aide d’un assistant de programmation. Ils n’utilisent ni photos de banque d’images, ni personnages externes, ni bibliothèques d’images achetées. Aucun droit d’auteur exclusif ni aucune vérification de marque de commerce n’est revendiqué.',
        ],
      },
      {
        title: 'Avis concernant les logiciels',
        paragraphs: [
          'Les avis de tiers fournis indiquent les dépendances de production installées, leurs licences déclarées et les textes de licence disponibles. Ils comprennent Next.js, React, Prisma, des composants clients PostgreSQL et ical.js. ical.js est sous licence MPL-2.0; ses modules sources sont inclus dans son paquet. Conservez les avis pertinents et rendez le code source visé disponible lorsque vous distribuez une application compilée.',
          'Le paquet téléchargeable doit aussi conserver les licences des outils ou des fichiers binaires de base de données qu’il inclut. Les avis automatisés sont un inventaire, et non une détermination juridique que toutes les obligations de distribution sont respectées.',
        ],
      },
    ],
  },
};
