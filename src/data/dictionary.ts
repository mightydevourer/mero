// Compact bilingual word lists + idiom tables that back the mock translation
// provider. They cover the seeded sample texts richly and common vocabulary
// broadly, so demo translations read meaningfully without a network call.
//
// An empty-string value means "drop this token" (e.g. reflexive markers /
// elided articles that have no clean standalone English equivalent).

export const DICTIONARIES: Record<string, Record<string, string>> = {
  es: {
    el: 'the', la: 'the', los: 'the', las: 'the', un: 'a', una: 'a', unos: 'some', unas: 'some',
    de: 'of', del: 'of the', y: 'and', o: 'or', que: 'that', se: '', no: 'not', en: 'in',
    con: 'with', por: 'through', para: 'for', pero: 'but', como: 'like', más: 'more', muy: 'very',
    su: 'its', sus: 'their', mi: 'my', le: 'to him', sobre: 'over', entre: 'among', desde: 'from',
    hasta: 'until', cuando: 'when', donde: 'where', porque: 'because', también: 'also', sin: 'without',
    viejo: 'old', vieja: 'old', nuevo: 'new', faro: 'lighthouse', roca: 'rock', gris: 'gray',
    cada: 'each', noche: 'night', día: 'day', luz: 'light', mar: 'sea', oscuro: 'dark', oscura: 'dark',
    escalera: 'staircase', estrecha: 'narrow', estrecho: 'narrow', vela: 'candle', mano: 'hand',
    ventana: 'window', puerta: 'door', barco: 'ship', barcos: 'ships', lejano: 'distant', lejanos: 'distant',
    viento: 'wind', frío: 'cold', fría: 'cold', calor: 'heat', pared: 'wall', muro: 'wall',
    carta: 'letter', cartas: 'letters', palabra: 'word', palabras: 'words', ola: 'wave', olas: 'waves',
    mañana: 'morning', tarde: 'afternoon', silencio: 'silence', gente: 'people', pueblo: 'village',
    ciudad: 'city', casa: 'house', agua: 'water', fuego: 'fire', tierra: 'earth', cielo: 'sky',
    igual: 'the same', indiferente: 'indifferent', enorme: 'enormous', pequeño: 'small', grande: 'large',
    nunca: 'never', siempre: 'always', ahora: 'now', aquí: 'here', allí: 'there', qué: 'why',
    alzaba: 'rose', alzar: 'to raise', giraba: 'turned', girar: 'to turn', despacio: 'slowly',
    subía: 'climbed', subir: 'to climb', ver: 'to see', veía: 'saw', podía: 'could', poder: 'to be able',
    entraba: 'entered', entrar: 'to enter', escribía: 'wrote', escribir: 'to write', enviaba: 'sent',
    enviar: 'to send', perdían: 'were lost', perder: 'to lose', quedó: 'remained', quedar: 'to remain',
    entendía: 'understood', entender: 'to understand', seguía: 'kept on', seguir: 'to continue',
    leer: 'to read', leía: 'read', hablar: 'to speak', vivir: 'to live', amar: 'to love', ella: 'she',
    él: 'he', ellos: 'they', nosotros: 'we', yo: 'I', tú: 'you', usted: 'you', maría: 'María',
  },
  fr: {
    le: 'the', la: 'the', les: 'the', un: 'a', une: 'a', des: 'some', du: 'of the',
    de: 'of', et: 'and', ou: 'or', que: 'that', se: '', ne: 'not', pas: 'not', non: 'no',
    dans: 'in', en: 'in', avec: 'with', par: 'through', pour: 'for', mais: 'but', comme: 'like',
    plus: 'more', très: 'very', son: 'his', sa: 'her', ses: 'their', mon: 'my', sur: 'on',
    sous: 'under', parmi: 'among', depuis: 'since', jusque: 'until', quand: 'when', où: 'where',
    parce: 'because', aussi: 'also', sans: 'without', à: 'to', "l'": 'the', "d'": 'of', "qu'": 'that',
    "n'": 'not', "j'": 'I', "c'": 'it', "s'": '', "t'": 'you', "m'": 'me',
    vieux: 'old', vieille: 'old', nouveau: 'new', phare: 'lighthouse', rocher: 'rock', gris: 'gray',
    chaque: 'each', nuit: 'night', jour: 'day', lumière: 'light', mer: 'sea', sombre: 'dark',
    escalier: 'staircase', étroit: 'narrow', étroite: 'narrow', bougie: 'candle', main: 'hand',
    fenêtre: 'window', porte: 'door', bateau: 'boat', bateaux: 'boats', lointain: 'distant', lointains: 'distant',
    vent: 'wind', froid: 'cold', froide: 'cold', chaleur: 'heat', mur: 'wall', fissure: 'crack', fissures: 'cracks',
    lettre: 'letter', lettres: 'letters', mot: 'word', mots: 'words', vague: 'wave', vagues: 'waves',
    matin: 'morning', soir: 'evening', silence: 'silence', silencieux: 'silent', gens: 'people', village: 'village',
    ville: 'city', maison: 'house', eau: 'water', feu: 'fire', terre: 'earth', ciel: 'sky',
    même: 'same', indifférente: 'indifferent', indifférent: 'indifferent', immense: 'immense', petit: 'small', grand: 'large',
    jamais: 'never', toujours: 'always', maintenant: 'now', ici: 'here', là: 'there', pourquoi: 'why',
    dressait: 'rose', dresser: 'to raise', tournait: 'turned', tourner: 'to turn', lentement: 'slowly',
    montait: 'climbed', monter: 'to climb', voir: 'to see', voyait: 'saw', écrivait: 'wrote', écrire: 'to write',
    entrait: 'entered', entrer: 'to enter', envoyait: 'sent', envoyer: 'to send', perdaient: 'were lost', perdre: 'to lose',
    resta: 'remained', restait: 'remained', rester: 'to remain', comprenaient: 'understood', comprendre: 'to understand',
    lire: 'to read', parler: 'to speak', vivre: 'to live', aimer: 'to love', elle: 'she', il: 'he',
    ils: 'they', nous: 'we', je: 'I', tu: 'you', vous: 'you', marie: 'Marie',
  },
  de: {
    der: 'the', die: 'the', das: 'the', ein: 'a', eine: 'a', und: 'and', oder: 'or', dass: 'that',
    nicht: 'not', kein: 'no', in: 'in', mit: 'with', durch: 'through', für: 'for', aber: 'but',
    wie: 'like', mehr: 'more', sehr: 'very', sein: 'his', auf: 'on', unter: 'under', von: 'from',
    bis: 'until', wenn: 'when', wo: 'where', weil: 'because', auch: 'also', ohne: 'without',
    alt: 'old', neu: 'new', leuchtturm: 'lighthouse', fels: 'rock', grau: 'gray', nacht: 'night',
    tag: 'day', licht: 'light', meer: 'sea', dunkel: 'dark', treppe: 'staircase', schmal: 'narrow',
    kerze: 'candle', hand: 'hand', fenster: 'window', tür: 'door', schiff: 'ship', schiffe: 'ships',
    wind: 'wind', kalt: 'cold', mauer: 'wall', brief: 'letter', briefe: 'letters', wort: 'word', wörter: 'words',
    welle: 'wave', wellen: 'waves', morgen: 'morning', stille: 'silence', leute: 'people', dorf: 'village',
    stadt: 'city', haus: 'house', wasser: 'water', feuer: 'fire', himmel: 'sky', gleich: 'the same',
    riesig: 'enormous', klein: 'small', groß: 'large', nie: 'never', immer: 'always', jetzt: 'now',
    hier: 'here', dort: 'there', warum: 'why', sie: 'she', er: 'he', ich: 'I', wir: 'we', lesen: 'to read',
    // Common inflected forms used in the sample text.
    alte: 'old', grauen: 'gray', dem: 'the', stand: 'stood', war: 'was', am: 'at the',
    niemand: 'nobody', kam: 'came', zurück: 'back',
  },
}

/** Whole-selection idiom lookups (matched after light normalisation). */
export const IDIOMS: Record<string, Record<string, string>> = {
  es: {
    'a duras penas': 'barely; with great difficulty',
    'de repente': 'suddenly; all of a sudden',
    'tener ganas de': 'to feel like (doing something)',
    'echar de menos': 'to miss (someone or something)',
    'dar con': 'to come across; to find',
  },
  fr: {
    'tout à coup': 'all of a sudden',
    'avoir le cafard': 'to feel down; to have the blues',
    'mettre la main à la pâte': 'to pitch in; to lend a hand',
    'coûter les yeux de la tête': 'to cost an arm and a leg',
    'poser un lapin': 'to stand someone up',
  },
  de: {
    'die daumen drücken': "to keep one's fingers crossed",
    'tomaten auf den augen haben': 'to be oblivious to the obvious',
    'ins gras beißen': 'to bite the dust',
  },
}
