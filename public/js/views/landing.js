(function () {
  const { h } = UI;
  function Hero(go) {
    return h('section', { class: 'landing' },
      h('div', {},
        h('h1', {}, 'Reading is ', h('span', { class: 'accent' }, 'fun!')),
        h('p', {}, 'ReadyABC turns letters, sounds, and first words into a daily adventure for children aged 3–8.'),
        h('div', { class: 'landing-cta' },
          h('button', { class: 'btn btn-primary btn-big', onclick: () => go('/register') }, 'Start free'),
          h('button', { class: 'btn btn-ghost btn-big', onclick: () => go('/login') }, 'I already have an account'),
        ),
      ),
      h('div', { class: 'landing-art' }, '🦊'),
    );
  }
  function Features() {
    const items = [
      { emoji: '🔤', title: 'Phonics first',
        text: 'Children learn letter sounds before words — the foundation of fluent reading.' },
      { emoji: '🎮', title: 'Gamified lessons',
        text: 'XP, stars, daily streaks and badges keep kids motivated to come back every day.' },
      { emoji: '👨‍👩‍👧', title: 'Parent dashboard',
        text: 'Track your child\'s progress, badges and active days in one calm, clear view.' },
      { emoji: '🛡️', title: 'Safe by design',
        text: 'No ads, no chat, no external links. Children only see lessons made for them.' },
    ];
    return h('section', { class: 'lp-section', id: 'features' },
      h('h2', { class: 'lp-title' }, 'Why families love ReadyABC'),
      h('p', { class: 'lp-subtitle' }, 'Built around how young children actually learn to read.'),
      h('div', { class: 'feature-grid' },
        ...items.map((it) => h('div', { class: 'feature-card' },
          h('div', { class: 'feature-emoji' }, it.emoji),
          h('h3', {}, it.title),
          h('p', {}, it.text),
        )),
      ),
    );
  }
  function HowItWorks() {
    const steps = [
      { n: '1', title: 'Create a parent account',  text: 'Sign up in under a minute — just an email and password.' },
      { n: '2', title: 'Add your child',           text: 'Pick a name, age (3–8) and a friendly avatar.' },
      { n: '3', title: 'Start the first lesson',  text: 'Your child meets letter A and earns their first stars.' },
      { n: '4', title: 'Watch progress grow',     text: 'New lessons unlock and badges appear on the parent dashboard.' },
    ];
    return h('section', { class: 'lp-section lp-alt', id: 'how' },
      h('h2', { class: 'lp-title' }, 'How it works'),
      h('p', { class: 'lp-subtitle' }, 'Four steps from sign-up to your child\'s first reading streak.'),
      h('div', { class: 'steps-grid' },
        ...steps.map((s) => h('div', { class: 'step-card' },
          h('div', { class: 'step-num' }, s.n),
          h('h3', {}, s.title),
          h('p', {}, s.text),
        )),
      ),
    );
  }
  function About() {
    return h('section', { class: 'lp-section', id: 'about' },
      h('div', { class: 'about-row' },
        h('div', { class: 'about-art' }, '📚'),
        h('div', { class: 'about-text' },
          h('h2', { class: 'lp-title left' }, 'About ReadyABC'),
          h('p', {},
            'ReadyABC is a learn-to-read platform for children aged 3 to 8. ',
            'We combine phonics, sight words and vocabulary into short, playful daily lessons ',
            'that fit into family life — no homework, no pressure, just five minutes of reading practice a day.'),
          h('p', {},
            'The platform was built as a full-stack engineering project: ',
            'a Node.js + Express backend with PostgreSQL via Prisma, a child-friendly web frontend, ',
            'and a parent dashboard with progress tracking. Every interaction is gamified so kids ',
            'come back tomorrow on their own.'),
        ),
      ),
    );
  }
  function FinalCTA(go) {
    return h('section', { class: 'lp-cta' },
      h('h2', {}, 'Ready to start the adventure?'),
      h('p', {}, 'Free to try. No credit card. Your child\'s first lesson is waiting.'),
      h('div', { class: 'landing-cta center' },
        h('button', { class: 'btn btn-accent btn-big', onclick: () => go('/register') }, 'Create a parent account'),
      ),
    );
  }
  function Footer() {
    const year = new Date().getFullYear();
    return h('footer', { class: 'lp-footer' },
      h('div', { class: 'lp-footer-grid' },
        h('div', { class: 'lp-footer-col' },
          h('div', { class: 'lp-footer-brand' },
            h('span', {}, '📖'), h('strong', {}, 'ReadyABC'),
          ),
          h('p', { class: 'lp-footer-tag' }, 'Reading made fun for ages 3–8.'),
        ),
        h('div', { class: 'lp-footer-col' },
          h('h4', {}, 'Platform'),
          linkRow('Features',     '#features'),
          linkRow('How it works', '#how'),
          linkRow('About',        '#about'),
        ),
        h('div', { class: 'lp-footer-col' },
          h('h4', {}, 'Account'),
          linkRow('Sign in',       '#/login'),
          linkRow('Create account','#/register'),
        ),
        h('div', { class: 'lp-footer-col' },
          h('h4', {}, 'Contact'),
          h('p', { class: 'lp-footer-line' }, 'hello@readyabc.local'),
          h('p', { class: 'lp-footer-line' }, 'Made by ReadyABC team'),
        ),
      ),
      h('div', { class: 'lp-footer-bottom' },
        h('span', {}, `© ${year} ReadyABC. All rights reserved.`),
        h('span', { class: 'lp-footer-spacer' }, '·'),
        h('span', {}, 'Privacy'),
        h('span', { class: 'lp-footer-spacer' }, '·'),
        h('span', {}, 'Terms'),
      ),
    );
  }

  function linkRow(label, href) {
    return h('a', { class: 'lp-footer-link', href }, label);
  }

  function Landing(go) {
    return h('div', { class: 'landing-root' },
      Hero(go),
      Features(),
      HowItWorks(),
      About(),
      FinalCTA(go),
      Footer(),
    );
  }

  Views.Landing = Landing;
})();