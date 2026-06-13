import type { Book } from '../types'

// A small, multilingual starter library. The foreign-language texts are written
// with vocabulary covered by the mock dictionary so translations read well out
// of the box. All prose here is original.

const day = 86_400_000
const base = Date.parse('2026-06-01T08:00:00Z')

export function seedBooks(): Book[] {
  return [
    {
      id: 'book_lantern_keeper',
      title: 'The Lantern-Keeper',
      author: 'E. M. Castellan',
      language: 'en',
      coverColor: '#3b5b6e',
      tags: ['English', 'Short Story', 'Literary'],
      series: 'Coastal Tales',
      status: 'reading',
      addedAt: base + 3 * day,
      lastReadAt: Date.parse('2026-06-13T09:10:00Z'),
      progress: { chapterIndex: 1, paragraphIndex: 0, percent: 42 },
      chapters: [
        {
          id: 'ch_lk_1',
          title: 'I. The Arrival',
          paragraphs: [
            'The boat that carried Idris to the island was older than the island’s only road, and it complained the whole way across. He sat with his single trunk between his knees and watched the lighthouse grow from a smudge into a tower, white as a bone left out in the weather.',
            'He had answered an advertisement that asked for a man who did not mind silence. He had not understood, then, how thoroughly the sea could deliver it. By the time the boat scraped against the jetty, he had not heard a human voice in six hours, and he found, to his surprise, that he did not miss it.',
            'The keeper he was replacing met him at the top of the steps. She was a small woman with hands like rope, and she looked at him for a long moment before she spoke. “You’ll learn the light first,” she said. “Everything else on this rock can wait. The light cannot.”',
            'That night she showed him the lamp room, where the great lens turned on its bath of mercury, slow and patient as a planet. “It has kept turning every night for ninety years,” she told him. “Men have died in their beds in town and never known that out here a light was thinking of them.”',
          ],
        },
        {
          id: 'ch_lk_2',
          title: 'II. The Logbook',
          paragraphs: [
            'In the second week Idris found the logbook. It lived in a drawer that swelled with the damp and had to be coaxed open, and it held the small handwriting of every keeper who had ever wound the light. Weather. Passing ships. The occasional drowned thing the sea returned to the rocks.',
            'Most entries were a single line. But here and there a keeper had written more than the regulations required — a sentence about a particular sunset, a complaint about the cold, once a long paragraph, in faded brown ink, about a daughter who had not written back.',
            'He understood then that the logbook was not really a record of the weather. It was a record of waiting, kept by people who had volunteered for it. He picked up the pen, and after a while he began to write more than the regulations required, too.',
            'The wind rose against the glass while he wrote, the way it had risen for ninety years, indifferent and enormous, and the light went on turning over the dark water as if it had somewhere to be.',
          ],
        },
        {
          id: 'ch_lk_3',
          title: 'III. The Relief',
          paragraphs: [
            'Spring came the way it does to islands, all at once and without apology. The supply boat brought letters, and one of them, against every expectation, was for him.',
            'He read it standing on the jetty while the boatman waited, and then he folded it carefully and put it in the pocket over his heart, and he climbed back up the steps to the light that had kept turning whether or not anyone wrote to him.',
            'That evening he made his entry in the logbook, and for the first time he signed it not as a duty but as a man leaving a message for whoever came next. “The light is well,” he wrote. “So am I.”',
          ],
        },
      ],
    },
    {
      id: 'book_el_faro',
      title: 'El Faro',
      author: 'Lucía Marín',
      language: 'es',
      coverColor: '#9a5b34',
      tags: ['Spanish', 'Short Story', 'B1'],
      series: 'Coastal Tales',
      status: 'reading',
      addedAt: base + 1 * day,
      lastReadAt: Date.parse('2026-06-12T21:30:00Z'),
      progress: { chapterIndex: 0, paragraphIndex: 3, percent: 30 },
      chapters: [
        {
          id: 'ch_faro_1',
          title: 'El Faro',
          paragraphs: [
            'El viejo faro se alzaba sobre la roca gris.',
            'Cada noche, la luz giraba despacio sobre el mar oscuro.',
            'María subía la escalera estrecha con una vela en la mano.',
            'Desde la ventana podía ver los barcos lejanos.',
            'El viento frío entraba por las grietas de la pared.',
            'Ella escribía cartas que nunca enviaba.',
            'Las palabras se perdían entre las olas.',
            'Una mañana, el faro quedó en silencio.',
            'La gente del pueblo no entendía por qué.',
            'Pero el mar seguía igual, indiferente y enorme.',
          ],
        },
      ],
    },
    {
      id: 'book_le_phare',
      title: 'Le Phare',
      author: 'Antoine Rivière',
      language: 'fr',
      coverColor: '#4a6b52',
      tags: ['French', 'Short Story', 'B1'],
      series: 'Coastal Tales',
      status: 'unread',
      addedAt: base + 5 * day,
      progress: { chapterIndex: 0, paragraphIndex: 0, percent: 0 },
      chapters: [
        {
          id: 'ch_phare_1',
          title: 'Le Phare',
          paragraphs: [
            'Le vieux phare se dressait sur le rocher gris.',
            'Chaque nuit, la lumière tournait lentement sur la mer sombre.',
            'Marie montait l’escalier étroit avec une bougie à la main.',
            'Depuis la fenêtre, elle voyait les bateaux lointains.',
            'Le vent froid entrait par les fissures du mur.',
            'Elle écrivait des lettres qu’elle n’envoyait jamais.',
            'Les mots se perdaient parmi les vagues.',
            'Un matin, le phare resta silencieux.',
            'Les gens du village ne comprenaient pas pourquoi.',
            'Mais la mer restait la même, indifférente et immense.',
          ],
        },
      ],
    },
    {
      id: 'book_der_leuchtturm',
      title: 'Der Leuchtturm',
      author: 'Hanna Vogt',
      language: 'de',
      coverColor: '#6b5a7e',
      tags: ['German', 'Flash Fiction', 'A2'],
      series: 'Coastal Tales',
      status: 'unread',
      addedAt: base + 6 * day,
      progress: { chapterIndex: 0, paragraphIndex: 0, percent: 0 },
      chapters: [
        {
          id: 'ch_leucht_1',
          title: 'Der Leuchtturm',
          paragraphs: [
            'Der alte Leuchtturm stand auf dem grauen Fels.',
            'Das Licht war kalt und das Meer war dunkel.',
            'Eine Kerze stand am Fenster, aber niemand kam zurück.',
          ],
        },
      ],
    },
    {
      id: 'book_reading_slowly',
      title: 'On the Habit of Reading Slowly',
      author: 'Priya Raman',
      language: 'en',
      coverColor: '#7a6c3f',
      tags: ['English', 'Essay', 'Nonfiction'],
      status: 'finished',
      addedAt: Date.parse('2026-05-10T08:00:00Z'),
      lastReadAt: Date.parse('2026-05-15T22:00:00Z'),
      progress: { chapterIndex: 0, paragraphIndex: 0, percent: 100 },
      chapters: [
        {
          id: 'ch_rs_1',
          title: 'On the Habit of Reading Slowly',
          paragraphs: [
            'We are taught, early and often, that to read faster is to read better. The reading we are most praised for is the reading that disappears — a page consumed and forgotten, a box ticked. But there is another way to read, older and quieter, in which the point is not to finish.',
            'To read slowly is to grant a sentence the courtesy of being difficult. It is to stop at a word you half-know and decide, this once, to know it fully; to carry it to a dictionary, to turn it over, to find the sentence in which it first made sense to you and keep that sentence somewhere safe.',
            'This is the labour that fast reading is designed to spare us, and that is precisely the trouble. A language is not learned by passing over it. It is learned by stopping, by friction, by the small and repeated decision to look closely at the thing that resists you.',
            'A good reading tool, then, should not only carry us forward. It should make it easy to stop. It should keep, without our asking twice, the words we paused on and the sentences that gave them their meaning, so that the work of one evening becomes the foundation of the next.',
          ],
        },
      ],
    },
  ]
}
