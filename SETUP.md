# Hidden Treasures website: setup guide

This is the new hiddentreasuresmn.org site. It is built with **Astro**, hosted on **Vercel**, and has a built-in editor called **Keystatic**. Store staff use the editor to change hours, post events and update pages. Nobody touches code.

**How it fits together**

```
Staff edit at hiddentreasuresmn.org/keystatic
        │  (Save)
        ▼
Keystatic saves the change to the GitHub repo
        │  (new commit)
        ▼
Vercel sees the commit and rebuilds the site (about 1 minute)
        │
        ▼
The live site updates
```

Forms (pickup requests, job applications, referrals, newsletter and so on) are emailed to the store through **SendGrid**.

---

## What is in the project

| Path | What it is |
|---|---|
| `content/` | **All the editable content.** Editors change these files through Keystatic. You can also edit them by hand. |
| `content/events/` | One file per news post, sale or event |
| `content/stories/` | One file per story (empty for now) |
| `content/settings.yaml` | Phone, email, address, hours, social links |
| `content/announcement.yaml` | The red bar at the top of the site |
| `content/home.yaml` etc. | Text for the homepage, Donate, Work with us and Our story pages |
| `keystatic.config.ts` | **The editor's configuration.** It defines which fields staff see and what each one is called. |
| `src/pages/` | One file per page (`/donate`, `/visit`, `/work-with-us`, `/our-story`, `/news`) |
| `src/components/` | Reusable pieces: hero slider, forms, event cards, footer and so on |
| `src/styles/global.css` | Brand colors, fonts and all styling |
| `src/pages/api/submit.ts` | The form handler, which sends email through SendGrid |
| `public/images/` | Logos (`brand/`) and uploaded photos (`uploads/`) |
| `.env.example` | The settings you need to add in Vercel |

---

## Step 1: Run it on your computer

You need Node.js 22 or newer.

```bash
npm install
npm run dev
```

- The site runs at http://localhost:4321
- The editor runs at http://localhost:4321/keystatic. On your computer it saves straight to the files in `content/`.

---

## Step 2: Put it on GitHub

1. Create a **private** repo, for example `wesolvedigital/hidden-treasures`. Ideally put it in an org the ministry owns so it stays with them long-term.
2. Push the project:

```bash
git init
git add .
git commit -m "Hidden Treasures website"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/hidden-treasures.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel

1. In Vercel, click **Add New → Project** and import the GitHub repo.
2. Vercel detects **Astro** automatically. Leave the build settings as they are.
3. Before the first deploy, open **Environment Variables** and add the SendGrid values (Step 5). You can add the editor values later.
4. Click **Deploy**. You get a link like `hidden-treasures.vercel.app`.

From now on, every push to `main` redeploys the site automatically.

---

## Step 4: Turn on the online editor

This step lets staff edit on the live site, so changes are saved to GitHub instead of to your computer. You only do it once.

**4a. Connect Keystatic to GitHub (on your computer)**

1. Create a file called `.env` in the project folder containing:
   ```
   PUBLIC_GITHUB_REPO=YOUR-ORG/hidden-treasures
   ```
2. Run `npm run dev` and open http://localhost:4321/keystatic.
3. Click **Log in with GitHub**. Keystatic opens a setup page that **creates a GitHub App** for you. Give it a name like "Hidden Treasures Editor" and install it on the repo.
4. When you're done, Keystatic writes four more values into your `.env`:
   ```
   KEYSTATIC_GITHUB_CLIENT_ID=...
   KEYSTATIC_GITHUB_CLIENT_SECRET=...
   KEYSTATIC_SECRET=...
   PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=...
   ```

**4b. Give Vercel the same values**

1. In Vercel, go to **Project → Settings → Environment Variables** and add all five values from your `.env` (`PUBLIC_GITHUB_REPO` plus the four above).
2. In GitHub, go to **Settings → Developer settings → GitHub Apps**, open your app, and add a **Callback URL** for each address the editor will be used from:
   ```
   https://hidden-treasures.vercel.app/api/keystatic/github/oauth/callback
   https://hiddentreasuresmn.org/api/keystatic/github/oauth/callback
   ```
3. Redeploy in Vercel (**Deployments → ⋯ → Redeploy**).

The editor is now live at **/keystatic**. `/admin` also redirects there.

> Never commit `.env` to GitHub. It is already listed in `.gitignore`.

---

## Step 5: Set up form emails (SendGrid)

1. In SendGrid, verify the domain `hiddentreasuresmn.org`. If you can't, verify a single sender address instead.
2. Create an API key with **Mail Send** permission only.
3. Add these in Vercel → Environment Variables:

| Name | Example |
|---|---|
| `SENDGRID_API_KEY` | `SG.xxxx` |
| `FORM_TO_EMAIL` | `hello@hiddentreasuresmn.org`. To send to more than one inbox, separate addresses with commas. |
| `FORM_FROM_EMAIL` | `website@hiddentreasuresmn.org` (must be a verified sender) |

Every form includes the visitor's email as **reply-to**, so staff can hit Reply. Each form also has a hidden spam trap.

**Forms on the site:** newsletter, pickup request, business or bulk donation, job application, referral, volunteer, and share your story.

---

## Step 6: Give store staff access

Each editor needs a **free GitHub account**.

1. Ask each person to create an account at github.com.
2. In the repo, go to **Settings → Collaborators** and invite them with **Write** access.
3. Send them to **hiddentreasuresmn.org/keystatic** and have them click **Log in with GitHub**.

To remove someone later, take them off the repo's collaborators list.

*If GitHub accounts are a hurdle for staff:* Keystatic also offers a hosted login service called Keystatic Cloud. Check keystatic.com for its current plans before choosing it.

---

## Step 7: Point the domain at Vercel

1. In Vercel, go to **Project → Settings → Domains** and add `hiddentreasuresmn.org` and `www.hiddentreasuresmn.org`.
2. Vercel shows the exact DNS records to create. Add them wherever the domain's DNS is managed today (probably Squarespace Domains).
3. **Leave the email records (MX, SPF, DKIM) alone**, or the store's email will stop working.
4. When the new site is live, cancel the Squarespace website plan, but keep the domain registration.

---

## Old links: where they go now

Every address from the old Squarespace site still works, so Instagram bios, printed flyers, QR codes and bookmarks won't break. Each one redirects (301) to its new home. The redirects are set in `astro.config.mjs`.

| Old address | New home |
|---|---|
| `/links` | `/links`: a new link-in-bio page. Staff edit its buttons under **Links page**. |
| `/donate` | `/donate` |
| `/work` | `/work-with-us` |
| `/volunteer` | `/work-with-us#volunteer` |
| `/pickup` | `/donate#pickup` (shows the "pickups paused" message) |
| `/sales` | `/news` |
| `/about` | `/our-story` |
| `/partners` | `/partners` (new page, editable) |
| `/search`, `/home` | `/` (home) |
| `/email` | `/#newsletter` (the newsletter signup) |
| `/loyalty` | `/loyalty`: rebuilt Treasure Hunters page, including the "Complete your profile" form |
| `/trove` | `/trove`: rebuilt page for the Trove pop-up boutique |
| eBay store, Jericho Road, prayer request email | Buttons on `/links`, plus links in the footer and on the Shop page |

