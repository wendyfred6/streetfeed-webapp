// ─── DEMO MOCK DATA ────────────────────────────────────────────────────────────
// Used when the app is loaded with ?demo in the URL.

const now = Date.now();
const ago = (mins) => new Date(now - mins * 60 * 1000).toISOString();
const inDays = (d) => new Date(now + d * 24 * 3600 * 1000).toISOString();

export const DEMO_USER = {
  id: 1,
  name: 'Wendy',
  email: 'wendy@streetfeed.nl',
  house_number: '12',
  is_super_admin: true,
  memberships: [{ streetId: 1, status: 'approved', role: 'admin' }],
};

export const DEMO_STREET = {
  id: 1,
  name: 'Reyer Anslostraat',
  households: 111,
  members: 34,
  status: 'approved',
  role: 'admin',
};

export const DEMO_POSTS = [
  {
    id: 1,
    category: 'blockage',
    title: 'Straat afgesloten voor asfaltwerkzaamheden',
    body: 'De gemeente heeft laten weten dat de straat van maandag t/m vrijdag afgesloten is voor groot onderhoud aan het wegdek. Bereikbaar via de Amstelkade.',
    pinned: true,
    end_date: inDays(4),
    link: 'https://www.amsterdam.nl/zoeken/?Zoe=werkzaamheden&current_page=1',
    author_name: 'Wendy',
    author_role: 'admin',
    likes: 8, liked: false, comments: 3,
    created_at: ago(180),
    reported: false,
  },
  {
    id: 2,
    category: 'event',
    title: 'Buurtbarbecue – zaterdag 7 juni! 🎉',
    body: 'Gezellige barbecue voor alle bewoners. Kinderen meer dan welkom! Geef je op via RSVP zodat we weten hoeveel vlees we moeten inslaan.',
    pinned: true,
    end_date: inDays(11),
    event_date: '7 juni 2025',
    event_time: '15:00',
    event_location: 'Gemeenschappelijke tuin, nr. 50–60',
    bring_list: ['Salades', 'Brood & kaas', 'Drinken', 'Stoelen/kleedjes'],
    rsvp: { yes: ['Wendy', 'Mark', 'Sophie', 'Pieter', 'Lisa'], maybe: ['Thomas', 'Anna'], no: [] },
    my_rsvp: 'yes',
    author_name: 'Wendy',
    author_role: 'admin',
    likes: 15, liked: true, comments: 7,
    created_at: ago(300),
    reported: false,
  },
  {
    id: 3,
    category: 'incident',
    title: 'Aanrijding geparkeerde auto voor nr. 38',
    body: 'Gisteravond rond 23:00 is een geparkeerde auto aangereden. De bestuurder reed door zonder te stoppen. Heeft iemand het gezien?',
    pinned: false,
    license_plate: 'GH-123-X',
    author_name: 'Mark',
    author_role: 'resident',
    likes: 12, liked: false, comments: 5,
    created_at: ago(720),
    reported: false,
  },
  {
    id: 4,
    category: 'package',
    title: 'Pakket verkeerd bezorgd – voor nr. 31',
    body: 'Er ligt een pakketje bij mij (nr. 29) dat voor nr. 31 is. Staat op naam van R. de Boer. Gewoon aanbellen!',
    pinned: false,
    carrier: 'PostNL',
    author_name: 'Sophie',
    author_role: 'resident',
    likes: 3, liked: false, comments: 2,
    created_at: ago(90),
    reported: false,
  },
  {
    id: 5,
    category: 'container',
    title: 'Puincontainer geplaatst voor nr. 22',
    body: 'Verbouwing loopt t/m ca. 15 juni. De container staat aan de rechterkant van de inrit. Sorry voor het ongemak!',
    pinned: true,
    end_date: inDays(19),
    link: 'https://www.omgevingsloket.nl/',
    attachment_name: 'vergunning-container-nr22.pdf',
    author_name: 'Thomas',
    author_role: 'moderator',
    likes: 2, liked: false, comments: 0,
    created_at: ago(4320),
    reported: false,
  },
  {
    id: 6,
    category: 'waste',
    title: 'Grofvuil naast de afvalcontainers',
    body: 'Er staat weer een oud bankstel naast de containers op de hoek Amstelkade. Heeft iemand de gemeente al gebeld?',
    pinned: false,
    link: 'https://meldingen.amsterdam.nl/incident/beschrijf',
    author_name: 'Pieter',
    author_role: 'resident',
    likes: 6, liked: false, comments: 4,
    created_at: ago(1440),
    reported: false,
  },
  {
    id: 7,
    category: 'general',
    title: 'Wie heeft interesse in gezamenlijk composteren?',
    body: 'Ik wil een compostbak starten voor de tuin bij nr. 40–60. Zijn er meer bewoners die mee willen doen? Dan wordt het goedkoper en leuker.',
    pinned: false,
    allow_join: true,
    joiners: ['Lisa', 'Pieter', 'Anna'],
    my_join: false,
    author_name: 'Lisa',
    author_role: 'resident',
    likes: 9, liked: false, comments: 11,
    created_at: ago(2880),
    reported: false,
  },
];

export const DEMO_PENDING = [
  { id: 10, name: 'Jan de Vries', house_number: '23', email: 'jan.devries@gmail.com', created_at: ago(120) },
  { id: 11, name: 'Fatima El Azizi', house_number: '47', email: 'fatima@example.nl', created_at: ago(360) },
];

export const DEMO_MEMBERS = [
  { id: 1,  name: 'Wendy',    house_number: '12', role: 'admin' },
  { id: 2,  name: 'Thomas',   house_number: '22', role: 'moderator' },
  { id: 3,  name: 'Mark',     house_number: '7',  role: 'resident' },
  { id: 4,  name: 'Sophie',   house_number: '29', role: 'resident' },
  { id: 5,  name: 'Pieter',   house_number: '38', role: 'resident' },
  { id: 6,  name: 'Lisa',     house_number: '15', role: 'resident' },
  { id: 7,  name: 'Anna',     house_number: '51', role: 'resident' },
  { id: 8,  name: 'Dirk',     house_number: '63', role: 'resident' },
  { id: 9,  name: 'Nadia',    house_number: '8',  role: 'resident' },
];

export const DEMO_PUSH_SETTINGS = Object.fromEntries(
  ['bezorging', 'straatzaken', 'melding', 'evenement'].map(k => [k, true])
);

export const DEMO_HALL_OF_FAME = {
  titles: [
    { key: 'pakketkoning', label: 'Pakketkoning(in)', winner: { name: 'Sophie', houseNumber: '29', count: 14 } },
    { key: 'uitleningen', label: 'Meeste Uitleningen', winner: { name: 'Mark', houseNumber: '7', count: 6 } },
    { key: 'aanbevelingen', label: 'Meeste Aanbevelingen', winner: null },
  ],
  thisMonth: {
    packagesDelivered: 23,
    itemsLent: 5,
    eventsOrganized: 2,
    recommendationsPosted: 0,
  },
};
