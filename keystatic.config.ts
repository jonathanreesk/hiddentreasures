import { config, fields, collection, singleton } from '@keystatic/core';

// ---------------------------------------------------------------------------
// Where edits are saved
// - On your computer (npm run dev): edits are saved straight to the files.
// - On Vercel: set PUBLIC_GITHUB_REPO (for example "wesolvedigital/hidden-treasures")
//   and edits are saved as commits to GitHub, which triggers a new deploy.
// ---------------------------------------------------------------------------
const repo = import.meta.env.PUBLIC_GITHUB_REPO as string | undefined;

const storage = repo
  ? { kind: 'github' as const, repo: repo as `${string}/${string}` }
  : { kind: 'local' as const };

const image = (label: string, description?: string) =>
  fields.image({
    label,
    description,
    directory: 'public/images/uploads',
    publicPath: '/images/uploads/',
  });

const link = (label: string) =>
  fields.object(
    {
      label: fields.text({ label: 'Button text' }),
      href: fields.text({ label: 'Link', description: 'A page like /donate, or a full web address' }),
    },
    { label }
  );

export default config({
  storage,
  ui: {
    brand: { name: 'Hidden Treasures' },
    navigation: {
      'Posts': ['events', 'stories'],
      'Site-wide': ['settings', 'announcement', 'tagSale'],
      'Pages': ['home', 'donate', 'work', 'about', 'trove', 'loyalty', 'partners', 'links'],
    },
  },

  collections: {
    // ------------------------------------------------------------- NEWS + EVENTS
    events: collection({
      label: 'News and events',
      slugField: 'title',
      path: 'content/events/*',
      format: { data: 'yaml' },
      columns: ['title', 'startDate'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Event', value: 'event' },
            { label: 'Sale', value: 'sale' },
            { label: 'News', value: 'news' },
          ],
          defaultValue: 'event',
        }),
        startDate: fields.date({ label: 'Date', description: 'For news, use the posting date', validation: { isRequired: true } }),
        endDate: fields.date({ label: 'End date (optional)', description: 'For multi-day events like the Christmas Market' }),
        timeText: fields.text({ label: 'Time', description: 'For example: Mon to Sat, 10am to 6pm' }),
        location: fields.text({ label: 'Where', defaultValue: 'Main store' }),
        badge: fields.text({ label: 'Small label (optional)', description: 'For example: Grand opening' }),
        summary: fields.text({ label: 'One-line summary', multiline: true }),
        body: fields.text({ label: 'Full details', multiline: true, description: 'Leave a blank line between paragraphs' }),
        image: image('Photo or flyer', 'Optional. Wide images look best.'),
        videoUrl: fields.url({ label: 'Video link (optional)', description: 'Paste a YouTube or Vimeo link and it will play on the page' }),
        pinned: fields.checkbox({ label: 'Feature on the homepage', defaultValue: false }),
      },
    }),

    // ------------------------------------------------------------- STORIES
    stories: collection({
      label: 'Stories',
      slugField: 'name',
      path: 'content/stories/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Name', description: 'First name is fine' } }),
        role: fields.text({ label: 'Role or relationship', description: 'For example: Sales floor lead since 2023' }),
        quote: fields.text({ label: 'Short quote (1 to 3 sentences)', multiline: true }),
        photo: image('Photo (optional)'),
        showOnHome: fields.checkbox({ label: 'Show on the homepage', defaultValue: true }),
        order: fields.integer({ label: 'Order (lower shows first)', defaultValue: 10 }),
      },
    }),
  },

  singletons: {
    // ------------------------------------------------------------- SETTINGS
    settings: singleton({
      label: 'Store info and hours',
      path: 'content/settings',
      format: { data: 'yaml' },
      schema: {
        phone: fields.text({ label: 'Phone (displayed)' }),
        email: fields.text({ label: 'Public email' }),
        addressLine1: fields.text({ label: 'Address line 1' }),
        addressLine2: fields.text({ label: 'Address line 2' }),
        mapsUrl: fields.url({ label: 'Google Maps link' }),
        shopHours: fields.array(
          fields.object({ days: fields.text({ label: 'Days' }), hours: fields.text({ label: 'Hours' }) }),
          { label: 'Shop hours', itemLabel: (p) => `${p.fields.days.value}: ${p.fields.hours.value}` }
        ),
        donateHours: fields.array(
          fields.object({ days: fields.text({ label: 'Days' }), hours: fields.text({ label: 'Hours' }) }),
          { label: 'Donation drop-off hours', itemLabel: (p) => `${p.fields.days.value}: ${p.fields.hours.value}` }
        ),
        openDays: fields.multiselect({
          label: 'Days the shop is open (for the "Open now" badge)',
          options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => ({ label: d, value: d })),
          defaultValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        }),
        openHour: fields.integer({ label: 'Opening hour (24h clock)', defaultValue: 10 }),
        closeHour: fields.integer({ label: 'Closing hour (24h clock)', defaultValue: 19 }),
        instagramUrl: fields.url({ label: 'Instagram link' }),
        facebookUrl: fields.url({ label: 'Facebook link' }),
        giveUrl: fields.url({ label: 'Online giving link (optional)', description: 'Shown quietly in the footer only' }),
        ebayUrl: fields.url({ label: 'eBay store link', description: 'Shop from home' }),
        loyaltyUrl: fields.url({ label: 'Treasure Hunter loyalty program link' }),
        prayerEmail: fields.text({ label: 'Prayer request email', description: 'Where the "Prayer request" link sends email' }),
      },
    }),

    announcement: singleton({
      label: 'Announcement bar',
      path: 'content/announcement',
      format: { data: 'yaml' },
      schema: {
        enabled: fields.checkbox({ label: 'Show the bar at the top of every page', defaultValue: false }),
        label: fields.text({ label: 'Small label', defaultValue: 'Now open' }),
        message: fields.text({ label: 'Message' }),
        linkText: fields.text({ label: 'Link text', defaultValue: 'Details' }),
        linkUrl: fields.text({ label: 'Link', defaultValue: '/news' }),
      },
    }),

    // ------------------------------------------------------------- HOME
    home: singleton({
      label: 'Homepage',
      path: 'content/home',
      format: { data: 'yaml' },
      schema: {
        slides: fields.array(
          fields.object({
            eyebrow: fields.text({ label: 'Small text above the headline' }),
            title: fields.text({ label: 'Headline' }),
            body: fields.text({ label: 'Text', multiline: true }),
            image: image('Background image'),
            tint: fields.select({
              label: 'Overlay color',
              options: [
                { label: 'Dark', value: 'dark' },
                { label: 'Brick red', value: 'red' },
              ],
              defaultValue: 'dark',
            }),
            primary: link('Main button'),
            secondary: link('Second button'),
          }),
          { label: 'Slideshow', itemLabel: (p) => p.fields.title.value || 'Slide' }
        ),
        engineTitle: fields.text({ label: '"What your donation turns into" headline' }),
        engineIntro: fields.text({ label: '"What your donation turns into" text', multiline: true }),
      },
    }),

    // ------------------------------------------------------------- DONATE
    donate: singleton({
      label: 'Donate page',
      path: 'content/donate',
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({ label: 'Intro', multiline: true }),
        acceptedIntro: fields.text({ label: '"What we are looking for" intro' }),
        accepted: fields.array(fields.text({ label: 'Category' }), { label: 'We gladly accept', itemLabel: (p) => p.value }),
        cannotTakeIntro: fields.text({ label: '"Some things we cannot take" text', multiline: true }),
        notAccepted: fields.array(fields.text({ label: 'Item' }), { label: 'Please check first / not accepted', itemLabel: (p) => p.value }),
        dropoff: fields.text({ label: 'Drop-off details', multiline: true }),
        pickupsPaused: fields.checkbox({ label: 'Furniture pickups are paused', description: 'Hides the pickup form and shows the message below instead', defaultValue: true }),
        pausedMessage: fields.text({ label: 'Message while pickups are paused', multiline: true }),
        pausedLinkText: fields.text({ label: 'Paused: link text', defaultValue: 'Donate to Habitat ReStore' }),
        pausedLinkUrl: fields.url({ label: 'Paused: link' }),
        pickup: fields.text({ label: 'Pickup details (when pickups are running)', multiline: true }),
        bulk: fields.text({ label: 'Business and bulk donation details', multiline: true }),
        doorTips: fields.array(fields.text({ label: 'Tip' }), { label: '"Be a hero at the donation door" tips', itemLabel: (p) => p.value }),
        whyDonate: fields.text({ label: 'Why people donate', multiline: true }),
        taxNote: fields.text({ label: 'Tax-deductible note' }),
        roundUp: fields.text({ label: 'No items to give? (register round-up text)', multiline: true }),
        faqs: fields.array(
          fields.object({ q: fields.text({ label: 'Question' }), a: fields.text({ label: 'Answer', multiline: true }) }),
          { label: 'Questions and answers', itemLabel: (p) => p.fields.q.value }
        ),
      },
    }),

    // ------------------------------------------------------------- WORK
    work: singleton({
      label: 'Work with us page',
      path: 'content/work',
      format: { data: 'yaml' },
      schema: {
        headline: fields.text({ label: 'Headline', defaultValue: "You're welcome here." }),
        intro: fields.text({ label: 'Intro', multiline: true }),
        whatToExpect: fields.array(fields.text({ label: 'Point' }), { label: 'What to expect', itemLabel: (p) => p.value }),
        hiring: fields.checkbox({ label: 'We are currently hiring', defaultValue: true }),
        applyHeading: fields.text({ label: 'Apply section heading', defaultValue: 'Interested in joining our team?' }),
        applyText: fields.text({ label: 'Apply section text', multiline: true }),
        applyButton: fields.text({ label: 'Apply button text', defaultValue: 'Fill out the expression of interest form' }),
        questionsEmail: fields.text({ label: 'Email for questions about working here' }),
        roles: fields.array(fields.object({ title: fields.text({ label: 'Role' }), text: fields.text({ label: 'What it involves', multiline: true }) }), { label: 'Kinds of work', itemLabel: (p) => p.fields.title.value }),
        faithText: fields.text({ label: 'Faith at work note', multiline: true }),
        nextSteps: fields.array(fields.object({ title: fields.text({ label: 'Step' }), text: fields.text({ label: 'Details', multiline: true }) }), { label: 'What happens after you apply', itemLabel: (p) => p.fields.title.value }),
        nextStepsNote: fields.text({ label: 'Note under the steps', multiline: true }),
        applyFormUrl: fields.url({ label: 'Job interest form link (optional)', description: 'The Google Form the Apply buttons open. Clear it to use the built-in form instead.' }),
        referText: fields.text({ label: 'Refer someone section text', multiline: true }),
        volunteerText: fields.text({ label: 'Volunteer section text', multiline: true }),
        serviceHoursText: fields.text({ label: 'Court-ordered service hours text', multiline: true }),
        volunteerNote: fields.text({ label: 'What volunteers should know', multiline: true }),
        volunteerTasks: fields.array(fields.text({ label: 'Task' }), { label: 'Example volunteer tasks', itemLabel: (p) => p.value }),
        volunteerAge: fields.text({ label: 'Age requirement' }),
        volunteerFormUrl: fields.url({ label: 'Volunteer form link (optional)', description: 'The Google Form the Volunteer button opens. Clear it to use the built-in form instead.' }),
      },
    }),

    // ------------------------------------------------------------- TAG SALE
    tagSale: singleton({
      label: 'Color tag sale',
      path: 'content/tag-sale',
      format: { data: 'yaml' },
      schema: {
        enabled: fields.checkbox({ label: 'Show the "This week\'s tag sale" banner', defaultValue: true }),
        weeks: fields.array(
          fields.object({
            start: fields.date({ label: 'Week starts', validation: { isRequired: true } }),
            end: fields.date({ label: 'Week ends', validation: { isRequired: true } }),
            color: fields.select({
              label: 'Tag color',
              options: ['Blue', 'Green', 'Red', 'Yellow', 'Orange', 'Purple', 'Pink', 'White'].map((c) => ({ label: c, value: c.toLowerCase() })),
              defaultValue: 'blue',
            }),
            discount: fields.text({ label: 'Discount', description: 'For example: 50% off' }),
          }),
          { label: 'Weeks', itemLabel: (p) => `${p.fields.start.value}: ${p.fields.color.value} tags ${p.fields.discount.value}` }
        ),
      },
    }),

    // ------------------------------------------------------------- THE TROVE
    trove: singleton({
      label: 'The Trove (pop-up boutique)',
      path: 'content/trove',
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({ label: 'Intro', multiline: true }),
        address: fields.text({ label: 'Address' }),
        status: fields.select({
          label: 'Right now the Trove is',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Closed between pop-ups', value: 'closed' },
          ],
          defaultValue: 'open',
        }),
        current: fields.text({ label: 'Current or next pop-up', description: 'For example: Christmas Market' }),
        currentDetails: fields.text({ label: 'Its dates and hours', multiline: true }),
        currentLink: fields.text({ label: 'Link for more details', description: 'For example /news/christmas-market' }),
        past: fields.array(
          fields.object({ name: fields.text({ label: 'Pop-up name' }), text: fields.text({ label: 'What it was', multiline: true }) }),
          { label: 'Past pop-ups', itemLabel: (p) => p.fields.name.value }
        ),
        gallery: fields.array(image('Photo'), { label: 'Photo gallery' }),
      },
    }),

    // ------------------------------------------------------------- LOYALTY
    loyalty: singleton({
      label: 'Treasure Hunters (loyalty)',
      path: 'content/loyalty',
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({ label: 'Intro', multiline: true }),
        perks: fields.array(fields.text({ label: 'Perk' }), { label: 'Perks', itemLabel: (p) => p.value }),
        profilePitch: fields.text({ label: 'Complete-your-profile pitch', multiline: true }),
      },
    }),

    // ------------------------------------------------------------- LINKS (link-in-bio page)
    links: singleton({
      label: 'Links page (/links)',
      path: 'content/links',
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({ label: 'Short intro' }),
        items: fields.array(
          fields.object({
            label: fields.text({ label: 'Button text' }),
            href: fields.text({ label: 'Link', description: 'A page like /donate, a full web address, or mailto:someone@example.org' }),
            highlight: fields.checkbox({ label: 'Highlight in red', defaultValue: false }),
          }),
          { label: 'Buttons', itemLabel: (p) => p.fields.label.value }
        ),
      },
    }),

    // ------------------------------------------------------------- PARTNERS
    partners: singleton({
      label: 'Partners page',
      path: 'content/partners',
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({ label: 'Intro', multiline: true }),
        note: fields.text({ label: 'Note under the list', multiline: true }),
        items: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            url: fields.url({ label: 'Website' }),
            description: fields.text({ label: 'One or two sentences', multiline: true }),
            focus: fields.select({
              label: 'Focus area',
              options: [
                { label: 'Recovery and housing', value: 'recovery' },
                { label: 'Youth and education', value: 'youth' },
                { label: 'Global mission', value: 'global' },
                { label: 'Prayer', value: 'prayer' },
              ],
              defaultValue: 'recovery',
            }),
            logo: image('Logo (optional)', 'A transparent PNG or SVG works best. Without a logo, a badge with their initials is shown.'),
            logoOnDark: fields.checkbox({ label: 'Logo is white or light (show it on a dark tile)', defaultValue: false }),
          }),
          { label: 'Partner ministries', itemLabel: (p) => p.fields.name.value }
        ),
      },
    }),

    // ------------------------------------------------------------- ABOUT
    about: singleton({
      label: 'Our story page',
      path: 'content/about',
      format: { data: 'yaml' },
      schema: {
        headline: fields.text({ label: 'Headline' }),
        intro: fields.text({ label: 'Intro', multiline: true }),
        mission: fields.text({ label: 'Mission statement' }),
        story: fields.text({ label: 'Our story', multiline: true, description: 'Leave a blank line between paragraphs' }),
        convictions: fields.array(fields.text({ label: 'Conviction' }), { label: 'Core convictions', itemLabel: (p) => p.value }),
        faith: fields.text({ label: 'Our faith', multiline: true }),
        partnersNote: fields.text({ label: 'Our partners (short note)', multiline: true }),
        image: image('Photo'),
      },
    }),
  },
});