**Important:** the old Treasure Hunters "Complete your profile" form was a Squarespace form, so it stops working when Squarespace is cancelled. The new site has its own copy of that form with the same fields, emailed to the store through SendGrid. Export any existing profile submissions from Squarespace (Contacts or Form Storage) before you cancel.

The existing Google Forms for job interest and volunteering are still used: the Apply and Volunteer buttons open them. To use the site's own built-in forms instead, clear those links under **Work with us page** in the editor.

## Before launch: content to fill in

These spots still have placeholder text in [brackets]. Fill them in through the editor:

- **Donate page:** pickup details for when pickups resume (pickups are switched to "paused" for now)
- **Store emails:** the old site mixes hello@hiddentreasuresmn.org, info@hiddentreasuresmn.org and hello@htmn.org. The new site uses hello@ everywhere, so confirm that's the right inbox. If htmn.org is also the store's domain, add it in Vercel so it redirects to the site, but keep the `htmn.org/loyalty` link working.
- **Store info and hours:** Instagram and Facebook links. The icons only appear once these are filled in.
- **Stories:** add 2 or 3 first-person stories. The section stays hidden until there is at least one.
- **News and events:** add the Christmas Market video link, and the real flyer image if you want it

---

## Seasonal content to keep up to date

- **Color tag sale:** under **Color tag sale**, add each week's tag color and discount. The site shows only the current week, in Minneapolis time.
- **The Trove:** under **The Trove**, set whether it's open, the current pop-up, and its dates.
- **November calendar:** the old site's November calendar is now individual posts under **News and events**, one per sale, closure and event. Add next month's posts the same way, instead of uploading a calendar image.

## Quick guide for staff (in the editor)

| I want to... | Go to |
|---|---|
| Post an event, sale or news update | **News and events → +**. Fill in the title, type, date and summary. Add a photo or flyer and a YouTube or Vimeo link if you have them. Tick **Feature on the homepage** to make it the big card. |
| Show or hide the red bar at the top | **Announcement bar** → tick or untick **Show the bar**, then edit the message |
| Change hours or the phone number | **Store info and hours** |
| Change the homepage slideshow | **Homepage → Slideshow**. Add, remove or reorder slides and swap the photos. |
| Add a story | **Stories → +** |

Click **Save** after each change. The live site updates in about a minute.

Past events drop off the homepage "Coming up" list automatically, so there's no need to delete them.

---

## Design notes

- **Colors:** Brick Red `#a33749` is the main action color. The others are Campfire Orange `#c45d3b`, Wave Blue `#a6ccdd`, Windsor Toffee `#cdb68c`, Dark Brown Gray `#231f1b` and Dark Gray `#3e3534`. All are set in `src/styles/global.css`.
- **Fonts:** Young Serif for headings stands in for ITC Bookman Std Bold, which needs a paid web license. If the ministry buys one, add the font files and change `--serif` in `global.css`. Courier Prime and Open Sans are used as the brand guide specifies.
- **Motion:** slideshow fades, scroll-in reveals and hover lifts. All of it switches off for visitors who have "reduce motion" turned on.
