// Trip data. All times are India Standard Time (IST, UTC+05:30).
//
// place.radius  – metres; you count as "at" a stop when you're inside it.
// place.approx  – true when the coordinates are a best guess. Update these
//                 (and the hotel / Airbnb) with exact pins if you have them.

const P = {
  fort:        { name: 'ISRA Comfort, Fort',          lat: 18.9345, lng: 72.8355, radius: 500, approx: true },
  fortLunch:   { name: 'Fort',                        lat: 18.9330, lng: 72.8345, radius: 600 },
  csmt:        { name: 'CSMT Railway Station',        lat: 18.93986, lng: 72.83552, radius: 300 },
  flora:       { name: 'Flora Fountain',              lat: 18.93250, lng: 72.83150, radius: 350 },
  kalaGhoda:   { name: 'Kala Ghoda',                  lat: 18.92846, lng: 72.83260, radius: 350 },
  causeway:    { name: 'Colaba Causeway',             lat: 18.91950, lng: 72.83150, radius: 450 },
  gateway:     { name: 'Gateway of India',            lat: 18.92197, lng: 72.83457, radius: 300 },
  colaba:      { name: 'Colaba',                      lat: 18.92100, lng: 72.83200, radius: 700 },
  marine:      { name: 'Marine Drive',                lat: 18.94100, lng: 72.82330, radius: 900 },

  rajmachi:    { name: 'Rajmachi Point, Khandala',    lat: 18.7675, lng: 73.3830, radius: 700, approx: true },
  bhushi:      { name: 'Bhushi Dam',                  lat: 18.72251, lng: 73.39542, radius: 400 },
  lion:        { name: "Lion's Point",                lat: 18.70411, lng: 73.38762, radius: 400 },
  tiger:       { name: 'Tiger Point',                 lat: 18.7075, lng: 73.3720, radius: 700, approx: true },
  lonavala:    { name: 'Lonavala town',               lat: 18.7520, lng: 73.4070, radius: 900 },
  lake:        { name: 'Lonavala Lake',               lat: 18.75943, lng: 73.42238, radius: 500 },
  market:      { name: 'Lonavala Market',             lat: 18.7520, lng: 73.4065, radius: 500 },
  airbnb:      { name: 'Airbnb, Lonavala',            lat: 18.7530, lng: 73.4070, radius: 1200, approx: true },

  bandra:      { name: 'Bandra West',                 lat: 19.0552, lng: 72.8305, radius: 1200, approx: true },
  linking:     { name: 'Linking Road',                lat: 19.06227, lng: 72.83555, radius: 600 },
  mountMary:   { name: 'Mount Mary Basilica',         lat: 19.04658, lng: 72.82264, radius: 250 },
  bandraFort:  { name: 'Bandra Fort',                 lat: 19.04186, lng: 72.81838, radius: 300 },
  bandstand:   { name: 'Bandstand Promenade',         lat: 19.05050, lng: 72.82141, radius: 500 },

  juhu:        { name: 'Juhu Beach',                  lat: 19.10265, lng: 72.82468, radius: 800 },
  juhuArea:    { name: 'Juhu',                        lat: 19.09700, lng: 72.82900, radius: 1200 },
  phoenix:     { name: 'Phoenix Marketcity, Kurla',   lat: 19.08628, lng: 72.88922, radius: 400 },
  ltt:         { name: 'Lokmanya Tilak Terminus',     lat: 19.06947, lng: 72.89198, radius: 400 },
};

