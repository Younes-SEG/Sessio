import { ExternalLink } from 'lucide-react';

export function GmailSetupGuide({ french = false }: { french?: boolean }) {
  const choose = (en: string, fr: string) => (french ? fr : en);
  const steps = [
    {
      title: choose('Choose a Google Cloud project', 'Choisissez un projet Google Cloud'),
      text: choose(
        'On the welcome screen, click Select a project at the top, then New Project. Name it Sessio and click Create. With a personal Google account, leave the organization as No organization if offered. After creation, use the project selector again to select Sessio. You can also select an existing project you own.',
        'Sur la page d’accueil, cliquez sur Select a project en haut, puis New Project. Nommez le projet Sessio et cliquez sur Create. Avec un compte personnel, laissez No organization si proposé. Après la création, sélectionnez Sessio dans le sélecteur de projet. Vous pouvez aussi utiliser un projet existant qui vous appartient.',
      ),
    },
    {
      title: choose('Enable Gmail API', 'Activez Gmail API'),
      text: choose(
        'Keep Sessio selected at the top. Open the ☰ menu → APIs & Services → Library. Search for Gmail API, open the Google result, and click Enable. If it says Manage, it is already enabled.',
        'Gardez Sessio sélectionné en haut. Ouvrez le menu ☰ → APIs & Services → Library. Recherchez Gmail API, ouvrez le résultat Google et cliquez sur Enable. Si Manage apparaît, l’API est déjà activée.',
      ),
    },
    {
      title: choose('Set up the consent screen', 'Configurez l’écran de consentement'),
      text: choose(
        'Use the top search bar to find Google Auth Platform. Open it and click Get started if prompted. Enter Sessio as the App name and choose your email for User support email. Click Next, choose External under Audience, then Next. Enter your email under Contact Information. Review the policy, accept it if you agree, and finish with Continue → Create. If already configured, use Branding and Audience to check these settings.',
        'Recherchez Google Auth Platform dans la barre du haut. Ouvrez-le et cliquez sur Get started si proposé. Saisissez Sessio dans App name et votre courriel dans User support email. Cliquez sur Next, choisissez External sous Audience, puis Next. Entrez votre courriel dans Contact Information. Lisez la politique, acceptez-la si vous êtes d’accord, puis Continue → Create. Si la configuration existe déjà, vérifiez Branding et Audience.',
      ),
    },
    {
      title: choose('Add yourself as a test user', 'Ajoutez votre compte de test'),
      text: choose(
        'In Google Auth Platform, open Audience. Keep Publishing status as Testing. Under Test users, click Add users, enter the Gmail address receiving your school notifications, and Save. Connect that same account in Sessio later.',
        'Dans Google Auth Platform, ouvrez Audience. Gardez Publishing status sur Testing. Sous Test users, cliquez sur Add users, entrez l’adresse Gmail qui reçoit vos avis scolaires, puis Save. Connectez ce même compte dans Sessio ensuite.',
      ),
    },
    {
      title: choose('Allow read-only email access', 'Autorisez la lecture des courriels'),
      text: choose(
        'Open Data Access → Add or remove scopes. Find and select the Gmail API permission below (or paste it in the manual scope field if needed), then Update and Save. This is the permission Sessio uses to read email.',
        'Ouvrez Data Access → Add or remove scopes. Sélectionnez l’autorisation Gmail API ci-dessous (ou collez-la dans le champ de saisie manuelle au besoin), puis Update et Save. Elle permet à Sessio de lire les courriels.',
      ),
      code: 'https://www.googleapis.com/auth/gmail.readonly',
    },
    {
      title: choose('Create the OAuth client', 'Créez le client OAuth'),
      text: choose(
        'Open Clients → Create client. Set Application type to Web application and Name to Sessio local. Under Authorized redirect URIs, click Add URI and paste the exact address below. Leave Authorized JavaScript origins empty for this server connection. Click Create. Copy the client ID and client secret privately; the secret may only be shown when created.',
        'Ouvrez Clients → Create client. Choisissez Web application dans Application type et Sessio local dans Name. Sous Authorized redirect URIs, cliquez sur Add URI et collez exactement l’adresse ci-dessous. Laissez Authorized JavaScript origins vide pour cette connexion serveur. Cliquez sur Create. Copiez en privé le client ID et le client secret; le secret peut être affiché seulement lors de sa création.',
      ),
      code: 'http://127.0.0.1:3000/api/email/callback',
    },
    {
      title: choose(
        'Save the two values on your computer',
        'Enregistrez les deux valeurs sur votre ordinateur',
      ),
      text: choose(
        'Open .env.local in your Sessio project folder using your editor. Replace the values after = for the two entries below with your client ID and client secret. Keep each on its own line. Keep the existing redirect URI and encryption key unchanged. If these entries are missing, run node scripts/setup-gmail.mjs from the project folder first. Save the file. Keep this file private; do not paste secrets into chat or screenshots.',
        'Ouvrez .env.local dans le dossier du projet Sessio avec votre éditeur. Remplacez les valeurs après = des deux entrées ci-dessous par votre client ID et votre client secret, chacun sur sa propre ligne. Conservez l’URI de redirection et la clé de chiffrement existantes. Si ces entrées manquent, exécutez d’abord node scripts/setup-gmail.mjs dans le dossier du projet. Enregistrez le fichier et gardez-le privé; ne partagez pas les secrets dans le chat ou des captures.',
      ),
      code: 'GOOGLE_GMAIL_CLIENT_ID=your-client-id\nGOOGLE_GMAIL_CLIENT_SECRET=your-client-secret',
    },
    {
      title: choose('Restart Sessio and connect Gmail', 'Redémarrez Sessio et connectez Gmail'),
      text: choose(
        'Restart the local app so it loads the saved settings. If you started it in a terminal, stop that app with Ctrl+C, then run npm run dev from the Sessio folder. Open http://127.0.0.1:3000 → Grades → Grade emails. Tick the permission checkbox, click Connect Gmail, choose your test account, and review Google’s consent screen. Once connected, click Check emails now. Clear assessment and score matches are saved automatically. Review only uncertain results or conflicts with manually entered grades.',
        'Redémarrez l’application pour charger les paramètres. Si vous l’avez lancée dans un terminal, arrêtez-la avec Ctrl+C, puis exécutez npm run dev dans le dossier Sessio. Ouvrez http://127.0.0.1:3000 → Notes → Courriels de notes. Cochez l’autorisation, cliquez sur Connecter Gmail, choisissez votre compte de test et vérifiez le consentement Google. Une fois connecté, vérifiez les courriels. Les résultats clairement associés à une évaluation sont enregistrés automatiquement; seuls les cas incertains ou les conflits avec une note saisie manuellement restent à vérifier.',
      ),
    },
  ];

  return (
    <details className="gmail-setup-guide space-y-4">
      <summary className="cursor-pointer font-medium text-primary">
        {choose(
          'One-time setup for your own installation',
          'Configuration initiale de votre installation',
        )}
      </summary>
      <p>
        {choose(
          'Start with step 1 if you are on Google Cloud’s welcome screen. Keep this guide open in one tab and Google Cloud in another. The menu labels below match Google’s English interface.',
          'Commencez à l’étape 1 si vous êtes sur la page d’accueil Google Cloud. Gardez ce guide dans un onglet et Google Cloud dans un autre. Les noms de menus ci-dessous correspondent à l’interface anglaise de Google.',
        )}
      </p>
      <a
        className="setup-guide-link"
        href="https://console.cloud.google.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Google Cloud Console <ExternalLink aria-hidden size={16} />
        <span className="sr-only">
          {choose('(opens in a new tab)', '(s’ouvre dans un nouvel onglet)')}
        </span>
      </a>
      <ol className="gmail-setup-steps">
        {steps.map((step, index) => (
          <li key={index}>
            <h3 className="font-semibold">{step.title}</h3>
            <p>{step.text}</p>
            {step.code && (
              <pre className="rounded-sm bg-muted p-3 text-sm whitespace-pre-wrap break-all">
                <code>{step.code}</code>
              </pre>
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm muted">
        {choose(
          'If Google shows redirect_uri_mismatch, compare the address in step 6 character by character, including 127.0.0.1 and /api/email/callback. If access is denied, check the test-user email in step 4. If Sessio still says setup is incomplete, check both saved values and restart it. GMAIL_SETUP.md in the project folder has more details.',
          'Si Google affiche redirect_uri_mismatch, comparez l’adresse de l’étape 6 caractère par caractère, y compris 127.0.0.1 et /api/email/callback. Si l’accès est refusé, vérifiez le compte de test à l’étape 4. Si Sessio indique toujours une configuration incomplète, vérifiez les deux valeurs enregistrées et redémarrez. Le fichier GMAIL_SETUP.md contient plus de détails.',
        )}
      </p>
    </details>
  );
}
