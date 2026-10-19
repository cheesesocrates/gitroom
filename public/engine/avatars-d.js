/* GitRoom visitors: the crowd of fans cheering outside the house, one fan per follower. Same format as pack A. */
(() => {
  const fan = (name, body, tag, o) => ({
    name, tagText: 'FAN', tag, o, npc: true,
    t: { '#': body }, f: { h: '#ff3b5c', f: body[2] },
    q: ['BIG FAN!', 'FOLLOWING ♥', 'STARRED IT!'],
    rows: [
      '................',
      '.....hh..hh.....',
      '.....hhhhhh.....',
      '......hhhh......',
      '....###hh###....',
      '...##########...',
      '..###Ee##Ee###..',
      '..###ee##ee###..',
      '..##p##kk##p##..',
      '..############..',
      '...##########...',
      '....########....',
      '.....ff..ff.....',
      '................',
      '................',
      '................',
    ],
  });
  window.PX_EXTRA = Object.assign(window.PX_EXTRA || {}, {
    fan1: fan('Minty fan', ['#d6fff2', '#7fe8c8', '#3fb894'], '#2a9a78', '#14473a'),
    fan2: fan('Lilac fan', ['#f2e8ff', '#c2a6ff', '#8f6ae8'], '#7a4dff', '#2e1a66'),
    fan3: fan('Peachy fan', ['#fff0e2', '#ffb27a', '#e07a3a'], '#d9601a', '#4a2208'),
    fan4: fan('Sky fan', ['#e2f4ff', '#7fc8ff', '#3a8fd9'], '#2a78c4', '#0f2f5a'),
    fan5: fan('Lemon fan', ['#fffbe0', '#ffe066', '#e0b020'], '#c49a00', '#4a3a00'),
    fan6: fan('Bubblegum fan', ['#ffe8f4', '#ff9fd0', '#e0609e'], '#d9488e', '#4a1030'),
  });
})();