// kind: 'stop' | 'meal' | 'travel' | 'stay'
// tag:  'must' | 'key' | 'optional' | 'closing' | 'deadline'
export const TRIP = {
  title: 'Mumbai + Lonavala',
  days: [
    {
      n: 1, date: '2026-10-17', weekday: 'Saturday', label: 'Sat 17 Oct',
      title: 'Fort, Colaba & Marine Drive', theme: 'navy',
      stops: [
        { start: '11:00', end: '13:00', kind: 'travel', title: 'Arrive in Mumbai', note: 'Travel to ISRA Comfort in Fort, leave bags and freshen up', place: P.fort },
        { start: '13:00', end: '14:00', kind: 'meal',   title: 'Lunch in Fort', place: P.fortLunch },
        { start: '14:00', end: '14:30', kind: 'stop',   title: 'CSMT Railway Station', note: 'Iconic architecture and photos', place: P.csmt },
        { start: '14:45', end: '15:30', kind: 'stop',   title: 'Flora Fountain & Horniman Circle', note: 'Heritage walk', place: P.flora },
        { start: '15:30', end: '16:15', kind: 'stop',   title: 'Kala Ghoda', note: 'Cafés, colonial architecture and street photography', place: P.kalaGhoda },
        { start: '16:15', end: '17:00', kind: 'stop',   title: 'Colaba Causeway', note: 'Street shopping and snacks', place: P.causeway },
        { start: '17:00', end: '18:15', kind: 'stop',   title: 'Gateway of India & Taj Mahal Palace', note: 'Your main sightseeing stop', tag: 'must', place: P.gateway },
        { start: '18:30', end: '19:30', kind: 'meal',   title: 'Dinner or evening snacks', note: 'Around Colaba', place: P.colaba },
        { start: '20:00', end: '21:30', kind: 'stop',   title: 'Marine Drive', note: "Skyline, sea breeze and the Queen's Necklace", tag: 'must', place: P.marine },
        { start: '22:00', end: '23:30', kind: 'stay',   title: 'Return to Fort and rest', note: 'Early start tomorrow for Lonavala', place: P.fort },
      ],
      notes: [
        { type: 'star', title: "Don't miss", text: 'Gateway of India, Taj Mahal Palace and Marine Drive after dark — the three highest-priority stops for Day 1.' },
      ],
    },
    {
      n: 2, date: '2026-10-18', weekday: 'Sunday', label: 'Sun 18 Oct',
      title: 'Mumbai → Khandala → Lonavala', theme: 'green',
      stops: [
        { start: '05:45', end: '06:15', kind: 'travel', title: 'Pick up the car near Fort', note: 'Leave Mumbai early to beat the traffic', place: P.fort },
        { start: '08:30', end: '09:15', kind: 'stop',   title: 'Rajmachi Point, Khandala', note: 'First mountain viewpoint, photos and tea', place: P.rajmachi },
        { start: '09:45', end: '10:30', kind: 'stop',   title: 'Bhushi Dam', note: 'Quick visit if accessible and the water flow is worthwhile', tag: 'optional', place: P.bhushi },
        { start: '11:00', end: '11:45', kind: 'stop',   title: "Lion's Point", note: 'Valley views and roadside snacks', place: P.lion },
        { start: '12:00', end: '13:00', kind: 'stop',   title: 'Tiger Point', note: 'The main attraction — panoramic views and group photos', tag: 'key', place: P.tiger },
        { start: '13:30', end: '14:30', kind: 'meal',   title: 'Lunch in Lonavala town', place: P.lonavala },
        { start: '14:45', end: '15:30', kind: 'stop',   title: 'Lonavala Lake', note: 'A peaceful stop', tag: 'optional', place: P.lake },
        { start: '15:30', end: '16:30', kind: 'stop',   title: 'Lonavala Market', note: 'Chikki, fudge and shopping', place: P.market },
        { start: '16:30', end: '17:30', kind: 'stay',   title: 'Airbnb check-in', place: P.airbnb },
        { start: '19:30', end: '23:30', kind: 'meal',   title: 'Dinner, music & a relaxed evening', note: 'At the Airbnb', place: P.airbnb },
      ],
      notes: [
        { type: 'star', title: 'Recommendation', text: "Spend the most time at Tiger Point. Lion's Point and Tiger Point have similar scenery, so skip one if you're running late." },
        { type: 'tip', title: 'October note', text: 'October usually brings clear mountain views rather than guaranteed waterfalls — Bhushi Dam is more impressive during the monsoon.' },
      ],
    },
    {
      n: 3, date: '2026-10-19', weekday: 'Monday', label: 'Mon 19 Oct',
      title: 'Lonavala → Bandra → Mumbai nightlife', theme: 'coral',
      stops: [
        { start: '07:30', end: '08:30', kind: 'stay',   title: 'Wake up, breakfast & checkout', note: 'Airbnb checkout', place: P.airbnb },
        { start: '08:30', end: '11:30', kind: 'travel', title: 'Drive from Lonavala to Mumbai', note: 'Allow extra time for traffic', place: P.bandra },
        { start: '11:30', end: '13:00', kind: 'travel', title: 'Return the rental car & drop luggage', note: 'Return car if due; drop bags at your next stay', place: P.bandra },
        { start: '13:00', end: '14:00', kind: 'meal',   title: 'Lunch around Bandra West', place: P.bandra },
        { start: '14:00', end: '15:30', kind: 'stop',   title: 'Linking Road', note: 'Shopping — sneakers, clothes and street stalls', place: P.linking },
        { start: '15:30', end: '16:15', kind: 'stop',   title: 'Mount Mary Basilica', note: 'A peaceful heritage stop', tag: 'optional', place: P.mountMary },
        { start: '16:30', end: '17:30', kind: 'stop',   title: 'Bandra Fort', note: 'Sea views and Sea Link photography', tag: 'closing', place: P.bandraFort },
        { start: '17:30', end: '18:30', kind: 'stop',   title: 'Bandstand Promenade', note: 'Evening walk by the sea', place: P.bandstand },
        { start: '19:00', end: '20:30', kind: 'meal',   title: 'Dinner in Bandra West', place: P.bandra },
        { start: '20:30', end: '23:30', kind: 'stop',   title: 'Pub, live music or café hopping', note: 'Around Bandra West', place: P.bandra },
      ],
      notes: [
        { type: 'star', title: 'Best experience', text: "Visit Bandra Fort before it closes, then walk along Bandstand. To see the Bandra–Worli Sea Link illuminated, take a separate drive later — there's no need to cross the bridge just for photos." },
      ],
    },
    {
      n: 4, date: '2026-10-20', weekday: 'Tuesday', label: 'Tue 20 Oct',
      title: 'Juhu, shopping & return train', theme: 'gold',
      stops: [
        { start: '08:00', end: '09:00', kind: 'stay',   title: 'Breakfast & checkout', note: 'Or leave luggage at your stay', place: P.bandra },
        { start: '09:30', end: '11:00', kind: 'stop',   title: 'Juhu Beach', note: 'Morning walk, photos and seaside atmosphere', place: P.juhu },
        { start: '11:00', end: '12:00', kind: 'meal',   title: 'Explore Juhu or early lunch', place: P.juhuArea },
        { start: '12:30', end: '15:30', kind: 'stop',   title: 'Phoenix Marketcity, Kurla', note: 'Shopping, cafés and entertainment', place: P.phoenix },
        { start: '15:30', end: '16:30', kind: 'stop',   title: 'Snacks & prepare to leave', note: 'Collect luggage if needed', place: P.phoenix },
        { start: '16:30', end: '17:00', kind: 'travel', title: 'Start towards LTT', note: 'Adjust for your actual location', place: P.ltt },
        { start: '18:00', end: '18:30', kind: 'travel', title: 'Arrive at Lokmanya Tilak Terminus', note: 'Target arrival window', tag: 'deadline', place: P.ltt },
        { start: '19:30', end: '19:45', kind: 'travel', title: 'Train departure', tag: 'must', place: P.ltt },
      ],
      // Shown as a live "leave by" countdown on this day.
      deadline: { label: 'Be at LTT', at: '18:30', place: P.ltt, departs: '19:30' },
      notes: [
        { type: 'warn', title: 'Important', text: "Don't schedule another distant attraction late on Tuesday. Mumbai traffic is unpredictable — aim to be at LTT at least 60 minutes before departure." },
      ],
    },
  ],
};
