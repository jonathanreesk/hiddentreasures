import { createElement } from 'react';
import { config, fields, collection, singleton } from '@keystatic/core';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (d?: string | null) => (d ? `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}` : '');
const chicagoToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

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

const videoFile = (label: string) =>
  fields.file({
    label,
    description: 'Optional. Short MP4 clips only (under 50 MB). For longer videos, upload to YouTube and paste the link instead.',
    directory: 'public/videos',
    publicPath: '/videos/',
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
    brand: {
      name: 'Editor',
      mark: () => createElement('img', { src: '/images/brand/wordmark-red.png', alt: '', width: 120, height: 24, style: { display: 'block', width: 120, height: 'auto' } }),
    },
    navigation: {
      'Everyday edits': ['events', 'announcement', 'homeVideo', 'tagSale', 'settings'],
      'Photos and videos': ['gallery', 'pageImages'],
      'Pages': ['home', 'donate', 'work', 'about', 'loyalty', 'partners', 'links', 'stories', 'calendar'],
    },
  },

  collections: {
    // ------------------------------------------------------------- NEWS + EVENTS
    events: collection({
      label: '📅 Events, sales and news',
      slugField: 'title',
      path: 'content/events/*',
      format: { data: 'yaml' },
      columns: ['title', 'startDate', 'type'],
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
        startDate: fields.date({ label: 'Date', description: 'The day it happens (or starts). For news, the day you post it.', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        endDate: fields.date({ label: 'End date (optional)', description: 'Only for things that run several days, like the Christmas Market. It drops off the site 2 days after this date.' }),
        timeText: fields.text({ label: 'Time', description: 'For example: Mon to Sat, 10am to 6pm' }),
        location: fields.text({ label: 'Where', defaultValue: 'Main store' }),
        badge: fields.text({ label: 'Small label (optional)', description: 'For example: Grand opening' }),
        summary: fields.text({ label: 'One-line summary', multiline: true }),
        body: fields.text({ label: 'Full details', multiline: true, description: 'Leave a blank line between paragraphs' }),
        image: image('Photo or flyer', 'Optional. Wide images look best.'),
        videoUrl: fields.url({ label: 'Video link (optional)', description: 'Paste a YouTube or Vimeo link and it will play on the page' }),
        videoUpload: videoFile('Or upload a short video'),
        gallery: fields.array(
          fields.object({ image: image('Photo'), caption: fields.text({ label: 'Caption (optional)' }) }),
          { label: 'More photos', itemLabel: (p) => p.fields.caption.value || 'Photo' }
        ),
        pinned: fields.checkbox({ label: 'Feature on the homepage', description: 'Shows it as the big card on the homepage while it is current', defaultValue: false }),
      },
    }),

    // ------------------------------------------------------------- STORIES
    stories: collection({
      label: '💬 Stories',
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
      label: '🕘 Store info and hours',
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
        openHour: fields.integer({ label: 'Opening hour, for the "Open now" badge', description: 'Use the 24-hour clock: 10 means 10am, 13 means 1pm', defaultValue: 10, validation: { min: 0, max: 23 } }),
        closeHour: fields.integer({ label: 'Closing hour, for the "Open now" badge', description: 'Use the 24-hour clock: 19 means 7pm, 18 means 6pm', defaultValue: 19, validation: { min: 1, max: 24 } }),
        instagramUrl: fields.url({ label: 'Instagram link' }),
        facebookUrl: fields.url({ label: 'Facebook link' }),
        giveUrl: fields.url({ label: 'Online giving link (optional)', description: 'Shown quietly in the footer only' }),
        ebayUrl: fields.url({ label: 'eBay store link', description: 'Shop from home' }),
        loyaltyUrl: fields.text({ label: 'Loyalty program link', defaultValue: '/loyalty' }),
        prayerEmail: fields.text({ label: 'Prayer request email', description: 'Where the "Prayer request" link sends email' }),
      },
    }),

    announcement: singleton({
      label: '📣 Top ribbon (announcement)',
      path: 'content/announcement',
      format: { data: 'yaml' },
      schema: {
        enabled: fields.checkbox({ label: '1. Show the ribbon at the top of every page', defaultValue: false }),
        label: fields.text({ label: '2. Small label', description: 'One or two words, for example: Now open', defaultValue: 'Now open' }),
        message: fields.text({ label: '3. Message', description: 'Keep it to one short sentence' }),
        linkText: fields.text({ label: 'Link text', defaultValue: 'Details' }),
        linkUrl: fields.text({ label: 'Link', defaultValue: '/news' }),
        hideAfter: fields.date({ label: 'Hide after (optional)', description: 'The ribbon disappears by itself after this day' }),
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
            hideAfter: fields.date({ label: 'Hide after (optional)', description: 'The slide disappears by itself after this day. Good for seasonal slides.' }),
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
      label: '🏷️ Color tag sale',
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
          {
            label: 'Weeks',
            description: 'Add one row per week. Old weeks can stay; only the current week shows on the site.',
            itemLabel: (p) => {
              const s = p.fields.start.value, e = p.fields.end.value, t = chicagoToday();
              const now = s && e && s <= t && t <= e ? '👉 THIS WEEK: ' : e && e < t ? '(past) ' : '';
              const c = p.fields.color.value;
              return `${now}${shortDate(s)} to ${shortDate(e)}: ${c.charAt(0).toUpperCase() + c.slice(1)} tags ${p.fields.discount.value || ''}`;
            },
          }
        ),
      },
    }),

    // ------------------------------------------------------------- HOMEPAGE VIDEO
    homeVideo: singleton({
      label: '🎬 Homepage video',
      path: 'content/home-video',
      format: { data: 'yaml' },
      schema: {
        show: fields.checkbox({ label: '1. Show the video on the homepage', defaultValue: true }),
        video: fields.file({
          label: '2. Upload the video (MP4)',
          description: 'Short clips under 50 MB work best. For anything longer, leave this empty and paste a YouTube link below.',
          directory: 'public/videos',
          publicPath: '/videos/',
        }),
        youtube: fields.url({ label: 'Or paste a YouTube or Vimeo link instead', description: 'If both are filled in, the link is used.' }),
        title: fields.text({ label: '3. Headline next to the video' }),
        text: fields.text({ label: 'A sentence or two (optional)', multiline: true }),
        cover: image('Cover photo (optional)', 'The still image people see before pressing play. Leave empty to use the first frame.'),
        buttonText: fields.text({ label: 'Button text (optional)', description: 'For example: See market details' }),
        buttonLink: fields.text({ label: 'Button link (optional)', description: 'For example: /news/christmas-market' }),
        hideAfter: fields.date({ label: 'Hide after (optional)', description: 'The video disappears from the homepage by itself after this day' }),
      },
    }),

    // ------------------------------------------------------------- GALLERY
    gallery: singleton({
      label: '🖼️ Photo and video gallery',
      path: 'content/gallery',
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({ label: 'Intro', multiline: true }),
        items: fields.array(
          fields.object({
            kind: fields.select({ label: 'Type', options: [{ label: 'Photo', value: 'photo' }, { label: 'Video', value: 'video' }], defaultValue: 'photo' }),
            image: image('Photo (for a video, this is the cover image)'),
            videoUrl: fields.url({ label: 'Video link (YouTube or Vimeo)' }),
            videoUpload: videoFile('Or upload a short video'),
            caption: fields.text({ label: 'Caption' }),
            altText: fields.text({ label: 'Describe the photo (for screen readers)', description: 'For example: A shopper browsing the women’s clothing racks' }),
            featured: fields.checkbox({ label: 'Show on the homepage and Shop page photo strips', defaultValue: false }),
          }),
          { label: 'Photos and videos', itemLabel: (p) => `${p.fields.kind.value === 'video' ? 'Video' : 'Photo'}: ${p.fields.caption.value || 'untitled'}${p.fields.featured.value ? ' (featured)' : ''}` }
        ),
      },
    }),

    // ------------------------------------------------------------- PAGE IMAGES
    pageImages: singleton({
      label: '🏞️ Page header photos',
      path: 'content/page-images',
      format: { data: 'yaml' },
      schema: {
        donate: image('Donate page'),
        visit: image('Shop page'),
        work: image('Work with us page'),
        news: image('News and events page'),
        loyalty: image('Loyalty program page'),
        partners: image('Partners page'),
        gallery: image('Gallery page'),
      },
    }),

    // ------------------------------------------------------------- CALENDAR GRAPHICS
    calendar: singleton({
      label: 'Monthly calendar graphic',
      path: 'content/calendar',
      format: { data: 'yaml' },
      schema: {
        months: fields.array(
          fields.object({
            month: fields.text({ label: 'Month', description: 'Year and month, for example 2026-12' }),
            image: image('Calendar image (optional)', 'The designed monthly calendar, for example from Canva. Shown under the calendar on the News and events page, with a download link.'),
          }),
          { label: 'Months', itemLabel: (p) => p.fields.month.value }
        ),
      },
    }),

    // ------------------------------------------------------------- LOYALTY
    loyalty: singleton({
      label: 'Loyalty program',
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
