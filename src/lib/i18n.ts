import { useAppState } from './store';

const en = {
  appTitle: 'Pets On Screen',
  language: 'Language',
  choose: 'Choose',
  next: 'Next',
  skip: 'Skip',
  start: 'Start',
  intro1: 'Welcome to Pet on Screen',
  intro1Content: 'Cute pets will stay with you on your screen anytime.',
  intro2: 'Choose Pets',
  intro2Content: 'Pick the ones you love.',
  intro3: 'Enjoy!',
  intro3Content: 'Your cute companions are ready.',
  getStartedTitle: 'Have you ever tried Pet?',
  getStarted1: 'Yes, I use it often',
  getStarted2: 'I’ve tried it before',
  getStarted3: 'No, never tried it',
  home: 'Home',
  collection: 'Collection',
  settings: 'Settings',
  petOnScreen: 'Pet on screen',
  onScreenCount: ['One at random', 'Two at random', 'Three at random', 'Four at random', 'Five at random', 'Six at random'],
  emptySlot: 'Add pet',
  choosePet: 'Choose Pet',
  page: 'Page: {0}/{1}',
  all: 'All',
  importPack: 'Import Shimeji pack (.zip)',
  importInvalid: 'That zip has no shime1.png — pick a Shimeji image pack.',
  importError: 'Could not import that file.',
  imported: 'Pet imported!',
  addToHome: 'Add to Home',
  removeFromHome: 'Remove from Home',
  slotsFull: 'All 9 home slots are full. Remove a pet first.',
  delete: 'Delete',
  deleteTitle: 'Delete?',
  deleteContent: 'Are you sure you want to delete this pet?',
  cancel: 'Cancel',
  speed: 'Speed',
  size: 'Size',
  timeChange: 'Time Change',
  minutes: 'minutes',
  hungerReminder: 'Hunger reminder',
  off: 'Off',
  shareApp: 'Share App',
  feedback: 'Feedback',
  overlayTitle: 'Overlay permission',
  overlayContent:
    'For the app to work you need to\nenable the Overlay Permission\nEnable it now?\n\nIf the switch is greyed out: App info → ⋮ → Allow restricted settings.',
  permissionNeeded: 'Overlay permission needed — tap to grant',
  restrictedHint:
    'Pets are playing inside the app only. If the permission switch is greyed out, open App info → ⋮ → Allow restricted settings.',
  hidePets: 'Hide pets',
  showPets: 'Show pets',
  allow: 'Allow',
  overlayUnavailable:
    'Floating over other apps needs the development build (Expo Go cannot draw over other apps). Pets will play inside this app instead.',
  notifTitle: 'Enabled Notifications',
  notifContent: 'Allow to send you\nnotifications?',
  hungryText: 'I’m hungry now!\nI want to eat something..',
  cookingText: 'Food is cooking…\nYummy food is on the way!',
  happyText: 'I’m full and happy!',
  feed: 'Feed',
  foods: 'Foods',
  done: 'Done',
  goHome: 'Home',
  foodNames: ['Spaghetti', 'Hamburger', 'Fruits', 'French Fries', 'Fr.Chicken', 'Beef Steak', 'Tacos', 'Hot Dog', 'Salad'],
  tapPet: 'Tap a pet for the menu, drag or fling it around!',
  preview: 'Preview',
};
type Dict = typeof en;

