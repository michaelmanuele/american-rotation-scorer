/**
 * American Rotation rules summary content.
 *
 * Source: AMRO-Rules-Summary.docx (provided by user).
 * Structure is editable — add/remove sections or bullets and the
 * RulesModal will re-render. Keep bullets concise; long prose is fine
 * (the modal is scrollable) but short scans better on a phone/iPad
 * during a live match.
 */

export type RulesSection = {
  title: string;
  bullets: string[];
};

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: 'Rules Summary',
    bullets: [
      'Players lag (or flip) for first break. Alternate break thereafter.',
      'Rack: 15 in front; 2 and 3 in the next row; 1-ball in the middle; 13 and 14 in the row behind the 1. All other balls placed at random.',
      'First player breaks. Anything made on the break is credited to the breaker, except on a scratch — then the opponent gets the points. Only spot balls if knocked off the table.',
      'After the break, the incoming player gets ball in hand anywhere to begin the run. Play in rotation, 1 through 15.',
      'Call shot AND call safe. Call all safes and anything non-obvious (combos, banks, etc.). Rule of thumb: shooting toward a pocket = going for the ball unless stated; shooting away or kicking = safe unless stated. Be reasonable — if someone forgets, give them the benefit of the doubt.',
      'If you make the called ball, you get credit for it and any other balls made on the shot. Balls 1–10 = 1 point each; balls 11–15 = 2 points each. 20 points per rack; matches to 120 typically run 9–11 racks.',
      'If you miss the called ball, your opponent can play the shot or make you shoot again. This eliminates much of the unintentional "luck" on misses.',
      'On any foul, any balls made are credited to the opponent and they get ball in hand.',
    ],
  },
  {
    title: 'Special Situations (vs. 9-Ball)',
    bullets: [
      'Reminder: call shot AND call safe. Be reasonable if someone forgets and the safe was obvious.',
      'On any miss, opponent can shoot or make you shoot again.',
      'If you miss but accidentally make another ball — or make the called ball in the wrong pocket — the ball stays down and the incoming player can pass or shoot. Whoever shoots next gets credit for the prior pocketed balls.',
      'On a called safety, if you accidentally make a ball it nullifies the safe and behaves like a miss: opponent can shoot or pass, and whoever shoots gets credit for the made ball.',
      'Cue-ball fouls only — unless you disturb an object ball that interferes with the next shot or move multiple balls.',
      'Jumping allowed with primary playing cue only (no jump cues, break cues, or alternate playing cues).',
      'Three-foul rule: player must be notified after 2 fouls (like 9-ball). On the 3rd foul, incoming player gets a free shot — ball in hand, can shoot any ball in any order, break up clusters, smash all the balls, etc. Any balls made count for the shooter. After the free shot, the shooter continues with ball in hand as if it were a normal foul.',
    ],
  },
];
