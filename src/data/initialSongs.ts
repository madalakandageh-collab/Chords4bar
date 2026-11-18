import type { Bar, Section, Setlist, Song } from '../types';

function makeBars(chords: string[], cues: Record<number, string> = {}): Bar[] {
  return chords.map((chord, idx) => ({
    id: `b-${Math.random().toString(36).slice(2, 9)}-${idx}`,
    chord,
    cue: cues[idx] || undefined,
    repeat: 1,
  }));
}

function makeSection(name: string, chords: string[], cues: Record<number, string> = {}): Section {
  return {
    id: `sec-${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    bars: makeBars(chords, cues),
  };
}

export const INITIAL_SONGS: Song[] = [
  {
    id: 'daiwa-yogayakin',
    title: 'Daiwa Yogayakin',
    artist: 'Victor Rathnayake',
    key: 'G',
    bpm: 92,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731900000000,
    sections: [
      makeSection('Start', ['-', '-', '-', '-'], { 2: 'Intro' }),
      makeSection('Intro', ['G', '-', 'Em', '-', 'C', 'D', 'G', '-'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        [
          'G', 'G', 'Em', 'Em',
          'C', 'D', 'G', 'G',
          'G', 'Bm', 'C', 'Am',
          'D', 'D7', 'G', 'G',
        ],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Inter 1',
        [
          'G', 'Em', 'Am', 'D',
          'G', 'C', 'D', 'G',
          'Em', 'C', 'D', 'G',
        ],
        { 0: 'Interlude' }
      ),
      makeSection(
        'Verse 1',
        [
          'G', 'G', 'C', 'C',
          'D', 'D7', 'G', 'G',
          'Em', 'Em', 'Am', 'Am',
          'C', 'D', 'G', 'G',
          'G', 'C', 'D', 'G',
        ],
        { 0: 'Verse' }
      ),
      makeSection(
        'Chorus',
        [
          'G', 'G', 'Em', 'Em',
          'C', 'D', 'G', 'G',
          'G', 'Bm', 'C', 'Am',
          'D', 'D7', 'G', 'G',
        ],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Inter 2',
        [
          'G', 'D', 'Em', 'Bm',
          'C', 'G', 'Am', 'D',
          'G', 'C', 'D', 'G',
        ],
        { 0: 'Keys' }
      ),
      makeSection(
        'Verse 2',
        [
          'G', 'G', 'C', 'C',
          'D', 'D7', 'G', 'G',
          'Em', 'Em', 'Am', 'Am',
          'C', 'D', 'G', 'G',
          'G', 'C', 'D', 'G',
        ],
        { 0: 'Verse' }
      ),
      makeSection(
        'Chorus',
        [
          'G', 'G', 'Em', 'Em',
          'C', 'D', 'G', 'G',
          'G', 'Bm', 'C', 'Am',
          'D', 'D7', 'G', 'G',
        ],
        { 0: 'All In', 14: 'Last Time' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-dy-1',
        label: 'Chorus',
        lines: [
          'දෛවයෝගයකින් නොවේදෝ',
          'හමුවුණේ අප හමු වුණේ',
          'දෛවයේ සරදම් ලබන්නට',
          'කිම මෙසේ අප හමුවුණේ',
        ],
      },
      {
        id: 'lyr-dy-2',
        label: 'Verse 1',
        lines: [
          'ඇදුරුතුමියයි ප්‍රේමයේ ඔබ',
          'ඇදුරුතුමියයි යෞවනේ',
          'ශෝකයේ රුදු වේදනාවේ',
          'කඳුළු සයුරේ උල්පතයි',
        ],
      },
      {
        id: 'lyr-dy-3',
        label: 'Verse 2',
        lines: [
          'නඳුන් උයනේ ස්නේහයේ සඳ',
          'සිසිල දෙන සඳරැස් ඔබයි',
          'සිතක මල් පිපි වසන්තය ලඟ',
          'ගීත ගයනා හඬ ඔබයි',
        ],
      },
    ],
  },
  {
    id: 'atha-epita-hima',
    title: 'Atha Epita Hima',
    artist: 'Clarence Wijewardena',
    key: 'C',
    bpm: 156,
    timeSignature: '6/8',
    transpose: 0,
    updatedAt: 1731890000000,
    sections: [
      makeSection('Intro', ['C', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'C'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        [
          'C', 'C', 'F', 'F',
          'G', 'G7', 'C', 'C',
          'C', 'Am', 'Dm', 'G',
          'F', 'G', 'C', 'C',
        ],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Verse 1',
        [
          'C', 'Em', 'F', 'C',
          'Am', 'Dm', 'G', 'C',
          'F', 'G', 'Em', 'Am',
          'Dm', 'G', 'C', 'C',
        ],
        { 0: 'Verse' }
      ),
      makeSection(
        'Verse 2',
        [
          'C', 'Em', 'F', 'C',
          'Am', 'Dm', 'G', 'C',
          'F', 'G', 'Em', 'Am',
          'Dm', 'G', 'C', 'C',
        ],
        { 0: 'Verse' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-ae-1',
        label: 'Chorus',
        lines: [
          'ඈත එපිට හිම කන්දෙන්',
          'කළු වලාකුළක් ඇදෙනා',
          'සීත සුළං රැලි අතරින්',
          'ඔබේ සුවඳ මට දැනෙනා',
        ],
      },
      {
        id: 'lyr-ae-2',
        label: 'Verse 1',
        lines: [
          'මීදුම් සළු පටින් වැසී',
          'තුරු ලතා සැලී නැටෙනා',
          'සිහිලැල් පිනි බිඳු වැටිලා',
          'මල් පෙති මත දිලිසෙන්නා',
        ],
      },
    ],
  },
  {
    id: 'obata-sitha',
    title: 'Obata Sitha',
    artist: 'Dayarathna Perera',
    key: 'Gm',
    bpm: 212,
    timeSignature: '6/8',
    transpose: 0,
    updatedAt: 1731880000000,
    sections: [
      makeSection('Intro', ['Gm', 'Cm', 'D7', 'Gm', 'Eb', 'F', 'Bb', 'D7'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        ['Gm', 'Gm', 'Cm', 'Cm', 'F', 'F7', 'Bb', 'D7', 'Gm', 'Eb', 'Cm', 'D7', 'Gm', 'Gm', 'D7', 'Gm'],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Verse 1',
        ['Bb', 'Bb', 'F', 'F', 'Eb', 'Cm', 'D7', 'Gm', 'Gm', 'Cm', 'F', 'Bb', 'Cm', 'D7', 'Gm', 'Gm'],
        { 0: 'Verse' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-os-1',
        label: 'Chorus',
        lines: [
          'ඔබට සිත ආදරේ කරයි',
          'දෙතොල ගොළු වී සිටියි',
          'නොකී පෙම් කතාවේ',
          'රහස මගෙ හිත දනියි',
        ],
      },
    ],
  },
  {
    id: 'meena-nuwan-yuga',
    title: 'Meena Nuwan Yuga',
    artist: 'Senanayaka Weraliyadda',
    key: 'Em',
    bpm: 160,
    timeSignature: '3/4',
    transpose: 0,
    updatedAt: 1731870000000,
    sections: [
      makeSection('Intro', ['Em', 'Am', 'B7', 'Em', 'C', 'D', 'G', 'B7'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        ['Em', 'Em', 'Am', 'Am', 'D', 'D7', 'G', 'B7', 'Em', 'C', 'Am', 'B7', 'Em', 'Em'],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Verse 1',
        ['G', 'G', 'C', 'G', 'Am', 'D', 'G', 'B7', 'Em', 'Am', 'B7', 'Em'],
        { 0: 'Verse' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-mn-1',
        label: 'Chorus',
        lines: [
          'මීන නුවන් යුග දැකුමෙන්',
          'සිත මගෙ සැලුණා',
          'සඳ කිරණින් මුළු ලොවම',
          'ආලෝක වුණා',
        ],
      },
    ],
  },
  {
    id: 'ninda-nena-rathriye',
    title: 'Ninda Nena Rathriye',
    artist: 'Gunadasa Kapuge',
    key: 'G',
    bpm: 98,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731860000000,
    sections: [
      makeSection('Intro', ['G', 'Em', 'C', 'D', 'G', 'Bm', 'Am', 'D7'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        ['G', 'G', 'Em', 'Em', 'C', 'D', 'G', 'G', 'G', 'C', 'Am', 'D7', 'G', 'D', 'G', 'G'],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Verse 1',
        ['Em', 'Em', 'Bm', 'Bm', 'C', 'D', 'G', 'G', 'Am', 'D', 'G', 'Em', 'C', 'D7', 'G', 'G'],
        { 0: 'Verse' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-nn-1',
        label: 'Chorus',
        lines: [
          'නින්ද නේන රාත්‍රියේ',
          'මේ පාළු කාන්සියේ',
          'පායා අරුණෝදේ',
          'සිත දෙන්න නිරන්තරේ',
        ],
      },
    ],
  },
  {
    id: 'hanthanata-payana-sanda',
    title: 'Hanthanata Payana Sanda',
    artist: 'Amarasiri Peiris',
    key: 'C',
    bpm: 150,
    timeSignature: '6/8',
    transpose: 0,
    updatedAt: 1731850000000,
    sections: [
      makeSection('Intro', ['C', 'Am', 'F', 'G', 'C', 'Em', 'Dm', 'G'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        ['C', 'C', 'Am', 'Am', 'F', 'G', 'C', 'C', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'],
        { 0: 'Chorus' }
      ),
      makeSection(
        'Verse 1',
        ['Am', 'Am', 'F', 'F', 'G', 'G', 'C', 'C', 'Dm', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
        { 0: 'Verse' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-hp-1',
        label: 'Chorus',
        lines: [
          'හන්තානට පායන සඳ',
          'ලස්සනයිද කියන්න',
          'මා නොදකින ඒ පුරහඳ',
          'ඔබට හැකිය දකින්න',
        ],
      },
    ],
  },
  {
    id: 'ayyandiye',
    title: 'Ayyandiye',
    artist: 'Karunarathna Divulgane',
    key: 'Am',
    bpm: 161,
    timeSignature: '6/8',
    transpose: 0,
    updatedAt: 1731840000000,
    sections: [
      makeSection('Intro', ['Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E7', 'Am'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        ['Am', 'Am', 'Dm', 'Dm', 'G', 'G', 'C', 'E7', 'Am', 'F', 'Dm', 'E7', 'Am', 'Am'],
        { 0: 'Chorus' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-ay-1',
        label: 'Chorus',
        lines: [
          'අයියණ්ඩියේ නුඹ ඇවිදින්',
          'ගමට එළිය දුන්නා',
          'පැල් කවියක තාලෙට',
          'මුළු ගමම සැනසුණා',
        ],
      },
    ],
  },
  {
    id: 'giman-harina',
    title: 'Giman Harina',
    artist: 'Kasun Kalhara',
    key: 'Cm',
    bpm: 130,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731830000000,
    sections: [
      makeSection('Intro', ['Cm', 'Ab', 'Bb', 'Gm', 'Fm', 'Cm', 'G7', 'Cm'], { 0: 'Intro' }),
      makeSection(
        'Chorus',
        ['Cm', 'Cm', 'Ab', 'Ab', 'Bb', 'Bb', 'Eb', 'G7', 'Cm', 'Fm', 'Bb', 'Eb', 'Ab', 'G7', 'Cm', 'Cm'],
        { 0: 'Chorus' }
      ),
    ],
    lyrics: [
      {
        id: 'lyr-gh-1',
        label: 'Chorus',
        lines: [
          'ගිමන් හරින දියඹ දිගේ',
          'සුසුම් හෙලන වෙරළ ඉමේ',
          'බැස යන හිරු අඩැසි සඳට',
          'රහස් කියනවා',
        ],
      },
    ],
  },
  {
    id: 'atha-wan-pethin',
    title: 'Atha Wan Pethin',
    artist: 'Sunil Edirisinghe',
    key: 'D',
    bpm: 110,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731820000000,
    sections: [
      makeSection('Intro', ['D', 'Bm', 'G', 'A', 'D', 'A', 'D', '-'], { 0: 'Intro' }),
      makeSection('Chorus', ['D', 'D', 'G', 'G', 'A', 'A7', 'D', 'D'], { 0: 'Chorus' }),
    ],
    lyrics: [
      {
        id: 'lyr-awp-1',
        label: 'Chorus',
        lines: [
          'ඈත වන් පෙතින් පියඹා',
          'සිහින ලොවක තනි වෙන්නට',
        ],
      },
    ],
  },
  {
    id: 'master-sir',
    title: 'Master Sir',
    artist: 'Neela Wickramasinghe',
    key: 'Am',
    bpm: 102,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731810000000,
    sections: [
      makeSection('Intro', ['Am', 'G', 'F', 'E7', 'Am', 'Dm', 'E7', 'Am'], { 0: 'Intro' }),
      makeSection('Chorus', ['Am', 'Am', 'Dm', 'Dm', 'G', 'G', 'C', 'E7', 'Am', 'F', 'E7', 'Am'], { 0: 'Chorus' }),
    ],
    lyrics: [
      {
        id: 'lyr-ms-1',
        label: 'Chorus',
        lines: [
          'මාස්ටර් සර් මගේ හිතේ',
          'දුක් ගින්දර නිවා දමන්න',
        ],
      },
    ],
  },
  {
    id: 'mal-pibidenne',
    title: 'Mal Pibidenne',
    artist: 'Clarence Wijewardena',
    key: 'E',
    bpm: 124,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731800000000,
    sections: [
      makeSection('Intro', ['E', 'A', 'B7', 'E', 'C#m', 'F#m', 'B7', 'E'], { 0: 'Intro' }),
      makeSection('Chorus', ['E', 'E', 'A', 'A', 'B7', 'B7', 'E', 'E'], { 0: 'Chorus' }),
    ],
    lyrics: [
      {
        id: 'lyr-mp-1',
        label: 'Chorus',
        lines: [
          'මල් පිබිදෙන්නේ වසන්ත කාලේ',
          'සිත සැනසෙන්නේ ඔබේ සිනාවෙන්',
        ],
      },
    ],
  },
  {
    id: 'sanda-eliya',
    title: 'Sanda Eliya',
    artist: 'Rookantha Gunathilake',
    key: 'Dm',
    bpm: 118,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731790000000,
    sections: [
      makeSection('Intro', ['Dm', 'Gm', 'C', 'F', 'Bb', 'Gm', 'A7', 'Dm'], { 0: 'Intro' }),
      makeSection('Chorus', ['Dm', 'Dm', 'Gm', 'Gm', 'C', 'C', 'F', 'A7', 'Dm', 'Bb', 'A7', 'Dm'], { 0: 'Chorus' }),
    ],
    lyrics: [
      {
        id: 'lyr-se-1',
        label: 'Chorus',
        lines: [
          'සඳ එළිය ගලා එන රැයේ',
          'ඔබෙ රුව මැවී පෙනේ හදේ',
        ],
      },
    ],
  },
  {
    id: 'piyumehi-pani',
    title: 'Piyumehi Pani Bothi',
    artist: 'Victor Rathnayake',
    key: 'F',
    bpm: 104,
    timeSignature: '4/4',
    transpose: 0,
    updatedAt: 1731780000000,
    sections: [
      makeSection('Intro', ['F', 'Bb', 'C7', 'F', 'Dm', 'Gm', 'C7', 'F'], { 0: 'Intro' }),
      makeSection('Chorus', ['F', 'F', 'Bb', 'Bb', 'C', 'C7', 'F', 'F'], { 0: 'Chorus' }),
    ],
    lyrics: [
      {
        id: 'lyr-ppb-1',
        label: 'Chorus',
        lines: [
          'පියුමෙහි පැණි බොති වන බඹරු',
          'මලකට පෙම් බැඳි මගෙ මිතුරු',
        ],
      },
    ],
  },
];

export const INITIAL_SETLISTS: Setlist[] = [
  {
    id: 'setlist-podium',
    name: 'Podium',
    songIds: INITIAL_SONGS.map((s) => s.id),
    createdAt: 1731900000000,
  },
  {
    id: 'setlist-sunday',
    name: 'Sunday warm-up',
    songIds: [],
    createdAt: 1731890000000,
  },
  {
    id: 'setlist-acoustic',
    name: 'Acoustic Unplugged',
    songIds: ['daiwa-yogayakin', 'hanthanata-payana-sanda', 'ninda-nena-rathriye'],
    createdAt: 1731880000000,
  },
];