const es: Partial<Dict> = {
  language: 'Idioma', choose: 'Elegir', next: 'Siguiente', skip: 'Omitir', start: 'Empezar',
  intro1: 'Bienvenido a Pet on Screen', intro1Content: 'Mascotas adorables te acompañarán en tu pantalla.',
  intro2: 'Elige mascotas', intro2Content: 'Escoge las que más te gusten.', intro3: '¡Disfruta!', intro3Content: 'Tus compañeros están listos.',
  getStartedTitle: '¿Has probado alguna mascota virtual?', getStarted1: 'Sí, a menudo', getStarted2: 'La he probado', getStarted3: 'No, nunca',
  home: 'Inicio', collection: 'Colección', settings: 'Ajustes', petOnScreen: 'Mascota en pantalla',
  onScreenCount: ['Una al azar', 'Dos al azar', 'Tres al azar', 'Cuatro al azar', 'Cinco al azar', 'Seis al azar'],
  emptySlot: 'Añadir', choosePet: 'Elegir mascota', page: 'Página: {0}/{1}', all: 'Todas',
  addToHome: 'Añadir al inicio', removeFromHome: 'Quitar del inicio', delete: 'Eliminar', cancel: 'Cancelar',
  speed: 'Velocidad', size: 'Tamaño', timeChange: 'Cambio de tiempo', minutes: 'minutos', hungerReminder: 'Aviso de hambre', off: 'No',
  shareApp: 'Compartir', feedback: 'Comentarios', allow: 'Permitir',
  hungryText: '¡Tengo hambre!\nQuiero comer algo..', cookingText: 'La comida se está cocinando…', happyText: '¡Estoy lleno y feliz!',
  feed: 'Alimentar', foods: 'Comidas', done: 'Listo', goHome: 'Inicio', preview: 'Vista previa',
};
const fr: Partial<Dict> = {
  language: 'Langue', choose: 'Choisir', next: 'Suivant', skip: 'Passer', start: 'Commencer',
  intro1: 'Bienvenue sur Pet on Screen', intro1Content: 'Des animaux mignons restent avec vous sur votre écran.',
  intro2: 'Choisissez vos animaux', intro2Content: 'Prenez ceux que vous aimez.', intro3: 'Profitez !', intro3Content: 'Vos compagnons sont prêts.',
  home: 'Accueil', collection: 'Collection', settings: 'Réglages', petOnScreen: 'Animal à l’écran',
  onScreenCount: ['Un au hasard', 'Deux au hasard', 'Trois au hasard', 'Quatre au hasard', 'Cinq au hasard', 'Six au hasard'],
  emptySlot: 'Ajouter', choosePet: 'Choisir', page: 'Page : {0}/{1}', all: 'Tous', delete: 'Supprimer', cancel: 'Annuler',
  addToHome: 'Ajouter à l’accueil', removeFromHome: 'Retirer de l’accueil',
  speed: 'Vitesse', size: 'Taille', timeChange: 'Changement', minutes: 'minutes', hungerReminder: 'Rappel de faim', off: 'Non',
  shareApp: 'Partager', feedback: 'Avis', allow: 'Autoriser',
  hungryText: 'J’ai faim !\nJe veux manger..', cookingText: 'Ça cuit…', happyText: 'Je suis rassasié !',
  feed: 'Nourrir', foods: 'Plats', done: 'OK', goHome: 'Accueil', preview: 'Aperçu',
};
const hi: Partial<Dict> = {
  language: 'भाषा', choose: 'चुनें', next: 'आगे', skip: 'छोड़ें', start: 'शुरू करें',
  intro1: 'Pet on Screen में स्वागत है', intro1Content: 'प्यारे पालतू आपकी स्क्रीन पर हमेशा साथ रहेंगे।',
  intro2: 'पालतू चुनें', intro2Content: 'जो पसंद हों उन्हें चुनें।', intro3: 'मज़े करें!', intro3Content: 'आपके साथी तैयार हैं।',
  home: 'होम', collection: 'संग्रह', settings: 'सेटिंग्स', petOnScreen: 'स्क्रीन पर पालतू',
  onScreenCount: ['एक रैंडम', 'दो रैंडम', 'तीन रैंडम', 'चार रैंडम', 'पाँच रैंडम', 'छह रैंडम'],
  emptySlot: 'जोड़ें', choosePet: 'पालतू चुनें', page: 'पेज: {0}/{1}', all: 'सभी', delete: 'हटाएँ', cancel: 'रद्द करें',
  addToHome: 'होम में जोड़ें', removeFromHome: 'होम से हटाएँ',
  speed: 'गति', size: 'आकार', timeChange: 'बदलने का समय', minutes: 'मिनट', hungerReminder: 'भूख रिमाइंडर', off: 'बंद',
  shareApp: 'ऐप शेयर करें', feedback: 'प्रतिक्रिया', allow: 'अनुमति दें',
  hungryText: 'मुझे भूख लगी है!\nकुछ खाना है..', cookingText: 'खाना बन रहा है…', happyText: 'पेट भर गया, मैं खुश हूँ!',
  feed: 'खिलाएँ', foods: 'खाना', done: 'हो गया', goHome: 'होम', preview: 'पूर्वावलोकन',
};
const pt: Partial<Dict> = {
  language: 'Idioma', choose: 'Escolher', next: 'Próximo', skip: 'Pular', start: 'Começar',
  intro1: 'Bem-vindo ao Pet on Screen', intro1Content: 'Bichinhos fofos ficarão na sua tela.',
  intro2: 'Escolha pets', intro2Content: 'Escolha os que você ama.', intro3: 'Divirta-se!', intro3Content: 'Seus companheiros estão prontos.',
  home: 'Início', collection: 'Coleção', settings: 'Ajustes', petOnScreen: 'Pet na tela',
  onScreenCount: ['Um aleatório', 'Dois aleatórios', 'Três aleatórios', 'Quatro aleatórios', 'Cinco aleatórios', 'Seis aleatórios'],
  emptySlot: 'Adicionar', choosePet: 'Escolher pet', page: 'Página: {0}/{1}', all: 'Todos', delete: 'Excluir', cancel: 'Cancelar',
  addToHome: 'Adicionar ao início', removeFromHome: 'Remover do início',
  speed: 'Velocidade', size: 'Tamanho', timeChange: 'Troca', minutes: 'minutos', hungerReminder: 'Lembrete de fome', off: 'Desligado',
  shareApp: 'Compartilhar', feedback: 'Feedback', allow: 'Permitir',
  hungryText: 'Estou com fome!\nQuero comer algo..', cookingText: 'A comida está sendo preparada…', happyText: 'Estou cheio e feliz!',
  feed: 'Alimentar', foods: 'Comidas', done: 'Pronto', goHome: 'Início', preview: 'Prévia',
};

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];
const dicts: Record<string, Partial<Dict>> = { en, es, fr, hi, pt };

export function useT(): Dict {
  const lang = useAppState((s) => s.language);
  return { ...en, ...(dicts[lang] ?? {}) } as Dict;
}

export const fmt = (s: string, ...args: (string | number)[]) => args.reduce<string>((acc, a, i) => acc.replace(`{${i}}`, String(a)), s);
